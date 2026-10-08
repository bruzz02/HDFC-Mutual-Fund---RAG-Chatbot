import { InMemoryRateLimiter } from './rate_limiter';
import { SSEStreamer } from './sse_streamer';
import { ChatRequestSchema, ApiHealthResponse } from './schema';
import { Phase5GenerationPipeline } from '../phase5/index';
import { Phase4RetrievalEngine } from '../phase4/index';
import { CascadeOrchestrator } from '../phase6/cascade_orchestrator';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { SemanticChunker } from '../phase2/chunker';
import { GrowwFundRecord } from '../phase1/schema';

export interface HttpRequest {
  path: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  clientIp?: string;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

export class ApiGateway {
  private rateLimiter: InMemoryRateLimiter;
  private p5Pipeline: Phase5GenerationPipeline;
  private cascadeOrchestrator: CascadeOrchestrator;
  private startTime: number;
  private initPromise: Promise<void>;

  constructor() {
    this.rateLimiter = new InMemoryRateLimiter({ maxRequests: 50 });
    this.cascadeOrchestrator = new CascadeOrchestrator();
    this.startTime = Date.now();

    const retrievalEngine = new Phase4RetrievalEngine();
    this.p5Pipeline = new Phase5GenerationPipeline({
      retrievalEngine,
      generatorOptions: { mode: 'deterministic' }
    });

    const allChunks = INITIAL_HDFC_FUNDS.flatMap(f => SemanticChunker.chunkFund(f as unknown as GrowwFundRecord));
    this.initPromise = retrievalEngine.indexChunks(allChunks);
  }

  getRateLimiter(): InMemoryRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Dispatches and processes an API request with rate limiting, input validation, and route handling.
   */
  async handleRequest(req: HttpRequest): Promise<HttpResponse> {
    await this.initPromise;
    const clientIp = req.clientIp || '127.0.0.1';

    // 1. Rate Limiting Check
    const rateCheck = this.rateLimiter.checkLimit(clientIp);
    const standardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '50',
      'X-RateLimit-Remaining': rateCheck.remaining.toString(),
      'X-RateLimit-Reset': rateCheck.resetTime.toString()
    };

    if (!rateCheck.allowed) {
      return {
        statusCode: 429,
        headers: standardHeaders,
        body: { error: 'Too many requests, please try again later.' }
      };
    }

    // 2. Health Check
    if (req.method === 'GET' && req.path === '/api/health') {
      const healthData: ApiHealthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSec: Math.floor((Date.now() - this.startTime) / 1000),
        version: '1.0.0'
      };
      return { statusCode: 200, headers: standardHeaders, body: healthData };
    }

    // 3. Funds Catalog
    if (req.method === 'GET' && req.path === '/api/funds') {
      return {
        statusCode: 200,
        headers: standardHeaders,
        body: {
          funds: INITIAL_HDFC_FUNDS,
          count: INITIAL_HDFC_FUNDS.length
        }
      };
    }

    // 4. Scheduler Status
    if (req.method === 'GET' && req.path === '/api/scheduler/status') {
      return {
        statusCode: 200,
        headers: standardHeaders,
        body: this.cascadeOrchestrator.getStatus()
      };
    }

    // 5. Scheduler Trigger
    if (req.method === 'POST' && req.path === '/api/scheduler/trigger') {
      try {
        const report = await this.cascadeOrchestrator.executeCascade('manual', { mockPhase1: true });
        return { statusCode: 200, headers: standardHeaders, body: { success: true, report } };
      } catch (err: any) {
        return { statusCode: 500, headers: standardHeaders, body: { error: err.message } };
      }
    }

    // 6. RAG Chat Query
    if (req.method === 'POST' && req.path === '/api/rag/chat') {
      const parseResult = ChatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return {
          statusCode: 400,
          headers: standardHeaders,
          body: { error: 'Invalid chat request', details: parseResult.error.format() }
        };
      }

      const { message, stream } = parseResult.data;
      const answer = await this.p5Pipeline.answer(message, 3);

      if (stream) {
        const chunks = SSEStreamer.simulateTokenStream(answer.finalAnswerMarkdown);
        let sseBody = '';
        for (const chunk of chunks) {
          sseBody += SSEStreamer.formatMessage({ event: 'token', data: { text: chunk } });
        }
        sseBody += SSEStreamer.formatMessage({ event: 'done', data: answer });
        return {
          statusCode: 200,
          headers: { ...standardHeaders, 'Content-Type': 'text/event-stream' },
          body: sseBody
        };
      }

      return {
        statusCode: 200,
        headers: standardHeaders,
        body: answer
      };
    }

    // 404 Route Not Found
    return {
      statusCode: 404,
      headers: standardHeaders,
      body: { error: `Endpoint ${req.method} ${req.path} not found` }
    };
  }
}
