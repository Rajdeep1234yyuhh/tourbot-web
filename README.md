# TourBot — Assamese–English Code-Mixed Tourism Chatbot

[![Model](https://img.shields.io/badge/🤗%20Model-assamese--tourism--intent--classifier-yellow)](https://huggingface.co/rajk12/assamese-tourism-intent-classifier)
[![Space](https://img.shields.io/badge/🤗%20Space-assamese--tourism--chatbot-blue)](https://huggingface.co/spaces/rajk12/assamese-tourism-chatbot)
[![Dataset](https://img.shields.io/badge/🤗%20Dataset-assamese--tourism--qa--bank-orange)](https://huggingface.co/datasets/rajk12/assamese-tourism-qa-bank)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

TourBot is a conversational assistant for tourism in Assam, India. It understands queries written in **Assamese–English code-mixed text** (romanised Assamese freely mixed with English), the way people actually type on their phones:

> *"Kaziranga t hotel r daam kiman?"* — "How much do hotels cost in Kaziranga?"
> *"Majuli jabor fastest way ki?"* — "What is the fastest way to get to Majuli?"

Code-mixed, low-resource languages are poorly served by general-purpose NLP models. This project builds an end-to-end system for one: a custom dataset, a fine-tuned transformer intent classifier, a semantic retrieval layer, and a production web front end.

This repository contains the **Next.js web application** and the **model training notebook**.

---

## Highlights

| Metric | Value |
|---|---|
| Intent classification accuracy (test) | **97.89%** |
| Intent classification macro-F1 (test) | **0.9787** |
| Semantic retrieval Recall@1 / MRR | **100% / 1.0000** (612 test queries) |
| Intent classes | 44 |
| Destinations covered | 51 |
| Q&A knowledge base | 221,799 pairs (4,349 templates × 51 destinations) |

---

## Project Resources

| Resource | Link |
|---|---|
| Intent classifier (fine-tuned MuRIL) | [rajk12/assamese-tourism-intent-classifier](https://huggingface.co/rajk12/assamese-tourism-intent-classifier) |
| Sentence encoder (semantic retrieval) | [rajk12/assamese-tourism-sentence-encoder](https://huggingface.co/rajk12/assamese-tourism-sentence-encoder) |
| Q&A dataset | [datasets/rajk12/assamese-tourism-qa-bank](https://huggingface.co/datasets/rajk12/assamese-tourism-qa-bank) |
| Inference backend (Gradio Space) | [spaces/rajk12/assamese-tourism-chatbot](https://huggingface.co/spaces/rajk12/assamese-tourism-chatbot) |

---

## System Architecture

```
┌────────────────────────────┐
│  User (browser)            │  Assamese / English / code-mixed query
└──────────────┬─────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Next.js app (Vercel) — /api/chat                              │
│   • Keyword intent overrides for high-frequency phrasings      │
│   • Fuzzy destination detection (bigram Jaccard, handles typos │
│     and Assamese locative/genitive suffixes)                   │
│   • Low-confidence retry with best-guess destination           │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Hugging Face Space (Gradio / PyTorch) — /predict              │
│   1. Intent classification   fine-tuned MuRIL, 44 intents      │
│   2. Destination detection   longest-pattern-first lookup      │
│   3. Semantic retrieval      MuRIL mean-pooled embeddings,     │
│                              cosine similarity, filtered by    │
│                              intent + destination              │
│   4. Confidence routing      three-tier (see below)            │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Post-processing (Next.js)                                     │
│   • Intent-aware filtering of off-topic sentences              │
│   • Optional LLM clean-up (Llama 3.3 70B via Groq)             │
│   • Query logging for out-of-distribution (OOD) review         │
└──────────────┬─────────────────────────────────────────────────┘
               ▼
         Answer + debug panel (intent, confidence, routing tier)
```

### Confidence routing

| Classifier confidence | Strategy |
|---|---|
| ≥ 0.70 | **Direct** — retrieve within the predicted intent |
| 0.30 – 0.70 | **Race mode** — compare candidates across the top intents |
| < 0.30 (destination known) | **Cross-intent** — search all intents for that destination |

---

## Intent Classifier

The core model, [`rajk12/assamese-tourism-intent-classifier`](https://huggingface.co/rajk12/assamese-tourism-intent-classifier), is [`google/muril-base-cased`](https://huggingface.co/google/muril-base-cased) (237M parameters) fine-tuned for sequence classification. MuRIL was chosen because it is pre-trained on 17 Indian languages, including transliterated (romanised) text, which suits code-mixed Assamese.

**Training techniques**

- **Focal loss** — reduces the dominance of easy, frequent classes
- **R-Drop regularisation** — enforces consistency between two dropout passes
- **Stochastic Weight Averaging (SWA)** — better generalisation through flatter minima

**Intent taxonomy (44 classes):** accommodation (7), activities (6), best time to visit (4), comparison, cost (3), duration of stay (3), food (5), precautions (3), how to reach (5), speciality (6), and general tips.

**Usage**

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_id = "rajk12/assamese-tourism-intent-classifier"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForSequenceClassification.from_pretrained(model_id).eval()

inputs = tokenizer("Kaziranga t hotel r daam kiman?", return_tensors="pt")
with torch.no_grad():
    probs = model(**inputs).logits.softmax(dim=-1)[0]

idx = int(probs.argmax())
print(model.config.id2label.get(idx, idx), f"{probs[idx]:.2%}")
```

> If the label names are not stored in the model config, use the `intent_mapping.json` file published with the model.

### Training notebook

[`model-training-distilbert-and-bert.ipynb`](model-training-distilbert-and-bert.ipynb) contains the earlier baseline experiments (BERT / DistilBERT intent classification plus a sentence-transformer retrieval stage, run on Kaggle). These experiments shaped the two-stage design and led to the move to MuRIL for the production model.

---

## Web Application

### Features

- **Chat interface** with conversation history
- **Debug panel** showing predicted intent, confidence, alternative intents, detected destination and routing tier
- **How it works** page explaining the pipeline (`/how-it-works`)
- **Intent history** dashboard (`/intent_history`) to review logged queries, mark verdicts (correct / wrong / low confidence) and export them as CSV for retraining

### Tech stack

- **Next.js 14** (App Router) and **TypeScript**
- **Tailwind CSS** and **Framer Motion**
- **Groq SDK** (optional answer clean-up)
- **Vercel** for deployment

### Getting started

**Prerequisites:** Node.js 18.17 or later and npm.

```bash
git clone https://github.com/Rajdeep1234yyuhh/tourbot-web.git
cd tourbot-web
npm install
# create .env.local (see Environment variables below)
npm run dev                  # http://localhost:3000
```

### Environment variables

Create a `.env.local` file in the project root:

| Variable | Required | Description |
|---|---|---|
| `HF_SPACE_URL` | No | Inference backend URL. Defaults to `https://rajk12-assamese-tourism-chatbot.hf.space` |
| `GROQ_API_KEY` | No | Turns on LLM-based answer clean-up. Without it, answers are returned after rule-based filtering only |

> The Hugging Face Space may sleep when idle. The first request after a period of inactivity can take up to a minute while it starts. The API route allows 120 seconds before timing out.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | `POST` | Main chat endpoint; proxies to the HF Space and post-processes the answer |
| `/api/ood-logs` | `GET` | Returns logged queries (newest first) |
| `/api/ood-verdict` | `POST` | Records a reviewer verdict for a logged query |
| `/api/ood-download` | `GET` | Exports logged queries as CSV |

> Query logs are written to `ood_log.json` on the local filesystem. This works in local development. On serverless platforms such as Vercel the filesystem is temporary, so production deployments need a persistent store (for example, a database).

### Project structure

```
app/
├── api/
│   ├── chat/route.ts          Chat proxy, destination detection, post-processing
│   ├── ood-logs/route.ts      List logged queries
│   ├── ood-verdict/route.ts   Update a query's review verdict
│   └── ood-download/route.ts  CSV export
├── components/
│   ├── Header.tsx
│   ├── ChatSection.tsx        Chat UI, debug panel, model/resource info
│   ├── HowItWorks.tsx         Pipeline overview
│   └── Footer.tsx
├── how-it-works/page.tsx
├── intent_history/            Query review dashboard
├── layout.tsx
└── page.tsx
lib/
├── intentOverrides.ts         Regex-based intent overrides for code-mixed phrasing
└── firestoreLog.ts            Query logging (JSON file store)
model-training-distilbert-and-bert.ipynb   Baseline training experiments
```

### Deployment

The app deploys to Vercel with no extra configuration:

```bash
npx vercel
```

You can also import the repository at [vercel.com](https://vercel.com) for automatic deploys on every push. Add the environment variables in **Project Settings → Environment Variables**.

---

## Author

**Rajdeep** — [GitHub](https://github.com/Rajdeep1234yyuhh) · [Hugging Face](https://huggingface.co/rajk12)
