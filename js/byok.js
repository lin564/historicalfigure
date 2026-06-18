// byok.js — "Bring Your Own Key"
//
// Lets each user supply their OWN Claude + ElevenLabs API keys. Keys are stored
// only in this browser's localStorage and are sent directly to Anthropic /
// ElevenLabs — never to any server we control, and never committed to the repo.
// This is what makes the app work on static hosting (e.g. GitHub Pages) with no
// backend and no Cloudflare.
//
// This file MUST load after config.js and before app.js (see index.html), so the
// saved key is in `config` before app.js builds elevenLabsConfig from it.

(function () {
  const ANTHROPIC_KEY = 'byok_anthropic_key';
  const ELEVENLABS_KEY = 'byok_elevenlabs_key';

  // 1) Load any saved keys into config before app.js reads them.
  try {
    const savedClaude = localStorage.getItem(ANTHROPIC_KEY);
    const savedEleven = localStorage.getItem(ELEVENLABS_KEY);
    if (typeof config !== 'undefined') {
      if (savedClaude) config.apiKey = savedClaude;
      if (savedEleven) config.elevenLabsApiKey = savedEleven;
    }
  } catch (e) {
    console.warn('BYOK: could not read saved keys', e);
  }

  function claudeKeyIsSet() {
    const c = localStorage.getItem(ANTHROPIC_KEY);
    return !!(c && c.trim());
  }

  function saveKeys(claudeKey, elevenKey) {
    const c = (claudeKey || '').trim();
    const e = (elevenKey || '').trim();
    localStorage.setItem(ANTHROPIC_KEY, c);
    localStorage.setItem(ELEVENLABS_KEY, e);
    // Update the live config objects so no page reload is needed.
    if (typeof config !== 'undefined') {
      config.apiKey = c;
      config.elevenLabsApiKey = e;
    }
    if (typeof elevenLabsConfig !== 'undefined') {
      elevenLabsConfig.apiKey = e;
    }
  }

  // 2) Build a small settings panel once the DOM is ready.
  function buildUI() {
    const btn = document.createElement('button');
    btn.id = 'byok-button';
    btn.type = 'button';
    btn.textContent = '🔑 API Keys';
    btn.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:9999;padding:8px 12px;' +
      'border:none;border-radius:8px;background:#5b4ec7;color:#fff;' +
      'font:14px sans-serif;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.25);';

    const overlay = document.createElement('div');
    overlay.id = 'byok-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:10000;display:none;align-items:center;' +
      'justify-content:center;background:rgba(0,0,0,.5);';
    overlay.innerHTML =
      '<div style="background:#fff;color:#222;max-width:460px;width:90%;padding:24px;' +
      'border-radius:12px;font:14px/1.5 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3);">' +
      '<h2 style="margin:0 0 8px;font-size:18px;">Your API Keys</h2>' +
      '<p style="margin:0 0 16px;color:#555;">Keys are stored only in this browser and sent ' +
      'directly to Anthropic / ElevenLabs — never uploaded to a server we run. Get your own at ' +
      '<a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> and ' +
      '<a href="https://elevenlabs.io" target="_blank" rel="noopener">elevenlabs.io</a>. ' +
      'Set a monthly spend limit on the Anthropic key.</p>' +
      '<label style="display:block;margin-bottom:4px;font-weight:600;">Claude (Anthropic) API key</label>' +
      '<input id="byok-claude" type="password" placeholder="sk-ant-..." autocomplete="off" ' +
      'style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:14px;border:1px solid #ccc;border-radius:6px;">' +
      '<label style="display:block;margin-bottom:4px;font-weight:600;">ElevenLabs API key (optional, for voice)</label>' +
      '<input id="byok-eleven" type="password" placeholder="sk_..." autocomplete="off" ' +
      'style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:18px;border:1px solid #ccc;border-radius:6px;">' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button id="byok-cancel" type="button" style="padding:8px 14px;border:1px solid #ccc;border-radius:6px;background:#f3f3f3;cursor:pointer;">Cancel</button>' +
      '<button id="byok-save" type="button" style="padding:8px 14px;border:none;border-radius:6px;background:#5b4ec7;color:#fff;cursor:pointer;">Save</button>' +
      '</div></div>';

    document.body.appendChild(btn);
    document.body.appendChild(overlay);

    const claudeInput = overlay.querySelector('#byok-claude');
    const elevenInput = overlay.querySelector('#byok-eleven');

    function openModal() {
      claudeInput.value = localStorage.getItem(ANTHROPIC_KEY) || '';
      elevenInput.value = localStorage.getItem(ELEVENLABS_KEY) || '';
      overlay.style.display = 'flex';
    }
    function closeModal() {
      overlay.style.display = 'none';
    }

    btn.addEventListener('click', openModal);
    overlay.querySelector('#byok-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('#byok-save').addEventListener('click', function () {
      saveKeys(claudeInput.value, elevenInput.value);
      closeModal();
    });

    // First-run: if no Claude key is set yet, open the panel so the user knows.
    if (!claudeKeyIsSet()) openModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
