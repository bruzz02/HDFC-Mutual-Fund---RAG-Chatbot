# Phase 4: Multi-Stage Hybrid Retrieval & Re-ranking

This directory contains the production implementation and test suite for **Phase 4** of the Mutual Fund RAG Chatbot.

---

## Architecture Overview

Financial queries require both broad semantic comprehension (e.g. *“long-term compounding performance in mid-sized companies”*) and granular lexical exactitude (e.g. *“TER of 0.76%”*, *“Section 80C 3-year statutory lock-in”*).

Phase 4 solves this via a **Multi-Stage Hybrid Retrieval Pipeline**:

```
                       ┌────────────────────────────┐
                       │    User Financial Query    │
                       └─────────────┬──────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │      Query Preprocessor & Router    │
                  │  • Intent classification            │
                  │  • Target sub-category extraction   │
                  │  • Domain synonym expansion         │
                  └──────────────┬──────────────┬───────┘
                                 │              │
                   Dense Vector  │              │  Sparse BM25
                   Search (Top-10│              │  Search (Top-10)
                                 ▼              ▼
                            ┌─────────┐    ┌─────────┐
                            │  Dense  │    │ Sparse  │
                            │ Top-10  │    │ Top-10  │
                            └────┬────┘    └────┬────┘
                                 │              │
                                 └──────┬───────┘
                                        │
                                        ▼
                  ┌─────────────────────────────────────┐
                  │     Reciprocal Rank Fusion (RRF)    │
                  │        RRF(d) = 1 / (60 + Rank)     │
                  └─────────────────────┬───────────────┘
                                        │
                                        ▼
                  ┌─────────────────────────────────────┐
                  │    Second-Stage Semantic Reranker   │
                  │  • Intent alignment scoring         │
                  │  • Term & metric density boost      │
                  │  • Comparative diversity enforcement│
                  │  • Low-relevance candidate pruning  │
                  └─────────────────────┬───────────────┘
                                        │
                                        ▼
                  ┌─────────────────────────────────────┐
                  │      Context Window Assembler       │
                  │  • Groww source URL attribution     │
                  │  • Metadata & RRF rank badges       │
                  │  • Prompt-ready Markdown structure  │
                  └─────────────────────────────────────┘
```

---

## Directory Structure

```
/phase4/
├── schema.ts            # Zod validation schemas (QueryIntent, ProcessedQuery, ScoredCandidate, RetrievalResult)
├── query_router.ts      # Query preprocessor (intent detection, entity extraction, term expansion)
├── rrf_fusion.ts        # Reciprocal Rank Fusion (RRF k=60) mathematical rank combination
├── reranker.ts          # Second-stage cross-scoring reranker with diversity selection & pruning
├── context_builder.ts   # Context window assembler with Groww source citation badges
├── index.ts             # Primary orchestrator class: Phase4RetrievalEngine
├── cli.ts               # Standalone command-line retrieval demonstration tool
├── run_tests.ts         # Standalone test runner for Phase 4 only
├── README.md            # Documentation and execution instructions
└── tests/
    └── phase4.test.ts   # 12 Unit and Integration tests
```

---

## How to Run

### 1. Run Standalone Retrieval CLI
Executes sample queries across various intents (costs, returns, holdings, comparisons):
```bash
npm run phase4:retrieve
# OR:
tsx phase4/cli.ts
```

### 2. Run Phase 4 Test Suite Only
Executes all 12 unit and integration test cases for Phase 4:
```bash
npm run test:phase4
# OR:
tsx phase4/run_tests.ts
```
