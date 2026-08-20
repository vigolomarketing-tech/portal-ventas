/* ============================================================================
   pipeline.js — CRM mínimo en localStorage
   ----------------------------------------------------------------------------
   Guarda prospectos en el navegador (no hay backend). Lo usan dos páginas:
   - generador.html: solo la función guardarProspectoDesdeGenerador().
   - pipeline.html: alta, listado, edición de estado, métricas, export/import.
   Depende de config.js y app.js (usa comisionSobre, precioDe, fmtUSD, escapar).
   ========================================================================== */

const PIPELINE_KEY = "vigolo_pipeline_v1";

/* --- Persistencia -------------------------------------------------- */
function leerPipeline() {
  try {
    const raw = localStorage.getItem(PIPELINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function guardarPipeline(lista) {
  localStorage.setItem(PIPELINE_KEY, JSON.stringify(lista));
}
function nuevoId() {
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* --- Alta de prospecto --------------------------------------------- */
/* Campos: negocio, rubro, canal, contacto, estado, notas, proximoToque,
   producto (clave de CONFIG.precios para estimar la comisión). */
function agregarProspecto(datos) {
  const lista = leerPipeline();
  const p = {
    id: nuevoId(),
    negocio: (datos.negocio || "Sin nombre").trim(),
    rubro: (datos.rubro || "").trim(),
    canal: (datos.canal || "").trim(),
    contacto: (datos.contacto || "").trim(),
    estado: datos.estado || CONFIG.estadosPipeline[0], // "Nuevo"
    notas: (datos.notas || "").trim(),
    proximoToque: datos.proximoToque || "",
    producto: datos.producto || "institucional",
    creado: new Date().toISOString(),
  };
  lista.unshift(p);
  guardarPipeline(lista);
  return p;
}

/* Helper que usa el generador: guarda y avisa. Devuelve true si guardó. */
function guardarProspectoDesdeGenerador(datos) {
  agregarProspecto({ ...datos, estado: "Contactado" });
  return true;
}

/* --- Actualizar / borrar ------------------------------------------- */
function actualizarProspecto(id, cambios) {
  const lista = leerPipeline();
  const i = lista.findIndex((p) => p.id === id);
  if (i === -1) return;
  lista[i] = { ...lista[i], ...cambios };
  guardarPipeline(lista);
}
function borrarProspecto(id) {
  guardarPipeline(leerPipeline().filter((p) => p.id !== id));
}

/* --- Métricas de comisión ------------------------------------------ */
/* Ganada: prospectos en estado "Cerrado".
   Potencial: prospectos activos (ni Cerrado ni Perdido). */
function comisionDeProducto(clave) {
  return comisionSobre(precioDe(clave));
}
function calcularMetricas() {
  const lista = leerPipeline();
  let ganada = 0, potencial = 0, activos = 0, cerrados = 0;
  lista.forEach((p) => {
    const c = comisionDeProducto(p.producto);
    if (p.estado === "Cerrado") { ganada += c; cerrados++; }
    else if (p.estado !== "Perdido") { potencial += c; activos++; }
  });
  return { ganada, potencial, activos, cerrados, total: lista.length };
}

/* --- Export / Import ----------------------------------------------- */
function exportarPipeline() {
  const data = JSON.stringify(leerPipeline(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `pipeline-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importarPipeline(texto, { reemplazar = false } = {}) {
  let entrante;
  try {
    entrante = JSON.parse(texto);
  } catch (e) {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!Array.isArray(entrante)) throw new Error("El archivo no tiene el formato esperado (debería ser una lista).");
  const actual = reemplazar ? [] : leerPipeline();
  // Evitamos duplicar por id.
  const ids = new Set(actual.map((p) => p.id));
  entrante.forEach((p) => {
    if (!p.id || ids.has(p.id)) p.id = nuevoId();
    ids.add(p.id);
    actual.push(p);
  });
  guardarPipeline(actual);
  return actual.length;
}
