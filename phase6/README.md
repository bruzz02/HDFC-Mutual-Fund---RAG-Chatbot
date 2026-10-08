# Phase 6: Automated Pipeline Scheduler & Cascade Orchestrator

This directory contains the production implementation and test suite for **Phase 6** of the Mutual Fund RAG Chatbot.

---

## Architecture Overview

Data freshness is essential for financial RAG. Phase 6 implements the **Cross-Phase Cascade Engine**:
Whenever new data is extracted from Groww (via daily NAV sync or monthly holdings sync), every downstream phase is atomically refreshed:

```
  Phase 1: Ingestion ──> Step 2: Delta Eval ──> Phase 2: Chunking ──> Phase 3: Embeddings
                                                                              │
  Telemetry & Status <── Step 6: Sanity Eval <── Phase 4/5: Invalidation <───┘
```

---

## Directory Structure

```
/phase6/
├── schema.ts                # Zod schemas (CascadeTriggerType, CascadeReport, SchedulerStatus)
├── cascade_orchestrator.ts  # Cross-phase transactional cascade engine with Redlock mutex
├── cron_scheduler.ts        # Cron trigger manager & interval scheduler
├── index.ts                 # Primary exports
├── cli.ts                   # Standalone CLI cascade executor
├── run_tests.ts             # Standalone test runner for Phase 6 only
├── README.md                # Architecture rationale and execution instructions
└── tests/
    └── phase6.test.ts       # 12 Unit and Integration tests
```

---

## How to Run

### 1. Run Standalone Cascade CLI
```bash
npm run phase6:cascade
# OR:
tsx phase6/cli.ts
```

### 2. Run Phase 6 Test Suite Only
```bash
npm run test:phase6
# OR:
tsx phase6/run_tests.ts
```
