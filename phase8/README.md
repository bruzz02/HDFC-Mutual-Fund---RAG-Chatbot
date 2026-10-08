# Phase 8: Frontend Application Architecture & Financial UX

This directory contains the production implementation and test suite for **Phase 8** of the Mutual Fund RAG Chatbot.

---

## Architecture Overview

Phase 8 defines the frontend application state, UI schemas, formatting utilities for Indian mutual funds (₹ Crores, %, NAV, riskometers), navigation tabs, and comparative table matrix constructors.

---

## Directory Structure

```
/phase8/
├── schema.ts         # Zod schemas (ActiveTab, QuickPromptChip, ComparisonMatrixColumn, UiNotification)
├── formatters.ts     # Indian financial number & badge formatters (INR Crores, %, risk classes)
├── ui_state.ts       # Frontend state manager & side-by-side comparison matrix generator
├── index.ts          # Primary exports
├── cli.ts            # Standalone frontend UX & state demonstration runner
├── run_tests.ts      # Standalone test runner for Phase 8 only
├── README.md         # Documentation and execution instructions
└── tests/
    └── phase8.test.ts # 12 Unit and Integration tests
```

---

## How to Run

### 1. Run Standalone Frontend State CLI
```bash
npm run phase8:ui
# OR:
tsx phase8/cli.ts
```

### 2. Run Phase 8 Test Suite Only
```bash
npm run test:phase8
# OR:
tsx phase8/run_tests.ts
```
