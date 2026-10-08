# Phase 5: Guardrailed Generation, Citation & Hallucination Defense

This directory contains the production implementation and test suite for **Phase 5** of the Mutual Fund RAG Chatbot.

---

## Architecture Overview

Financial information systems must adhere to strict regulatory compliance and mathematical precision. Even a 0.5% deviation in an expense ratio or hallucinating a 3-year lock-in period for an open-ended fund exposes investors to real monetary risk.

Phase 5 addresses this through a **Multi-Layer Guardrail & Hallucination Defense Architecture**:

```
                  ┌─────────────────────────────────────────┐
                  │    Phase 4 Retrieved Context & Query    │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       System Prompt Guardrails          │
                  │  • Temperature: 0.2                     │
                  │  • Zero extrapolation mandate           │
                  │  • Tabular comparison requirement       │
                  │  • Mandatory Groww source attribution   │
                  │  • Statutory 80C 3-year lock-in rule    │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    Gemini 3.8 Flash Generation Engine   │
                  │  • Model: gemini-3.8-flash              │
                  │  • Fallback: Financial Synthesizer      │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      Hallucination Defense Layer        │
                  │  • Regex extraction of financial units  │
                  │    (%, ₹ NAV, ₹ Cr AUM, durations)      │
                  │  • Cross-examination vs Context Chunks  │
                  │  • Un-grounded figure detection         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      Automatic Compliance Repair        │
                  │  • Auto-injects SEBI market disclaimer  │
                  │  • Auto-injects ELSS Section 80C notice │
                  │  • Auto-injects Groww direct URL badges │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Verified Guardrailed Answer       │
                  │  • Formatted Markdown response          │
                  │  • FactCheckReport (Confidence Score)   │
                  └─────────────────────────────────────────┘
```

---

## Directory Structure

```
/phase5/
├── schema.ts                # Zod schemas (ExtractedFinancialFigure, FactCheckReport, GuardrailedAnswer)
├── prompt_templates.ts      # Strict financial analyst system prompt, SEBI disclaimer & ELSS notices
├── hallucination_defense.ts # Entity extractor, cross-context validator & auto-repair engine
├── generator.ts             # Gemini 3.8 Flash + deterministic financial synthesis fallback
├── index.ts                 # Primary orchestrator class: Phase5GenerationPipeline
├── cli.ts                   # Standalone command-line generation & fact-checking runner
├── run_tests.ts             # Standalone test runner for Phase 5 only
├── README.md                # Architecture rationale and execution instructions
└── tests/
    └── phase5.test.ts       # 12 Unit and Integration tests
```

---

## How to Run

### 1. Run Standalone Generation CLI
Executes sample query, retrieval, generation, and fact-check verification report:
```bash
npm run phase5:generate
# OR:
tsx phase5/cli.ts
```

### 2. Run Phase 5 Test Suite Only
Executes all 12 unit and integration test cases for Phase 5:
```bash
npm run test:phase5
# OR:
tsx phase5/run_tests.ts
```
