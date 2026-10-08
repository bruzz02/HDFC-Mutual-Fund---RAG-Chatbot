import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getActiveFunds, getLatestLogs, runPhase1FullIngestion, scrapeSingleFund, TARGET_GROWW_URLS } from './server/scraper';
import { generateChunksFromFunds } from './src/utils/ragChunker';
import { processRAGQuery } from './server/ragEngine';
import { ARCHITECTURE_PHASES } from './src/data/architectureSpecs';
import { executeAutomatedPipelineCascade, getSchedulerStatus, startBackgroundScheduler } from './server/scheduler';
import { Phase4RetrievalEngine } from './phase4/index';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get all active ingested funds
  app.get('/api/funds', (req, res) => {
    const funds = getActiveFunds();
    res.json({
      funds,
      targetUrls: TARGET_GROWW_URLS,
      totalFunds: funds.length,
      lastUpdated: funds[0]?.last_ingested_at || new Date().toISOString()
    });
  });

  // Trigger Phase 1 Live Ingestion
  app.post('/api/funds/ingest', async (req, res) => {
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
  app.get('/api/funds/logs', (req, res) => {
    res.json({ logs: getLatestLogs() });
  });

  // Get RAG Chunks
  app.get('/api/funds/chunks', (req, res) => {
    const funds = getActiveFunds();
    const chunks = generateChunksFromFunds(funds);
    res.json({ chunks, totalChunks: chunks.length });
  });

  // Scheduler and Automated Pipeline Cascade
  app.get('/api/scheduler/status', (req, res) => {
    res.json(getSchedulerStatus());
  });

  app.post('/api/scheduler/trigger', async (req, res) => {
    try {
      const report = await executeAutomatedPipelineCascade('manual');
      res.json({ success: true, report });
    } catch (err: any) {
      console.error('Scheduler cascade error:', err);
      res.status(500).json({ error: err.message || 'Pipeline cascade failed' });
    }
  });

  // Query RAG Chatbot
  app.post('/api/rag/chat', async (req, res) => {
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
  app.post('/api/phase4/retrieve', async (req, res) => {
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
  app.get('/api/architecture', (req, res) => {
    res.json({ phases: ARCHITECTURE_PHASES });
  });

  // Mount Vite middleware in development or static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mutual Fund RAG Architect Server listening on port ${PORT}`);
    startBackgroundScheduler(30);

    // Initial background live data sync from Groww
    setTimeout(() => {
      console.log('[Startup] Executing background live sync from Groww...');
      executeAutomatedPipelineCascade('cron_daily_nav')
        .then((report) => {
          console.log(`[Startup] Live ingestion completed: processed ${report.fundsProcessed} funds.`);
        })
        .catch((err) => {
          console.warn('[Startup] Live sync initial run notice:', err?.message || err);
        });
    }, 1500);
  });
}

startServer().catch(err => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
