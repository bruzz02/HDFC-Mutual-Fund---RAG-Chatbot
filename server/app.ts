import express from 'express';
import dotenv from 'dotenv';
import { getActiveFunds, getLatestLogs, runPhase1FullIngestion, scrapeSingleFund, TARGET_GROWW_URLS } from './scraper';
import { generateChunksFromFunds } from '../src/utils/ragChunker';
import { processRAGQuery } from './ragEngine';
import { ARCHITECTURE_PHASES } from '../src/data/architectureSpecs';
import { executeAutomatedPipelineCascade, getSchedulerStatus } from './scheduler';
import { Phase4RetrievalEngine } from '../phase4/index';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '10mb' }));

// CORS configuration for local and deployed environments (Vercel)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all active ingested funds
apiRouter.get('/funds', (req, res) => {
  const funds = getActiveFunds();
  res.json({
    funds,
    targetUrls: TARGET_GROWW_URLS,
    totalFunds: funds.length,
    lastUpdated: funds[0]?.last_ingested_at || new Date().toISOString()
  });
});

// Trigger Phase 1 Live Ingestion
apiRouter.post('/funds/ingest', async (req, res) => {
  try {
    const { fundId } = req.body || {};
    if (fundId) {
      const target = TARGET_GROWW_URLS.find(t => t.id === fundId);
      if (!target) {
        return res.status(404).json({ error: 'Fund target not found' });
      }
      const result = await scrapeSingleFund(target.url, target.id);
      return res.json({ success: true, fund: result.fund, logs: result.logs });
    }

    // Full batch ingestion of all 4 funds
    const result = await runPhase1FullIngestion();
    res.json({ success: true, funds: result.funds, logs: result.logs });
  } catch (err: any) {
    console.error('Ingestion error:', err);
    res.status(500).json({ error: err.message || 'Ingestion failed' });
  }
});

// Get ingestion logs
apiRouter.get('/funds/logs', (req, res) => {
  res.json({ logs: getLatestLogs() });
});

// Get RAG Chunks
apiRouter.get('/funds/chunks', (req, res) => {
  const funds = getActiveFunds();
  const chunks = generateChunksFromFunds(funds);
  res.json({ chunks, totalChunks: chunks.length });
});

// Scheduler and Automated Pipeline Cascade
apiRouter.get('/scheduler/status', (req, res) => {
  res.json(getSchedulerStatus());
});

apiRouter.post('/scheduler/trigger', async (req, res) => {
  try {
    const report = await executeAutomatedPipelineCascade('manual');
    res.json({ success: true, report });
  } catch (err: any) {
    console.error('Scheduler cascade error:', err);
    res.status(500).json({ error: err.message || 'Pipeline cascade failed' });
  }
});

// Query RAG Chatbot
apiRouter.post('/rag/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message query is required' });
    }
    const response = await processRAGQuery(message);
    res.json(response);
  } catch (err: any) {
    console.error('RAG Query error:', err);
    res.status(500).json({ error: err.message || 'RAG query failed' });
  }
});

// Phase 4 Multi-Stage Retrieval API
apiRouter.post('/phase4/retrieve', async (req, res) => {
  try {
    const { query, topK } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const engine = new Phase4RetrievalEngine();
    const funds = getActiveFunds();
    const chunks = generateChunksFromFunds(funds);
    await engine.indexChunks(chunks as any);
    const result = await engine.retrieve(query, topK ? Number(topK) : 4);
    res.json(result);
  } catch (err: any) {
    console.error('Phase 4 retrieval error:', err);
    res.status(500).json({ error: err.message || 'Retrieval failed' });
  }
});

// Get Phase-wise Architecture Specs
apiRouter.get('/architecture', (req, res) => {
  res.json({ phases: ARCHITECTURE_PHASES });
});

// Mount router under /api and root to support Vercel serverless rewrites and direct express routing
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
