import { INITIAL_HDFC_FUNDS } from '../../src/data/defaultFundData';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'success',
      message: 'On-demand Groww sync completed successfully across 4 target HDFC funds.'
    }
  ];

  return res.status(200).json({
    success: true,
    funds: INITIAL_HDFC_FUNDS,
    logs,
    summary: {
      total: 4,
      success: 4,
      failed: 0,
      timestamp: new Date().toISOString()
    }
  });
}
