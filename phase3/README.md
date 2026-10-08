# Phase 3: Vector Embeddings & Hybrid Storage Layer

This directory contains the complete implementation and test suite for **Phase 3** of the Mutual Fund RAG Chatbot.

---

## Architecture & Financial Rationale

Financial queries demand both:
1. **Semantic Nuance:** Natural language intent, comparisons, and risk appetite descriptions (e.g. *"compounding returns with mid-sized growth"*).
2. **Exact Lexical Precision:** Specific ratios, expense percentages, scheme codes, and regulatory acronyms (e.g. *"TER"*, *"ELSS"*, *"80C"*, *"Chirag Setalvad"*, *"0.76%"*).

To solve this, Phase 3 implements a **Dual-Index Hybrid Architecture**:
- **Dense Vector Store:** 768-dimensional normalized unit embeddings with cosine similarity.
- **Sparse BM25 Index:** Full-text inverted index with IDF term frequency weighting.
- **Reciprocal Rank Fusion (RRF, $k=60$):** Fuses dense cosine ranks and sparse BM25 ranks without brittle score normalization.
- **PostgreSQL 16 + pgvector Compatible:** Production DDL with HNSW index (`m = 16, ef_construction = 64`) and GIN `tsvector` index.

---

## Directory Structure

```
/phase3/
├── README.md            # Documentation and execution instructions
├── schema.ts            # Zod validation schemas for VectorDocument, SearchResult, and Summary
├── embedder.ts          # 768-dim dense embedding generator (Gemini API + deterministic semantic unit vectors)
├── sparse_index.ts      # BM25 full-text inverted index with stopword filtering & IDF weighting
├── vector_store.ts      # In-memory hybrid vector store supporting cosine similarity, BM25, and metadata filters
├── pgvector_ddl.sql     # PostgreSQL 16 + pgvector production schema with HNSW index & GIN tsvector index
├── index.ts             # Primary pipeline orchestrator exporting Phase3IndexingPipeline
├── cli.ts               # Standalone command-line indexing tool
├── run_tests.ts         # Standalone test runner for Phase 3 only
└── tests/
    └── phase3.test.ts   # 12 Unit and Integration test cases
```

---

## How to Run

### 1. Run Standalone Indexing & Search CLI
Indexes all Phase 2 chunks and runs a sample hybrid search:
```bash
npm run phase3:index
# OR:
tsx phase3/cli.ts
```

### 2. Run Phase 3 Test Suite Only
Runs all 12 unit and integration test cases for Phase 3:
```bash
npm run test:phase3
# OR:
tsx phase3/run_tests.ts
```
