import chatHandler from './rag/chat';
import fundsHandler from './funds';
import healthHandler from './health';

export default async function handler(req: any, res: any) {
  const url = req.url || '';
  if (url.includes('/rag') || url.includes('/chat')) {
    return chatHandler(req, res);
  }
  if (url.includes('/funds')) {
    return fundsHandler(req, res);
  }
  if (url.includes('/health')) {
    return healthHandler(req, res);
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ok',
    message: 'Route handled',
    path: url,
    timestamp: new Date().toISOString()
  });
}
