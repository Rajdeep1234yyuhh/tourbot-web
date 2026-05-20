# Assamese Tourism Chatbot — Next.js Web App

Frontend web interface for the Assamese-English code-mixed tourism chatbot.
Calls the Hugging Face Space (Gradio) API as the backend.

## Stack
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **TypeScript**
- **Vercel** (deployment)

## Setup

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
npx vercel
# Follow prompts — it auto-detects Next.js
```

Or connect your GitHub repo to vercel.com for automatic deploys.

## How it works

```
User → Next.js UI (Vercel)
           ↓  /api/chat  (Next.js API route)
           ↓  proxies to
HF Space Gradio API (rajk12/assamese-tourism-chatbot)
           ↓
     Intent Classifier + Semantic Matcher
           ↓
        Answer + Debug info
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_HF_SPACE_URL` | Your HF Space URL (set in .env.local) |

## Project structure

```
app/
  layout.tsx          Root layout
  page.tsx            Main page
  globals.css         Global styles + font imports
  api/chat/route.ts   API route → proxies to HF Space

components/
  Header.tsx          Top navigation
  ChatSection.tsx     Chat interface + debug panel
  HowItWorks.tsx      Pipeline diagram section
  Footer.tsx          Contact + links
```
