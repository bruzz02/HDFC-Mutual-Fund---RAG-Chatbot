# Phase 1: Mutual Fund Data Ingestion & Extraction Engine

This directory contains the complete implementation and test suite for **Phase 1** of the Mutual Fund RAG Chatbot.

---

## Target Mutual Fund Schemes (Groww)

1. **HDFC Large Cap Fund Direct Growth**  
   `https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth`
2. **HDFC Mid Cap Fund Direct Growth**  
   `https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth`
3. **HDFC Small Cap Fund Direct Growth**  
   `https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth`
4. **HDFC ELSS Tax Saver Fund Direct Plan Growth**  
   `https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth`

---

## Directory Structure

```
/phase1/
├── README.md            # Documentation and execution instructions
├── schema.ts            # Strongly typed Zod schemas for mutual fund data
├── crawler.ts           # Resilient HTTP fetcher with exponential backoff retry
├── extractor.ts         # Next.js SSR hydration extractor (<script id="__NEXT_DATA__">)
├── normalizer.ts        # Normalizes raw Groww payload & aggregates sector weights
├── storage.ts           # Snapshot persistence & Change-Data-Capture (CDC diff detection)
├── index.ts             # Primary orchestrator pipeline exporting Phase1IngestionPipeline
├── cli.ts               # Standalone command-line ingestion tool
├── run_tests.ts         # Standalone test runner with timing benchmarks
└── tests/
    └── phase1.test.ts   # 11 Unit and Live Integration test cases
```

---

## How to Run

### 1. Run Live Phase 1 Ingestion
Fetches live data from all 4 Groww URLs, normalizes the records, and writes snapshots:
```bash
npm run phase1:ingest
# OR directly:
tsx phase1/cli.ts
```

### 2. Run Phase 1 Test Suite
Runs all 11 unit and live integration test cases:
```bash
npm run test:phase1
# OR directly:
tsx phase1/run_tests.ts
```

---

## Key Architectural Decisions

1. **SSR Hydration Extraction:**
   Groww pages are Next.js server-rendered. We extract `<script id="__NEXT_DATA__">` directly to access `mfServerSideData`. This provides 100% data fidelity (NAV, AUM, CAGR, holdings, exit load) and eliminates brittle CSS selector breakage.

2. **Zod Schema Validation:**
   Every extracted field is validated at runtime against `GrowwFundRecordSchema`.

3. **Tax & Lock-in Detection:**
   Automatically detects ELSS schemes and enforces a 3-year statutory lock-in (Section 80C) and `exit_load = 'Nil'`.

4. **Change-Data-Capture (CDC):**
   `Phase1Storage` diffs new records against old snapshots to detect changes in NAV, AUM, and top holdings before triggering downstream RAG re-indexing.
