# Phase 2: Document Preprocessing & Domain-Specific Semantic Chunking

This directory contains the complete implementation and test suite for **Phase 2** of the Mutual Fund RAG Chatbot.

---

## Purpose & Financial Rationale

Standard naive text chunking (e.g. recursive splitting by 500 characters) severely degrades financial RAG systems because:
1. **Numbers Get Severed:** Multi-year returns tables are split across chunk boundaries.
2. **Context Dilution:** Mixing 80 company holdings with expense ratio rules causes vector search to return irrelevant stock lists when users only ask about fees.

**Phase 2 enforces Domain-Specific Orthogonal Chunking**:
Every mutual fund scheme is partitioned into 4 distinct, purpose-driven chunks:

1. **Overview & Profile (`overview`)**: Scheme name, fund house, manager, AUM, NAV, benchmarks, ratings (~140–160 tokens).
2. **Trailing Returns (`performance`)**: 1M, 6M, 1Y, 3Y, 5Y, 10Y CAGR returns with category benchmarks & alpha in a markdown table (~150–180 tokens).
3. **Holdings & Portfolio (`holdings`)**: Top stock holdings with exact weights (%), asset allocations, sector breakdowns (~180–220 tokens).
4. **Costs, Terms & Tax (`costs_and_terms`)**: Expense ratio, exit load rules, minimum SIP/lump sum, and Section 80C 3-year statutory lock-in disclosures (~130–150 tokens).

---

## Directory Structure

```
/phase2/
├── README.md            # Documentation and execution instructions
├── schema.ts            # Zod validation schemas for SemanticChunk and Metadata
├── cleaner.ts           # Financial text cleaner, HTML entity decoder, Indian number formatter
├── tokenizer.ts         # Financial subword token count estimator & SHA-256 content hashing
├── chunker.ts           # Semantic chunker building orthogonal markdown chunks
├── storage.ts           # Chunk manifest persistence & Change-Data-Capture (CDC diff detection)
├── index.ts             # Primary pipeline orchestrator exporting Phase2ChunkingPipeline
├── cli.ts               # Standalone command-line chunking tool
├── run_tests.ts         # Standalone test runner with timing benchmarks
└── tests/
    └── phase2.test.ts   # 12 Unit and Integration test cases
```

---

## How to Run

### 1. Run Standalone Chunking CLI
Reads Phase 1 mutual fund snapshots and processes them into orthogonal chunks:
```bash
npm run phase2:chunk
# OR:
tsx phase2/cli.ts
```

### 2. Run Phase 2 Test Suite
Runs all 12 unit and integration test cases:
```bash
npm run test:phase2
# OR:
tsx phase2/run_tests.ts
```
