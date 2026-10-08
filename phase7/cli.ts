import { ApiGateway } from './api_gateway';

async function main() {
  console.log('===============================================================');
  console.log('       MUTUAL FUND RAG - PHASE 7 BACKEND API GATEWAY           ');
  console.log('===============================================================\n');

  const gateway = new ApiGateway();

  console.log('Testing GET /api/health...');
  const healthRes = await gateway.handleRequest({ path: '/api/health', method: 'GET' });
  console.log(`Status Code: ${healthRes.statusCode} | Body:`, healthRes.body);

  console.log('\nTesting GET /api/funds...');
  const fundsRes = await gateway.handleRequest({ path: '/api/funds', method: 'GET' });
  console.log(`Status Code: ${fundsRes.statusCode} | Total Funds: ${fundsRes.body.count}`);

  console.log('\nTesting POST /api/rag/chat (Standard JSON)...');
  const chatRes = await gateway.handleRequest({
    path: '/api/rag/chat',
    method: 'POST',
    body: { message: 'What is the expense ratio of HDFC Mid Cap?' }
  });
  console.log(`Status Code: ${chatRes.statusCode} | Confidence: ${chatRes.body.factCheckReport.confidenceScore * 100}%`);
  console.log(`Answer Preview: ${chatRes.body.finalAnswerMarkdown.slice(0, 100)}...`);

  console.log('\nTesting POST /api/rag/chat (Server-Sent Events Stream)...');
  const streamRes = await gateway.handleRequest({
    path: '/api/rag/chat',
    method: 'POST',
    body: { message: 'What is the lock-in period for ELSS?', stream: true }
  });
  console.log(`Content-Type: ${streamRes.headers['Content-Type']} | SSE Output bytes: ${streamRes.body.length}`);

  console.log('\n===============================================================');
  console.log('PHASE 7 API GATEWAY TESTING COMPLETE');
  console.log('===============================================================');
}

main();
