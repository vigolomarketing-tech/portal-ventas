/* ============================================================================
   app.js — Núcleo compartido de todas las páginas
   ----------------------------------------------------------------------------
   Responsabilidades:
   1) Gate de acceso (código guardado en CONFIG). NO es seguridad real.
   2) Marcar el link activo en la nav.
   3) "Pintar" los valores de CONFIG en el HTML (data-config, data-precio, etc).
   4) Botón de copiar al portapapeles con feedback visual.
   5) Helpers de formato reutilizables (dinero, comisión).
   Depende de que js/config.js se cargue ANTES que este archivo.
   ========================================================================== */

/* ------------------------------------------------------------------ */
/* Helpers de formato                                                  */
/* ------------------------------------------------------------------ */

// Devuelve el precio de un producto de CONFIG.precios como número.
function precioDe(clave) {
  const p = CONFIG.precios[clave];
  return p ? p.valor : 0;
}

// Formatea un monto en USD de forma corta y clara (ej: "USD 250").
function fmtUSD(monto) {
  const n = Math.round(Number(monto) || 0);
  return "USD " + n.toLocaleString("es-AR");
}

// Comisión (número) sobre un precio dado, usando CONFIG.comision.
function comisionSobre(precio) {
  return Math.round((Number(precio) || 0) * CONFIG.comision);
}

// Porcentaje de comisión legible (ej: "30%").
function comisionPct() {
  return Math.round(CONFIG.comision * 100) + "%";
}

/* ------------------------------------------------------------------ */
/* Cargador de datos (nichos / objeciones)                             */
/* ------------------------------------------------------------------ */
/* Los datos viven en /data/*.json (fuente editable). Pero abrir el
   sitio con doble clic (file://) bloquea fetch por CORS. Por eso cada
   página incluye también un espejo /data/*.js que setea un global
   (window.NICHOS, window.OBJECIONES). El loader prefiere el global si
   está presente (funciona offline) y si no, cae al fetch del JSON.
   Nunca tira un error sin capturar: si falla todo, devuelve null y el
   caller muestra un aviso amable. */
async function cargarJSON(path, globalName) {
  if (globalName && Array.isArray(window[globalName])) return window[globalName];
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 1) GATE DE ACCESO                                                   */
/* ------------------------------------------------------------------ */
/* IMPORTANTE: esto NO es seguridad. El código está en el navegador y
   cualquiera puede leerlo. Solo evita que un curioso entre sin querer.
   Para seguridad real haría falta un backend con login. */

const CLAVE_SESION_ACCESO = "vigolo_acceso_ok";

function iniciarGate() {
  if (!CONFIG.acceso.activo) return;                 // gate desactivado en CONFIG
  if (sessionStorage.getItem(CLAVE_SESION_ACCESO)) return; // ya pasó en esta sesión

  document.body.classList.add("bloqueado");

  const gate = document.createElement("div");
  gate.className = "gate";
  gate.innerHTML = `
    <form class="gate-card" id="gate-form">
      <div class="brand-logo">V</div>
      <h2 class="mt-0">Acceso del equipo</h2>
      <p class="ayuda">Portal interno de ${CONFIG.agencia.nombre}. Ingresá el código.</p>
      <div class="campo">
        <input type="password" id="gate-input" placeholder="Código de acceso"
               autocomplete="off" aria-label="Código de acceso" />
      </div>
      <button type="submit" class="btn btn-primario btn-block">Entrar</button>
      <div class="gate-error" id="gate-error" role="alert"></div>
    </form>`;
  document.body.appendChild(gate);

  const form = gate.querySelector("#gate-form");
  const input = gate.querySelector("#gate-input");
  const error = gate.querySelector("#gate-error");
  input.focus();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim() === CONFIG.acceso.codigo) {
      sessionStorage.setItem(CLAVE_SESION_ACCESO, "1");
      gate.remove();
      document.body.classList.remove("bloqueado");
    } else {
      error.textContent = "Código incorrecto. Probá de nuevo.";
      input.value = "";
      input.focus();
    }
  });
}

/* ------------------------------------------------------------------ */
/* 2) NAV: marcar link activo                                          */
/* ------------------------------------------------------------------ */
function marcarNavActiva() {
  const actual = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === actual || (actual === "" && href === "index.html")) {
      a.classList.add("activo");
      a.setAttribute("aria-current", "page");
    }
  });
}

/* ------------------------------------------------------------------ */
/* 3) PINTAR CONFIG EN EL HTML                                         */
/* ------------------------------------------------------------------ */
/* Soporta:
   - data-config="agencia.nombre"     → texto desde una ruta de CONFIG
   - data-config-href="agencia.contactoWhatsappLink" → atributo href
   - data-precio="landing"            → precio formateado (USD 250)
   - data-comision-de="ecommerce"     → comisión sobre ese producto
   - data-comision-pct                → "30%"
*/

