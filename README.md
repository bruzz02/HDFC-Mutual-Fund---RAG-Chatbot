# 📈 HDFC Mutual Fund Chat Bot

An AI-powered chatbot that helps users get **accurate, source-backed answers about HDFC mutual fund schemes**, covering NAV, expense ratio, AUM, returns, exit load, lock-in, and top holdings.

🔗 **Live Demo:** https://hdfc-mutual-fund-rag-chatbot.vercel.app/

---

## 📌 Overview

Mutual fund information is spread across fund pages, factsheets, and comparison tools. Finding one number, such as the expense ratio of a fund or its 5-year return, often means opening several pages and scanning long tables.

This application uses **Retrieval-Augmented Generation (RAG)** to answer questions in natural language. Instead of relying on an LLM's memory, which can get financial figures wrong, every answer is grounded in verified fund data and ends with a link to the official source.

### Example

> "What is the expense ratio of HDFC Large Cap Fund?"

**Answer:**

```text
Expense ratio of HDFC Large Cap Fund Direct Growth is 1.04%.

Source: Groww Scheme Record
```

---

## 🎯 Problem Statement

Investors researching mutual funds often have to:

- Open multiple fund pages to find a single metric
- Compare funds manually across categories
- Confuse similar metrics (3-year vs 5-year returns, direct vs regular expense ratio)
- Read long pages to find exit load or lock-in rules
- Trust numbers without knowing where they came from

General-purpose LLMs make this worse. They can confidently state a wrong NAV, invent an exit load rule, or mix up time periods.

The goal of this application is to deliver a **trustworthy, conversational fund-information experience** where every figure is grounded in source data.

---

## 💡 Product Solution

Users ask questions in plain language and get **short, direct answers** with a source link. No filler, no unsolicited advice, just what was asked.

### Key questions users can ask:

- 💵 NAV of a fund
- 📊 Expense ratio (TER)
- 🏦 AUM
- 📈 1Y / 3Y / 5Y / 10Y returns
- 🚪 Exit load
- 🔒 Lock-in period and Section 80C rules (ELSS)
- 🏢 Top stock holdings and sector exposure
- ⚖️ Comparisons across funds

---

## 🏦 Funds Covered

| Scheme | Category |
|---|---|
| HDFC Large Cap Fund Direct Growth | Equity / Large Cap |
| HDFC Mid Cap Fund Direct Growth | Equity / Mid Cap |
| HDFC Small Cap Fund Direct Growth | Equity / Small Cap |
| HDFC ELSS Tax Saver Fund Direct Plan Growth | Equity / ELSS |

---

## ✨ Key Features

### 🎯 Direct, Concise Answers
Ask for a NAV and get the NAV. Answers contain only what was asked.

### 🔗 Source Attribution on Every Answer
Each response ends with a link to the official Groww scheme record, so users can verify it themselves.

### 🔍 Hybrid Retrieval
Combines semantic (vector) search and keyword (BM25) search using Reciprocal Rank Fusion, then re-ranks results, so both meaning and exact terms like "expense ratio" are matched.

### 🛡️ Hallucination Defense
Figures in the generated answer are cross-checked against retrieved context. Multi-tier fallbacks ensure a metric never appears as `undefined`.

### 📊 Smart Comparison Tables
Multi-fund questions automatically produce a table comparing category, expense ratio, AUM, returns, and lock-in.

### 🔄 Auto-Refreshing Data
A scheduler re-scrapes fund data, rebuilds chunks and embeddings, and clears the cache, so answers don't go stale.

### 🧹 Intent-Aware Responses
Asking for the NAV of an *ELSS Tax Saver* fund does **not** trigger an unrequested Section 80C lock-in notice. Statutory notes appear only when the user asks about them.

### 🎨 Material Design 3 Interface
A clean top bar, fund-scope filter chips, and prompt chips for common questions, built for desktop and mobile.

### ⚡ Resilient Deployment
A dual-tier design (serverless RAG plus a client-side fallback) keeps users from seeing server errors on cold starts or timeouts.

---

## 🧠 How It Works

```text
User Question
    ↓
Query Router (detect intent + fund)
    ↓
Hybrid Retrieval (Vector + Keyword Search)
    ↓
Reciprocal Rank Fusion
    ↓
Re-ranking (top 3–4 chunks)
    ↓
Grounded Answer Generation (Gemini)
    ↓
Fact-Check + Direct Answer Formatter
    ↓
Concise Answer + Source Link
```

### Example

**User:**

> "Compare the 5-year returns of all four funds."

**The system identifies:**

```text
Intent        → Comparison
Metric        → 5-year returns
Funds         → Large Cap, Mid Cap, Small Cap, ELSS
Output        → Markdown comparison table + sources
```

---

## 🗄️ Data Pipeline

