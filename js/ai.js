/* ============================================================================
   ai.js — Cliente del Cloudflare Worker (generador de mensajes con IA)
   ----------------------------------------------------------------------------
   La API key de Anthropic NUNCA está acá: vive solo en el Worker. Este archivo
   arma el pedido, llama al Worker (CONFIG.aiWorkerUrl) y devuelve el JSON ya
   parseado y validado.
   ========================================================================== */

/* ¿Está configurada la IA? (hay URL de Worker) */
function iaConfigurada() {
  return typeof CONFIG.aiWorkerUrl === "string" && CONFIG.aiWorkerUrl.trim() !== "";
}

/* Limpia posibles fences de markdown (```json ... ```) antes de parsear.
   El prompt del Worker pide JSON puro, pero por las dudas lo blindamos. */
function limpiarJSON(texto) {
  let t = (texto || "").trim();
  // Saca ```json / ``` del principio y ``` del final si aparecen.
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Si viene texto antes/después, nos quedamos con el primer objeto {...}.
  const primer = t.indexOf("{");
  const ultimo = t.lastIndexOf("}");
  if (primer !== -1 && ultimo !== -1 && ultimo > primer) {
    t = t.slice(primer, ultimo + 1);
  }
  return t;
}

/* Valida que la respuesta tenga la forma esperada. Devuelve un objeto
   normalizado o lanza un error con mensaje claro. */
function validarRespuesta(obj) {
  if (!obj || typeof obj !== "object") throw new Error("La IA devolvió algo que no pude leer.");
  const variantes = Array.isArray(obj.variantes) ? obj.variantes : [];
  const objeciones = Array.isArray(obj.objeciones) ? obj.objeciones : [];
  if (variantes.length === 0) throw new Error("La IA no devolvió variantes de mensaje.");
  return {
    variantes: variantes.map((v) => ({
      angulo: String(v.angulo || "").trim(),
      mensaje: String(v.mensaje || "").trim(),
    })),
    seguimiento: String(obj.seguimiento || "").trim(),
    objeciones: objeciones.map((o) => ({
      objecion: String(o.objecion || "").trim(),
      respuesta: String(o.respuesta || "").trim(),
    })),
  };
}

/* Llama al Worker con los datos del formulario.
   Devuelve el objeto normalizado o lanza Error (lo captura la página). */
async function generarMensajes(datos) {
  if (!iaConfigurada()) {
    const e = new Error("IA no configurada");
    e.codigo = "SIN_WORKER";
    throw e;
  }

  let resp;
  try {
    resp = await fetch(CONFIG.aiWorkerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
  } catch (e) {
    const err = new Error("No pude conectar con el servicio de IA. Revisá tu conexión y volvé a probar.");
    err.codigo = "RED";
    throw err;
  }

  if (!resp.ok) {
    let detalle = "";
    try { detalle = (await resp.json()).error || ""; } catch (_) {}
    if (resp.status === 429) {
      throw new Error("Estás yendo muy rápido. Esperá unos segundos y probá de nuevo.");
    }
    throw new Error("El servicio de IA respondió con un error" + (detalle ? `: ${detalle}` : ` (código ${resp.status}).`));
  }

  const bruto = await resp.text();
  let parseado;
  try {
    parseado = JSON.parse(limpiarJSON(bruto));
    // El Worker puede envolver la respuesta del modelo. Soportamos ambas formas.
    if (parseado && parseado.contenido) parseado = JSON.parse(limpiarJSON(parseado.contenido));
  } catch (e) {
    throw new Error("La IA devolvió una respuesta con formato inesperado. Probá de nuevo.");
  }
  return validarRespuesta(parseado);
}
