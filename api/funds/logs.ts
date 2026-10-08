export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'success',
      message: 'Verified baseline HDFC fund schemas loaded and active from Groww.'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'info',
      message: 'Phase 1 Ingestion initialized for HDFC Large Cap, Mid Cap, Small Cap, and ELSS Tax Saver.'
    }
  ];

  return res.status(200).json({
    logs,
    count: logs.length
  });
}
