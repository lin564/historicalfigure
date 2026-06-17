# Historical Figure

An interactive web app for conversing with AI-voiced historical figures, with a
Classroom mode. It uses the Claude (Anthropic) API for text and the ElevenLabs
API for voice.

## Setup

This is a static client-side app — no build step. To run it you just need your
own API keys and a local web server.

1. **Get your own API keys** (do not reuse anyone else's):
   - Claude / Anthropic: https://console.anthropic.com — **set a monthly spend limit.**
   - ElevenLabs: https://elevenlabs.io → Profile → API Keys
2. **Create your config file:**
   ```sh
   cp js/config.example.js js/config.js
   ```
   Then open `js/config.js` and paste in your keys.
   `js/config.js` is gitignored, so your keys are never committed.
3. **Serve the folder** (opening the HTML directly won't work for some features):
   ```sh
   python3 -m http.server 8000
   ```
   Then visit http://localhost:8000

## Security — please read

This is a **client-side** app. Anything in `js/config.js` is downloaded to the
browser and is visible to anyone who opens the site (via DevTools or the network
tab). **Never commit real API keys**, and treat any key that ends up in
client-side code or git history as compromised.

For anything beyond local experimentation, do **not** ship your keys in the
browser. Instead:

- Keep each API key **only** inside a Cloudflare Worker (or similar backend) as a
  **Worker secret** (`wrangler secret put`), set on the server side.
- Have the browser call your Worker **without** sending any key; the Worker adds
  the key and forwards the request to Anthropic / ElevenLabs.
- Restrict the Worker to your own origin and add basic rate limiting.

If a key is ever exposed, **rotate it immediately** (revoke the old one and
generate a new one) — removing it from the code is not enough, because it remains
in git history.
