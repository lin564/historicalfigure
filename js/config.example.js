// config.example.js - Template for config.js.
//
// SETUP:
//   1. Copy this file to js/config.js   (cp js/config.example.js js/config.js)
//   2. Fill in your OWN API keys below.
//   3. js/config.js is gitignored, so your keys are never committed.
//
// Get your own keys (do NOT reuse anyone else's — they will leak in client-side code):
//   - Claude / Anthropic:  https://console.anthropic.com  (set a monthly spend limit!)
//   - ElevenLabs:          https://elevenlabs.io  (Profile -> API Keys)
//
// SECURITY NOTE: This is a client-side app, so any key placed here is visible to
// anyone who opens the site. For production, keep the keys ONLY inside your
// Cloudflare Worker as Worker secrets and have the browser call the Worker
// without sending a key. See README.md.
const config = {
  apiKey: 'YOUR_ANTHROPIC_API_KEY_HERE',
  aiProvider: 'anthropic',
  elevenLabsApiKey: 'YOUR_ELEVENLABS_API_KEY_HERE'
};

// Google OAuth Client ID for Classroom Mode (public client ID, not a secret).
// Create one at https://console.cloud.google.com/apis/credentials
const GOOGLE_OAUTH_CLIENT_ID = 'YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE';
