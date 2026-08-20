# Portal de ventas — Vigolo Web Studio

Sitio web **interno** de capacitación y herramientas para el equipo de ventas.
No es para clientes: es para que quien vende webs de la agencia tenga todo en un
solo lugar y pueda arrancar el mismo día.

> **Interno de verdad:** todas las páginas llevan `noindex` y el sitio arranca
> con una pantalla de código de acceso. **Ojo: eso NO es seguridad real** — el
> código viaja al navegador y cualquiera con ganas lo puede ver. Solo evita que
> un curioso entre sin querer. Para seguridad de verdad haría falta un backend
> con login.

## Qué incluye

| Página              | Para qué sirve                                             |
|---------------------|-----------------------------------------------------------|
| `index.html`        | Arranque rápido: qué vendemos, el trato (30%) y la ruta de 5 pasos. |
| `formacion.html`    | Cómo vender, en 7 módulos con "qué hacer / qué no hacer".  |
| `prospeccion.html`  | De dónde salen los clientes, criterios y 12 nichos.        |
| `generador.html`    | Generador de mensajes con IA (usa el Worker de Cloudflare).|
| `herramientas.html` | Calculadora de comisión, plantillas, objeciones y checklists. |
| `pipeline.html`     | CRM mínimo de prospectos (se guarda en el navegador).      |
| `reglas.html`       | Comisiones, pagos, atribución de leads y FAQ.              |

## Cómo se usa

- **Abrir en la compu:** doble clic en `index.html`. Funciona sin servidor.
- **En el celular:** entrá a la URL de GitHub Pages (ver más abajo).
- **Código de acceso:** se pide al entrar. Está en `js/config.js` (`acceso.codigo`).

## Cómo se edita el contenido

**Casi todo se cambia en un solo archivo: [`js/config.js`](js/config.js).**
Ahí viven la comisión, los precios, el contacto interno, el código de acceso,
la URL del Worker de IA, etc. Ningún dato de negocio está escrito "a mano" en
el HTML: las páginas leen `CONFIG` y lo pintan solas.

Ejemplos:
- Cambiar la comisión: editá `comision: 0.30` → `0.35` y se actualiza en toda la web.
- Cambiar un precio: editá `CONFIG.precios.landing.valor` y cambia en la home, la calculadora y los ejemplos.
- Cambiar el contacto: editá `CONFIG.agencia.contactoWhatsappLink` y `contactoMail`.

### Nichos y objeciones

- Los **nichos** están en [`data/nichos.json`](data/nichos.json).
- Las **objeciones** están en [`data/objeciones.json`](data/objeciones.json).

Estos JSON son la **fuente de verdad**. Como abrir el sitio con doble clic
(`file://`) bloquea la carga por `fetch`, cada uno tiene un **espejo `.js`**
(`data/nichos.js` y `data/objeciones.js`) que permite verlos sin servidor.

> **Si editás un `.json`, regenerá su espejo `.js`.** El `.js` es simplemente
> `window.NICHOS = <contenido del json>;`. Podés regenerarlo a mano o con:
> ```bash
> { echo 'window.NICHOS ='; cat data/nichos.json; echo ';'; } > data/nichos.js
> { echo 'window.OBJECIONES ='; cat data/objeciones.json; echo ';'; } > data/objeciones.js
> ```
> (Servido desde GitHub Pages, el `fetch` del `.json` funciona igual; el espejo
> es solo para el modo doble-clic.)

## Stack

HTML + CSS + JS **vanilla**. Sin frameworks, sin bundler, sin npm en el front.
Todo el color/tipografía/espaciado sale de variables CSS en `:root`
([`css/styles.css`](css/styles.css)). Diseño **mobile-first**.

## Deploy en GitHub Pages

El sitio se sirve **desde la raíz de `main`, sin build**.

1. En GitHub: **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** `main` · carpeta **`/ (root)`** → *Save*.
4. Esperá un minuto. La URL queda como:
   `https://vigolomarketing-tech.github.io/portal-ventas/`

> El archivo `.nojekyll` (vacío) ya está incluido para que Pages sirva los
> archivos tal cual, sin procesarlos con Jekyll.

## Deploy del Worker de IA

El generador de mensajes usa un Cloudflare Worker que hace de proxy a Anthropic
(así la API key no queda en el front). Instrucciones completas en
[`worker/README.md`](worker/README.md). Resumen:

```bash
cd worker
wrangler login
wrangler secret put ANTHROPIC_API_KEY   # pegás tu key de Anthropic
wrangler deploy                          # te devuelve la URL del Worker
```

Después pegás esa URL en `js/config.js` → `aiWorkerUrl`. Si lo dejás vacío, el
generador avisa que "la IA no está configurada" y ofrece las plantillas manuales.

## Valores de CONFIG que hay que completar

Buscá los comentarios `<<< COMPLETAR >>>` en `js/config.js`:

- `agencia.contactoWhatsapp` / `contactoWhatsappLink` / `contactoMail`
- `aiWorkerUrl` (después de deployar el Worker)
- `acceso.codigo` (cambiá el código de acceso cuando quieras)
- Revisá `comisionAplicaMantenimiento` y `reglas.cuandoSePaga`.
