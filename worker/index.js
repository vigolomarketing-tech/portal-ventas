/* ============================================================================
   Cloudflare Worker — Proxy de IA para el generador de mensajes
   ----------------------------------------------------------------------------
   Este Worker es el ÚNICO lugar donde vive la API key de Anthropic. El front
   nunca la ve. El navegador le pega a este Worker; el Worker le pega a la API
   de Anthropic con la key guardada como secret.

   Hace:
   - Solo acepta POST (responde OPTIONS para CORS).
   - CORS restringido al dominio de GitHub Pages (variable ALLOWED_ORIGIN).
   - Valida el body (rechaza payloads gigantes y campos faltantes).
   - Rate limit simple por IP (en memoria; ver nota más abajo).
   - Arma el prompt del sistema y pide JSON puro.
   - Devuelve errores claros en JSON.
   ============================================================================ */

/* --- Rate limit muy simple, en memoria del isolate ---------------------------
   NO es un rate limit distribuido de verdad (cada isolate tiene su propio Map
   y se reinicia). Alcanza para frenar abuso básico. Para algo serio usarías
   Durable Objects o KV. */
const HITS = new Map(); // ip -> [timestamps]
const VENTANA_MS = 60 * 1000; // 1 minuto
const MAX_POR_VENTANA = 12;   // 12 requests por IP por minuto

function rateLimited(ip) {
  const ahora = Date.now();
  const previos = (HITS.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  previos.push(ahora);
  HITS.set(ip, previos);
  return previos.length > MAX_POR_VENTANA;
}

/* --- Helpers de respuesta --------------------------------------------------- */
function corsHeaders(origin, allowed) {
  // Solo devolvemos el origen si coincide con el permitido (no usamos "*").
  const permitido = origin && origin === allowed ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": permitido,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/* --- Prompt del sistema ----------------------------------------------------- */
function systemPrompt() {
  return [
    "Sos un vendedor argentino experto en venta de sitios web a negocios locales.",
    "Escribís en español rioplatense natural, con voseo, cercano y directo, sin corporativismo.",
    "Tu tarea es redactar mensajes de prospección para el vendedor.",
    "",
    "Reglas de los mensajes:",
    "- Entre 3 y 5 líneas como MÁXIMO. Cortos.",
    "- NADA de fórmulas como 'espero que te encuentres bien' ni saludos de relleno.",
    "- Mencioná algo específico y verificable del negocio (usá lo que observó el vendedor).",
    "- Si el objetivo es primer contacto: NO incluyas precios NI links.",
    "- Terminá SIEMPRE en una sola pregunta fácil de responder.",
    "- Que suene a una persona real escribiendo, no a una plantilla.",
    "",
    "Devolvé SOLO JSON válido, sin markdown, sin backticks, sin texto antes ni después.",
    "Forma exacta del JSON:",
    '{"variantes":[{"angulo":"","mensaje":""}],"seguimiento":"","objeciones":[{"objecion":"","respuesta":""}]}',
    "- 'variantes': exactamente 3 objetos, cada uno con un 'angulo' (una línea que explica el enfoque) y el 'mensaje'.",
    "- 'seguimiento': un mensaje para mandar 3 días después si no responde.",
    "- 'objeciones': 2 objeciones probables de ese rubro, cada una con su 'respuesta' sugerida.",
  ].join("\n");
}

/* --- Prompt del usuario (con los datos del formulario) ---------------------- */
function userPrompt(d) {
  return [
    `Negocio: ${d.negocio || "(sin nombre)"}`,
    `Rubro: ${d.rubro || "(sin especificar)"}`,
    `Ciudad: ${d.ciudad || "(sin especificar)"}`,
    `Canal: ${d.canal || "(sin especificar)"}`,
    `Objetivo del mensaje: ${d.objetivo || "primer contacto"}`,
    `Tono pedido: ${d.tono || "cercano"}`,
    `Lo que observó el vendedor del negocio: ${d.observacion || "(no aportó observaciones)"}`,
    "",
    "Generá el JSON pedido.",
  ].join("\n");
}

/* --- Validación del body ---------------------------------------------------- */
const MAX_BODY_BYTES = 4000; // rechazamos payloads gigantes
function validarDatos(d) {
  if (!d || typeof d !== "object") return "El cuerpo no es un objeto JSON válido.";
  if (!d.negocio || String(d.negocio).trim() === "") return "Falta el nombre del negocio.";
  // Recortamos strings larguísimos por las dudas (defensa extra).
  for (const k of Object.keys(d)) {
    if (typeof d[k] === "string" && d[k].length > 800) d[k] = d[k].slice(0, 800);
  }
  return null; // ok
}

/* ============================================================================ */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "";
    const cors = corsHeaders(origin, allowed);

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Solo POST
    if (request.method !== "POST") {
      return json({ error: "Solo se acepta POST." }, 405, cors);
    }

    // Rate limit por IP
    const ip = request.headers.get("CF-Connecting-IP") || "desconocida";
    if (rateLimited(ip)) {
      return json({ error: "Demasiados pedidos. Esperá un minuto." }, 429, cors);
    }

    // Tamaño del body
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: "El pedido es demasiado grande." }, 413, cors);
    }

    // Parseo + validación
    let datos;
    try {
      datos = JSON.parse(raw);
    } catch (e) {
      return json({ error: "El cuerpo no es JSON válido." }, 400, cors);
    }
    const errValidacion = validarDatos(datos);
    if (errValidacion) {
      return json({ error: errValidacion }, 400, cors);
    }

    // Falta la key (mala configuración del Worker)
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "El Worker no tiene configurada la API key." }, 500, cors);
    }

    // Llamada a Anthropic
    const modelo = env.MODEL || "claude-sonnet-5";
    let apiResp;
    try {
      apiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelo,
          max_tokens: 1200,
          system: systemPrompt(),
          messages: [{ role: "user", content: userPrompt(datos) }],
        }),
      });
    } catch (e) {
      return json({ error: "No pude contactar al servicio de IA." }, 502, cors);
    }

    if (!apiResp.ok) {
      let detalle = "";
      try { detalle = (await apiResp.json())?.error?.message || ""; } catch (_) {}
      return json({ error: "La IA respondió con un error." + (detalle ? " " + detalle : "") }, 502, cors);
    }

    // Extraemos el texto del modelo y lo devolvemos como { contenido }.
    let contenido = "";
    try {
      const data = await apiResp.json();
      contenido = (data.content || []).map((b) => b.text || "").join("").trim();
    } catch (e) {
      return json({ error: "No pude leer la respuesta de la IA." }, 502, cors);
    }

    // Devolvemos el texto crudo del modelo; el front lo limpia y parsea.
    return json({ contenido }, 200, cors);
  },
};
