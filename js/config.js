/* ============================================================================
   CONFIG — Objeto único de configuración del portal de ventas
   ----------------------------------------------------------------------------
   TODO dato de negocio vive acá. Ningún texto de negocio va hardcodeado en el
   HTML. Si querés cambiar precios, comisión, contacto o nichos, editás ESTE
   archivo y se actualiza en todo el sitio.

   Cómo se usa: cada página incluye <script src="js/config.js"></script> antes
   de app.js. Los helpers de app.js leen window.CONFIG y "pintan" los valores
   en los elementos que tengan data-config="...".
   ========================================================================== */

const CONFIG = {
  /* --- Datos de la agencia -------------------------------------------- */
  agencia: {
    nombre: "Vigolo Web Studio",
    pais: "Argentina",
    // Contacto interno para dudas y para pasar clientes / cerrar ventas.
    contactoWhatsapp: "5491128074105",                     // número para wa.me (sin +, sin espacios)
    contactoWhatsappLink: "https://wa.me/5491128074105",   // link directo de WhatsApp
    contactoWhatsappVisible: "11 2807-4105",               // cómo se muestra en pantalla
    contactoMail: "vigolomarketing@gmail.com",             // mail de contacto
  },

  /* --- Comisión ------------------------------------------------------- */
  // 0.30 = 30% del precio final COBRADO de cada página vendida.
  // Cambiá este número y se recalcula en toda la web (home, calculadora, etc).
  comision: 0.30,

  // ¿La comisión aplica también al mantenimiento mensual? true / false.
  comisionAplicaMantenimiento: false, // <<< DEFINIR SI APLICA

  /* --- Precios de referencia (editables) ------------------------------
     Todos en USD. Estos son "de referencia": el precio final lo defino yo,
     pero sirven para prospectar y para la calculadora. */
  precios: {
    landing:        { nombre: "Landing page",                     valor: 250, unidad: "USD" },
    institucional:  { nombre: "Web institucional (4–6 secciones)", valor: 450, unidad: "USD" },
    ecommerce:      { nombre: "E-commerce / catálogo con carrito", valor: 800, unidad: "USD" },
    mantenimiento:  { nombre: "Mantenimiento mensual",             valor: 30,  unidad: "USD/mes" },
  },

  /* --- Reglas de pago y atribución (texto editable) ------------------- */
  reglas: {
    // Cuándo se paga la comisión al vendedor.
    cuandoSePaga: "50% cuando el cliente paga la seña (50% del proyecto), y el otro 50% cuando paga el saldo final.", // <<< AJUSTAR SI QUERÉS
    // Base de cálculo de la comisión.
    baseComision: "Sobre el precio final efectivamente COBRADO al cliente, no sobre el presupuestado.",
    // Regla de atribución de leads.
    atribucion: "El lead es de quien lo carga primero en el pipeline y lo reporta. Si el cliente ya estaba en cartera de la agencia, no cuenta.",
    // Seña estándar para cerrar.
    sena: 0.50, // 50% de seña para arrancar el proyecto.
  },

  /* --- Canales de prospección ----------------------------------------- */
  canales: [
    { id: "instagram", nombre: "Instagram DM" },
    { id: "whatsapp",  nombre: "WhatsApp" },
    { id: "mail",      nombre: "Mail" },
    { id: "llamada",   nombre: "Llamada en frío" },
  ],

  /* --- Objetivos de mensaje (para el armador de prompts) -------------- */
  objetivos: [
    { id: "primer_contacto", nombre: "Primer contacto" },
    { id: "seguimiento",     nombre: "Seguimiento" },
    { id: "presupuesto",     nombre: "Mandar presupuesto" },
    { id: "reactivar",       nombre: "Reactivar un 'después te aviso'" },
  ],

  /* --- Tonos (para el armador de prompts) ----------------------------- */
  tonos: [
    { id: "cercano",      nombre: "Cercano" },
    { id: "profesional",  nombre: "Profesional" },
    { id: "breve",        nombre: "Breve" },
  ],

  /* --- Estados del pipeline (CRM local) ------------------------------- */
  estadosPipeline: [
    "Nuevo",
    "Contactado",
    "Respondió",
    "Reunión",
    "Presupuesto",
    "Cerrado",
    "Perdido",
  ],

  /* --- Criterio de calificación de prospectos ------------------------- */
  calificacion: {
    ratingMinimo: 4.3,
    reseñasMinimas: 15,
    // Cosas que NO cuentan como "web propia":
    noCuentanComoWeb: ["business.site", "un link a Facebook", "un link a Instagram", "un Linktree"],
  },

  /* --- Asistentes de IA (armador de prompts) --------------------------
     El armador de prompts NO llama a ninguna API: arma el texto del pedido
     y vos lo pegás en cualquiera de estos asistentes. Estos son los links
     que abren los botones. Editá el orden o agregá el que uses. */
  iaLinks: [
    { id: "chatgpt", nombre: "ChatGPT", url: "https://chatgpt.com/",         emoji: "🟢" },
    { id: "gemini",  nombre: "Gemini",  url: "https://gemini.google.com/app", emoji: "🔵" },
    { id: "claude",  nombre: "Claude",  url: "https://claude.ai/new",          emoji: "🟠" },
  ],

  /* --- Gate de acceso -------------------------------------------------
     OJO: esto NO es seguridad real. El código viaja al navegador y cualquiera
     con ganas lo puede ver. Solo evita que un curioso entre sin querer. Para
     seguridad de verdad haría falta un backend con login. */
  acceso: {
    activo: true,
    codigo: "vigolo2026", // <<< CAMBIAR CUANDO QUIERAS
  },

  /* --- Links internos -------------------------------------------------- */
  links: {
    // Podés dejar acá links a un drive de recursos, un formulario, etc.
    recursos: "", // <<< OPCIONAL
  },
};

// Exponer global para que lo lean el resto de los scripts (front sin módulos).
window.CONFIG = CONFIG;
