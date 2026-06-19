# Setup Guide — Historical Figure (for your own copy)

This guide walks you through putting your **own** copy of the Historical Figure
app online for free, using your **own** API keys. No coding required, and you
never touch anyone else's keys or account.

You'll do four things:

1. Get your own API keys (Claude, and optionally ElevenLabs for voice)
2. Put the app on your own GitHub account
3. Turn on free hosting (GitHub Pages)
4. Open the site and paste in your keys

Total time: about 15–20 minutes.

---

## Before you start

You'll need:

- A **GitHub account** — free, sign up at https://github.com/signup
- An **Anthropic (Claude) account** — for the chat. Sign up at
  https://console.anthropic.com
- *(Optional)* An **ElevenLabs account** — only if you want the figures to talk
  out loud. Sign up at https://elevenlabs.io

> 💡 The Claude and ElevenLabs APIs are **paid** (pay-as-you-go). You add a small
> amount of credit and the app draws from it as you use it. Step 1 shows you how
> to put a hard cap on spending so there are no surprises.

---

## Step 1 — Get your API keys

### 1a. Your Claude (Anthropic) key

1. Go to https://console.anthropic.com and sign in.
2. Add a payment method and some credit: **Billing** → add a card, then add (for
   example) $5–$10 of credit to start.
3. **Set a spending limit so you can never be over-charged:** go to **Limits**
   (or **Billing → Usage limits**) and set a **monthly spend limit** to an amount
   you're comfortable with (e.g. $5/month). This is the single most important
   safety step — it caps your bill no matter what.
4. Go to **API Keys** → **Create Key**. Give it a name like `historical-figure`.
5. **Copy the key now and keep it somewhere safe** (a password manager is ideal).
   It looks like `sk-ant-api03-...`. You won't be able to see it again after you
   close the dialog — if you lose it, just create a new one.

### 1b. Your ElevenLabs key (optional — only for voice)

1. Go to https://elevenlabs.io and sign in.
2. Click your profile (bottom-left) → **API Keys** (or **Profile + API Key**).
3. Create/copy your key. It looks like `sk_...`. Keep it safe too.

> You can skip 1b entirely. The chat works without it; you just won't get spoken
> audio.

### ⚠️ Keep your keys private

Your keys are like passwords for your account. **Never** paste them into a
public chat, a screenshot, an email, or a code file you share. In this app you
type them into a private settings box in your own browser (Step 4) — they're
stored only on your computer and never uploaded anywhere.

---

## Step 2 — Put the app on your GitHub account

You want your **own** copy of the project. The easiest way is to copy this
repository into your account.

1. Sign in to https://github.com.
2. Go to the project's repository page (the owner can send you the link).
3. Click the **Fork** button (top-right). On the next screen, click
   **Create fork**. This makes a copy under *your* username:
   `https://github.com/<your-username>/historicalfigure`.

> If forking isn't an option, the owner can instead add you as a collaborator,
> or you can download the code as a ZIP (**Code → Download ZIP**), then create a
> new repository and upload the files. Forking is simplest.

---

## Step 3 — Turn on free hosting (GitHub Pages)

This makes your copy a real, live website at no cost.

1. On **your** copy of the repo, click **Settings** (top menu).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, pick the branch with the app in it (usually `main`), keep
   the folder as **/ (root)**, and click **Save**.
5. Wait 1–2 minutes. The page will refresh and show a green box with your live
   URL, like:
   `https://<your-username>.github.io/historicalfigure/`
6. Click that link (or copy it) — that's your site!

> If you see a 404 at first, wait another minute and refresh — GitHub takes a
> moment to publish the first time.

---

## Step 4 — Open the site and add your keys

1. Open your live URL from Step 3 in a normal web browser (Chrome, Edge,
   Firefox, or Safari).
2. The first time you visit, a **"Your API Keys"** box pops up automatically.
   (You can reopen it anytime with the **🔑 API Keys** button in the
   bottom-right corner.)
3. Paste your **Claude (Anthropic) API key** into the first box.
4. *(Optional)* Paste your **ElevenLabs key** into the second box for voice.
5. Click **Save**.

That's it — you're ready to use the app.

> **Where do the keys go?** They're saved only in *your* browser, on *your*
> computer, and sent straight to Anthropic / ElevenLabs when you chat. They are
> never uploaded to GitHub or to any server, and they are never part of the
> code. If you open the site on a different computer or browser, you'll just
> paste your keys in again there.

---

## Using the app

1. Type the name of a historical figure and create your chatbot.
2. Chat with them. If you added an ElevenLabs key, click the speak button to
   hear them talk.
3. The quiz and other features work the same way, all using your own Claude key.

---

## Troubleshooting

**The chat says nothing / nothing happens when I send a message.**
Your Claude key is probably missing or wrong. Click **🔑 API Keys**
(bottom-right), re-paste your `sk-ant-...` key, and Save. Also check in the
Anthropic console that you have credit and haven't hit your spend limit.

**Voice doesn't play.**
You need an ElevenLabs key (Step 1b). Add it via the 🔑 panel. Make sure your
ElevenLabs account has available characters/credit.

**"401" or "authentication" errors.**
The key is invalid or was revoked. Create a fresh key in the relevant console
and paste the new one into the 🔑 panel.

**I think my key leaked / I see unexpected usage.**
Immediately go to the relevant console and **delete/revoke** that key, then
create a new one and paste the new one into the app. Deleting the key stops all
charges against it.

**The site shows a 404.**
GitHub Pages may still be publishing — wait a minute and refresh. Double-check
Step 3 picked the correct branch and `/ (root)` folder.

**Classroom mode doesn't work.**
Classroom mode connects to a separate hosted service and Google sign-in that
isn't part of this self-hosted copy. The core chat, voice, and quiz features all
work; classroom mode is the one exception.

---

## A few good habits

- **Always keep a spend limit** set on your Anthropic key (Step 1a) — it's your
  safety net.
- **Never share or commit your keys.** Treat them like passwords.
- If you ever suspect a key is exposed, **revoke it and make a new one** — that
  instantly stops any further use of the old one.
- You can change or remove your keys anytime via the **🔑 API Keys** button.
