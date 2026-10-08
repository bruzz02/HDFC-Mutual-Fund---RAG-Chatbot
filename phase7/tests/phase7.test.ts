import { ApiGateway } from '../api_gateway';
import { InMemoryRateLimiter } from '../rate_limiter';
import { SSEStreamer } from '../sse_streamer';
import { ApiHealthResponseSchema, ChatRequestSchema } from '../schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase7Tests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<void> | void) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message
      });
    }
  };

  // -------------------------------------------------------------
  // UNIT TESTS: Schema & Rate Limiting
  // -------------------------------------------------------------

  await runTest('Unit 1: ApiHealthResponseSchema validates health check payload', () => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSec: 42,
      version: '1.0.0'
    };
    ApiHealthResponseSchema.parse(health);
  });

  await runTest('Unit 2: ChatRequestSchema validates user message and rejects invalid inputs', () => {
    const valid = ChatRequestSchema.safeParse({ message: 'What is the expense ratio?' });
    const invalidEmpty = ChatRequestSchema.safeParse({ message: '' });

    if (!valid.success) throw new Error('Valid query was rejected');
    if (invalidEmpty.success) throw new Error('Empty query should be rejected');
  });

  await runTest('Unit 3: InMemoryRateLimiter tracks hits and returns remaining quota', () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 5, windowMs: 10000 });
    const r1 = limiter.checkLimit('client-1');
    const r2 = limiter.checkLimit('client-1');

    if (!r1.allowed || !r2.allowed) throw new Error('Requests under limit should be allowed');
    if (r2.remaining !== 3) throw new Error(`Expected 3 remaining, got ${r2.remaining}`);
  });

  await runTest('Unit 4: InMemoryRateLimiter blocks requests exceeding quota (HTTP 429)', () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 2, windowMs: 10000 });
    limiter.checkLimit('client-x');
    limiter.checkLimit('client-x');
    const r3 = limiter.checkLimit('client-x');

    if (r3.allowed) throw new Error('Third request should be blocked');
    if (r3.remaining !== 0) throw new Error('Remaining quota should be 0');
  });

  await runTest('Unit 5: InMemoryRateLimiter reset clears all client quotas', () => {
    const limiter = new InMemoryRateLimiter({ maxRequests: 1, windowMs: 10000 });
    limiter.checkLimit('client-a');
    limiter.reset();
    const r = limiter.checkLimit('client-a');

    if (!r.allowed) throw new Error('Request should be allowed after limiter reset');
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Server-Sent Events (SSE)
  // -------------------------------------------------------------

  await runTest('Unit 6: SSEStreamer formats valid Server-Sent Events messages', () => {
    const msg = SSEStreamer.formatMessage({
      event: 'token',
      data: { text: 'HDFC Mid Cap' },
      id: 'msg-1'
    });

    if (!msg.includes('event: token\n')) throw new Error('Missing SSE event field');
    if (!msg.includes('id: msg-1\n')) throw new Error('Missing SSE id field');
    if (!msg.includes('data: {"text":"HDFC Mid Cap"}\n\n')) throw new Error('Missing SSE data field');
  });

  await runTest('Unit 7: SSEStreamer tokenizes response into streaming token chunks', () => {
    const text = 'HDFC Mid Cap 5-year CAGR is 124.09% with high alpha.';
    const tokens = SSEStreamer.simulateTokenStream(text, 2);

    if (tokens.length < 3) throw new Error('Token stream should produce multiple chunks');
    const reassembled = tokens.join('');
    if (reassembled !== text) throw new Error('Reassembled token stream does not match original text');
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: API Gateway Request Dispatcher
  // -------------------------------------------------------------

  await runTest('Unit 8: ApiGateway returns 404 for unknown endpoints', async () => {
    const gateway = new ApiGateway();
    const res = await gateway.handleRequest({ path: '/api/unknown', method: 'GET' });

    if (res.statusCode !== 404) throw new Error(`Expected 404, got ${res.statusCode}`);
  });

  await runTest('Integration 9: ApiGateway handles GET /api/health endpoint', async () => {
    const gateway = new ApiGateway();
    const res = await gateway.handleRequest({ path: '/api/health', method: 'GET' });

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (res.body.status !== 'ok') throw new Error('Status not ok');
  });

  await runTest('Integration 10: ApiGateway handles GET /api/funds with 4 HDFC schemes', async () => {
    const gateway = new ApiGateway();
    const res = await gateway.handleRequest({ path: '/api/funds', method: 'GET' });

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (res.body.count !== 4) throw new Error(`Expected 4 funds, got ${res.body.count}`);
  });

  await runTest('Integration 11: ApiGateway handles POST /api/rag/chat returning fact-checked answer', async () => {
    const gateway = new ApiGateway();
    const res = await gateway.handleRequest({
      path: '/api/rag/chat',
      method: 'POST',
      body: { message: 'What is the expense ratio of HDFC Mid Cap Fund?' }
    });

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.body.finalAnswerMarkdown.includes('0.76%')) {
      throw new Error('Answer missing verified TER of 0.76%');
    }
    if (res.body.factCheckReport.status === 'rejected') {
      throw new Error('Fact check status should not be rejected');
    }
  });

  await runTest('Integration 12: ApiGateway handles POST /api/rag/chat with stream: true returning SSE payload', async () => {
    const gateway = new ApiGateway();
    const res = await gateway.handleRequest({
      path: '/api/rag/chat',
      method: 'POST',
      body: { message: 'HDFC ELSS lock-in period', stream: true }
    });

    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (res.headers['Content-Type'] !== 'text/event-stream') {
      throw new Error(`Expected text/event-stream, got ${res.headers['Content-Type']}`);
    }
    if (!res.body.includes('event: token') || !res.body.includes('event: done')) {
      throw new Error('SSE output missing token or done events');
    }
  });

  return results;
}
