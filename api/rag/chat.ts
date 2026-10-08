import { processRAGQuery } from '../../server/ragEngine';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // retain original
      }
    }
    body = (typeof body === 'object' && body !== null) ? body : {};

    const message = body.message || body.query || body.prompt || req.query?.message || req.query?.q;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message query is required' });
    }

    const response = await processRAGQuery(message);
    return res.status(200).json(response);
  } catch (err: any) {
    console.error('Vercel API /api/rag/chat error:', err);
    return res.status(500).json({ error: err?.message || 'RAG query processing failed' });
  }
}
