# Worker de IA — Generador de mensajes

Este Cloudflare Worker es un **proxy** entre el portal (front) y la API de
Anthropic. Existe por una sola razón: **la API key nunca puede estar en el
front**. El navegador le pega al Worker, y el Worker le pega a Anthropic usando
la key guardada como *secret*.

## Requisitos

- Node.js instalado.
- Wrangler (CLI de Cloudflare): `npm install -g wrangler`
- Una cuenta de Cloudflare (el plan gratis alcanza).
- Una API key de Anthropic (https://console.anthropic.com/).

## Pasos para deployar (copiá y pegá)

Parado en la carpeta `worker/`:

```bash
# 1. Iniciá sesión en Cloudflare (abre el navegador)
wrangler login

# 2. Cargá la API key como SECRET (te la pide por consola; no queda en el repo)
wrangler secret put ANTHROPIC_API_KEY

# 3. (Opcional) revisá wrangler.toml y ajustá:
#    - ALLOWED_ORIGIN: el origin exacto de tu GitHub Pages
#    - MODEL: el modelo de Anthropic al que tengas acceso

# 4. Deploy
wrangler deploy
```

Al terminar, `wrangler deploy` te muestra la URL del Worker, algo como:

```
https://portal-ventas-ia.TU-SUBDOMINIO.workers.dev
```

## Dónde pegar la URL

Copiá esa URL y pegala en **`js/config.js`**, en el campo:

```js
aiWorkerUrl: "https://portal-ventas-ia.TU-SUBDOMINIO.workers.dev",
```

Con eso el generador de `generador.html` empieza a funcionar. Si el campo queda
vacío, el generador degrada con elegancia: muestra un aviso de "IA no
configurada" y manda a las plantillas manuales.

## Variables importantes (en `wrangler.toml`)

| Variable         | Qué es                                                        |
|------------------|---------------------------------------------------------------|
| `ALLOWED_ORIGIN` | Origin de tu GitHub Pages. El Worker solo acepta pedidos desde ahí (CORS). No uses `*`. |
| `MODEL`          | Modelo de Anthropic. Default `claude-sonnet-5`. El prompt original pedía `claude-sonnet-4-6` (puede no existir). |

## Seguridad y límites

- **La key va como secret**, nunca en `wrangler.toml` ni en el repo.
- **CORS restringido** al dominio de Pages (variable `ALLOWED_ORIGIN`).
- **Rate limit** simple por IP (12 pedidos/minuto). Es en memoria del isolate:
  frena abuso básico, no es un límite distribuido. Para algo serio usá KV o
  Durable Objects.
- **Solo POST**; valida el body y rechaza payloads grandes (> 4 KB).

## Probar rápido

```bash
curl -X POST https://portal-ventas-ia.TU-SUBDOMINIO.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://vigolomarketing-tech.github.io" \
  -d '{"negocio":"Cabañas Los Nogales","rubro":"Cabañas","ciudad":"Villa General Belgrano","canal":"Instagram DM","objetivo":"primer contacto","tono":"cercano","observacion":"4.7 con 320 reseñas, bio sin link"}'
```

Debería devolver `{"contenido":"{...json...}"}`.
