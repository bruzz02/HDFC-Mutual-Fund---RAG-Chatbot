# Phase 9: Continuous Evaluation, Monitoring & Operations

This directory contains the production implementation and test suite for **Phase 9** of the Mutual Fund RAG Chatbot.

---

## Architecture Overview

Phase 9 implements:
1. **RAG Triad Automated Evaluation (Ragas / TruLens framework):**
   - Context Precision
   - Faithfulness / Groundedness
   - Answer Relevance
   - Composite RAG benchmark scoring
2. **Semantic Vector Query Cache (Redis Vector Cache simulation):**
   - Cosine similarity threshold matching ($\ge 0.95$)
   - Invalidation lifecycle hook called by the Phase 6 scheduler cascade.

---

## Directory Structure

```
/phase9/
├── schema.ts         # Zod schemas (EvaluationMetrics, EvaluationCaseResult, EvaluationSuiteReport, CacheEntry)
├── semantic_cache.ts # Semantic vector cache with cosine lookup, hit tracking & invalidation
├── golden_dataset.ts # Golden benchmark dataset covering all 4 HDFC mutual fund categories
├── rag_evaluator.ts  # RAG Triad automated evaluation benchmark calculator
├── index.ts          # Primary exports
├── cli.ts            # Standalone continuous evaluation & cache demonstration runner
├── run_tests.ts      # Standalone test runner for Phase 9 only
├── README.md         # Documentation and execution instructions
└── tests/
    └── phase9.test.ts # 12 Unit and Integration tests
```

---

## How to Run

### 1. Run Standalone Continuous Evaluation CLI
```bash
npm run phase9:eval
# OR:
tsx phase9/cli.ts
```

### 2. Run Phase 9 Test Suite Only
```bash
npm run test:phase9
# OR:
tsx phase9/run_tests.ts
```
