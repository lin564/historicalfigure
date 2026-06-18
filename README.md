# Historical Figure

An interactive web app for conversing with AI-voiced historical figures, with a
Classroom mode. It uses the Claude (Anthropic) API for text and the ElevenLabs
API for voice.

It runs as a pure static site — no backend, no build step. Each user supplies
their **own** API keys, which are stored only in their browser and sent directly
to Anthropic / ElevenLabs ("Bring Your Own Key"). This means it can be hosted for
free on GitHub Pages with no server and no shared API key.

## Running it

1. **Get your own API keys** (do not reuse anyone else's):
   - Claude / Anthropic: https://console.anthropic.com — **set a monthly spend limit.**
   - ElevenLabs (optional, for voice): https://elevenlabs.io → Profile → API Keys
2. **Open the app** — either the hosted GitHub Pages URL, or locally:
   ```sh
   python3 -m http.server 8000   # then visit http://localhost:8000
   ```
3. **Enter your keys.** On first visit the app pops up a key panel (or click the
   **🔑 API Keys** button in the bottom-right). Your keys are saved in this
   browser's localStorage only — nothing is uploaded and nothing is committed.

`js/config.js` is gitignored and now only holds placeholders + the Google
OAuth client ID for Classroom mode; you do **not** need to put API keys in it.

## Deploying on GitHub Pages

1. Push this repo to your own GitHub account (fork it, or create a new repo).
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, pick your branch and the root folder, save.
3. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.
4. Open it and enter your own keys via the 🔑 panel.

Because of the BYOK design, no API key is ever in the repository or the deployed
site — each visitor uses their own.

## Security — please read

This is a **client-side** app. Any key entered into the page is held in the
browser and sent directly to Anthropic / ElevenLabs; it is visible to that user
in their own DevTools. BYOK keeps you safe in the ways that matter for sharing:

- **No shared key.** Your keys are never in the code, the repo, or anyone else's
  copy. Each person pays for their own usage with their own key.
- **Never commit real keys.** Treat any key that ends up in client-side code or
  git history as compromised, and rotate it (revoke + regenerate) immediately —
  removing it from the code is not enough, because it stays in git history.
- **Always set a spend limit** on your Anthropic key (console → Limits). That cap
  is what stops a leaked or misused key from running up a large bill.

If you need a key that is *never* exposed to the browser at all (e.g. a single
shared key your users don't have), BYOK is not enough — you need a small backend
(a serverless function on Vercel/Netlify/Deno Deploy, or a Cloudflare Worker)
that holds the key as a server-side secret and proxies requests. That's a
different deployment than the GitHub Pages one above.

## Notes

- **Classroom mode** still talks to a separate hosted backend
  (`*.workers.dev`) and Google OAuth; it is not part of the BYOK static flow.
- The app currently calls older Claude models (`claude-3-haiku-20240307`,
  `claude-sonnet-4-20250514`) which are scheduled for retirement in 2026.
  Consider updating these to current models (`claude-haiku-4-5`,
  `claude-sonnet-4-6`) in `js/app.js`.
