# Phase 7: Backend Microservice & API Gateway Architecture

This directory contains the production implementation and test suite for **Phase 7** of the Mutual Fund RAG Chatbot.

---

## Architecture Overview

The backend microservice and API gateway architecture guarantees secure secret isolation, rate limiting, and Server-Sent Events (SSE) streaming delivery for the mutual fund RAG application.

---

## Directory Structure

```
/phase7/
├── schema.ts         # Zod schemas (ApiHealthResponse, ChatRequest, RateLimitConfig)
├── rate_limiter.ts   # In-memory sliding-window token bucket rate limiter
├── sse_streamer.ts   # Server-Sent Events (SSE) message formatter & token streamer
├── api_gateway.ts    # Central request dispatcher routing endpoints to pipelines
├── index.ts          # Primary exports
├── cli.ts            # Standalone API gateway execution demonstration
├── run_tests.ts      # Standalone test runner for Phase 7 only
├── README.md         # Architecture rationale and execution instructions
└── tests/
    └── phase7.test.ts # 12 Unit and Integration tests
```

---

## How to Run

### 1. Run Standalone API Gateway CLI
```bash
npm run phase7:gateway
# OR:
tsx phase7/cli.ts
```

### 2. Run Phase 7 Test Suite Only
```bash
npm run test:phase7
# OR:
tsx phase7/run_tests.ts
```