// Lee una ruta tipo "agencia.nombre" dentro de CONFIG.
function leerRuta(obj, ruta) {
  return ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function pintarConfig() {
  // Texto directo
  document.querySelectorAll("[data-config]").forEach((el) => {
    const val = leerRuta(CONFIG, el.getAttribute("data-config"));
    if (val != null) el.textContent = val;
  });

  // Atributo href
  document.querySelectorAll("[data-config-href]").forEach((el) => {
    const val = leerRuta(CONFIG, el.getAttribute("data-config-href"));
    if (val != null) el.setAttribute("href", val);
  });

  // Precio formateado
  document.querySelectorAll("[data-precio]").forEach((el) => {
    el.textContent = fmtUSD(precioDe(el.getAttribute("data-precio")));
  });

  // Comisión sobre un producto
  document.querySelectorAll("[data-comision-de]").forEach((el) => {
    el.textContent = fmtUSD(comisionSobre(precioDe(el.getAttribute("data-comision-de"))));
  });

  // Porcentaje de comisión
  document.querySelectorAll("[data-comision-pct]").forEach((el) => {
    el.textContent = comisionPct();
  });
}

/* ------------------------------------------------------------------ */
/* 4) COPIAR AL PORTAPAPELES                                           */
/* ------------------------------------------------------------------ */
async function copiarTexto(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (_) {
    // Fallback para contextos sin permiso de clipboard (ej: file:// en algún navegador)
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  if (boton) {
    const original = boton.textContent;
    boton.textContent = "¡Copiado!";
    boton.classList.add("ok");
    setTimeout(() => {
      boton.textContent = original;
      boton.classList.remove("ok");
    }, 1500);
  }
}

// Delegación: cualquier .btn-copiar copia el texto de su bloque .copiable
// (o el texto de un selector indicado en data-copiar-target).
function wireCopiar() {
  document.addEventListener("click", (e) => {
    const boton = e.target.closest(".btn-copiar");
    if (!boton) return;

    let texto = "";
    const targetSel = boton.getAttribute("data-copiar-target");
    if (targetSel) {
      const t = document.querySelector(targetSel);
      texto = t ? (t.value !== undefined && t.tagName === "TEXTAREA" ? t.value : t.textContent) : "";
    } else {
      const bloque = boton.closest(".copiable");
      // Copiamos solo el cuerpo, no el texto del botón.
      texto = bloque ? bloque.getAttribute("data-texto") || textoDeBloque(bloque) : "";
    }
    copiarTexto(texto.trim(), boton);
  });
}

// Extrae el texto de un .copiable ignorando el botón.
function textoDeBloque(bloque) {
  const clon = bloque.cloneNode(true);
  clon.querySelectorAll(".btn-copiar, .copiable-titulo, .copiable-angulo").forEach((n) => n.remove());
  return clon.textContent;
}

/* Helper para construir un bloque copiable desde JS (lo usan varias páginas). */
function bloqueCopiable({ titulo = "", angulo = "", texto = "" }) {
  const wrap = document.createElement("div");
  wrap.className = "copiable";
  wrap.setAttribute("data-texto", texto);
  wrap.innerHTML = `
    ${titulo ? `<div class="copiable-titulo">${escapar(titulo)}</div>` : ""}
    ${angulo ? `<p class="copiable-angulo">${escapar(angulo)}</p>` : ""}
    <button class="btn-copiar" type="button" aria-label="Copiar texto">Copiar</button>
    <span class="cuerpo">${escapar(texto)}</span>`;
  return wrap;
}

// Escapa HTML para insertar texto de forma segura.
function escapar(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

/* ------------------------------------------------------------------ */
/* 5) FOOTER: inyectar contacto interno                                */
/* ------------------------------------------------------------------ */
function pintarFooter() {
  const conts = document.querySelectorAll("[data-footer-contacto]");
  if (!conts.length) return;
  const a = CONFIG.agencia;
  const wsp = a.contactoWhatsappVisible || "WhatsApp";
  const html =
    `¿Dudas o cerrar una venta? Escribime: ` +
    `<a href="${escapar(a.contactoWhatsappLink)}">WhatsApp ${escapar(wsp)}</a> · ` +
    `<a href="mailto:${escapar(a.contactoMail)}">${escapar(a.contactoMail)}</a>`;
  conts.forEach((c) => { c.innerHTML = html; });
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  iniciarGate();
  marcarNavActiva();
  pintarConfig();
  pintarFooter();
  wireCopiar();
});
