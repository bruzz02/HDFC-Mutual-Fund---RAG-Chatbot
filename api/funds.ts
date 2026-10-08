import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    funds: INITIAL_HDFC_FUNDS,
    count: INITIAL_HDFC_FUNDS.length,
    timestamp: new Date().toISOString()
  });
}
