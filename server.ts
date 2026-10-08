import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { app } from './server/app';
import { executeAutomatedPipelineCascade, startBackgroundScheduler } from './server/scheduler';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

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