| Phase | What it does |
|---|---|
| **Ingestion** | Fetches each Groww scheme page and parses its embedded `__NEXT_DATA__` JSON payload instead of fragile HTML selectors. |
| **Chunking** | Four domain-specific chunks per fund (`overview`, `performance`, `holdings`, `costs_and_terms`) so numbers are never split across chunks. |
| **Storage** | PostgreSQL 16 + pgvector with 768-dim embeddings (HNSW index) and a full-text `tsvector` index. |
| **Scheduler** | Daily NAV sync at 23:30 IST and monthly holdings sync on the 10th, with diff detection and a mutex lock. |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19 + TypeScript** | Frontend application |
| **Tailwind CSS** | Styling (Material Design 3) |
| **Vite** | Build tooling |
| **Node.js + Express** | Backend API |
| **Google Gemini** | Answer generation and embeddings |
| **PostgreSQL + pgvector** | Vector and keyword storage |
| **Cheerio** | Data extraction |
| **Ragas / TruLens** | RAG evaluation |
| **Vercel** | Deployment and hosting |

---

## 🏗️ Product Architecture

```text
                ┌──────────────────┐
                │       User       │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │  React M3 Chat   │
                │  UI (Vercel)     │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   Backend API    │
                │ (/api/rag/chat)  │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │    RAG Engine    │
                │ Route → Retrieve │
                │ → Fuse → Rerank  │
                └────────┬─────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
 ┌──────────────────┐         ┌──────────────────┐
 │  Hybrid Store    │         │  Gemini (server- │
 │ pgvector + FTS   │         │  side only)      │
 └──────────────────┘         └──────────────────┘
          ▲
          │ refreshed by
 ┌──────────────────┐
 │ Scheduler +      │
 │ Groww Ingestion  │
 └──────────────────┘
```

📐 For the full phase-by-phase design, schemas, and code blueprints, see [architecture.md](./architecture.md).

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/rag/chat` | `POST` | Retrieval, re-ranking, and grounded answer generation |
| `/api/funds` | `GET` | Active fund records and source URLs |
| `/api/funds/ingest` | `POST` | Live extraction for all 4 funds |
| `/api/funds/scrape-single` | `POST` | Refresh a single fund |
| `/api/funds/logs` | `GET` | Ingestion logs and telemetry |
| `/api/funds/cache/invalidate` | `POST` | Flush the semantic cache |
| `/api/scheduler/status` | `GET` | Cron status and last run report |
| `/api/scheduler/trigger` | `POST` | Run the full pipeline immediately |
| `/api/health` | `GET` | Health check |

---

## 🌐 Live Application

Try the application here:

**https://hdfc-mutual-fund-rag-chatbot.vercel.app/**

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16 with the `pgvector` extension
- A Google Gemini API key

### Installation

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
npm install
```

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/your_db
```

> Never commit your `.env` file. Update variable names to match your code.

### Run Locally

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

The test suite covers all 9 phases with **108 tests**.

---

## 🎯 Product Thinking Behind the App

This project focuses on **trust in financial information**, not just on building another chatbot.

### User Problem

> "I just need one number about a fund, and I need to be sure it's right."

### Product Opportunity

RAG can combine the convenience of a conversational interface with the reliability of source-grounded data, so that users get quick answers they can verify.

### Core Product Value

**Less searching → Verified answers → Faster, more confident research**

---

## 📊 Potential Product Metrics

If this application were developed into a production product, the following metrics could measure success:

### North Star Metric

**Verified Answer Sessions**

The percentage of sessions where users receive an answer and engage with the source link or continue with a follow-up question.

### Supporting Metrics

| Metric | What it measures |
|---|---|
| Faithfulness Score (target ≥ 0.85) | How well answers stay grounded in sources |
| Context Precision (target ≥ 0.60) | Quality of retrieved chunks |
| Answer Relevance (target ≥ 0.70) | Whether answers address the question |
| Source Link Click-Through Rate | User trust and verification behaviour |
| Query Refinement Rate | How often users rephrase their question |
| Median Response Latency | Speed of the experience |

---

## 🔮 Future Improvements

- 📚 Expand coverage to more AMCs and fund categories
- 🔁 Support regular plans alongside direct plans
- 📉 Historical NAV charts inside the chat
- 🧮 SIP and lump-sum return calculators
- ⚖️ Side-by-side comparison view with visual charts
- 💬 Conversational follow-ups ("what about its 3-year return?")
- 🗣️ Voice input for hands-free queries
- 🌐 Multi-language support (Hindi and regional languages)
- 🔔 NAV and exit-load change alerts
- 🧠 Query-level analytics to improve retrieval

---

## 👨‍💻 Project Purpose

This project demonstrates how **RAG, hybrid search, and guardrailed generation** can be combined to build a reliable AI product in a domain where accuracy matters.

The project focuses on:

- Retrieval-Augmented Generation
- Hybrid search and re-ranking
- Hallucination defense
- Data pipelines and scheduled refresh
- Serverless deployment
- User-centric product design

---

## ⚠️ Disclaimer

Data is sourced from publicly available Groww scheme pages and may lag behind official AMC or AMFI figures. This project is for **informational and educational purposes only** and is **not investment advice**. Please verify figures with the official fund house and consult a SEBI-registered advisor before investing. This project is not affiliated with HDFC Mutual Fund or Groww.

---

## 📄 License

This project is intended for educational and portfolio purposes.

Add an appropriate open-source license if you plan to make the repository publicly reusable.

---

## ⭐ Feedback

If you have suggestions for improving the experience, feel free to open an issue or submit a pull request.

If you find the project useful, consider giving the repository a ⭐.
