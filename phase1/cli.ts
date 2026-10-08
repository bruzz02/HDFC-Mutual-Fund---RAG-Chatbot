import { Phase1IngestionPipeline } from './index';

async function main() {
  console.log('===============================================================');
  console.log('       MUTUAL FUND RAG - PHASE 1 INGESTION ENGINE CLI         ');
  console.log('===============================================================');
  console.log('Targeting 4 Groww HDFC Mutual Fund URLs:\n');

  const pipeline = new Phase1IngestionPipeline();
  const startTime = Date.now();

  try {
    const result = await pipeline.ingestAll();

    console.log('INGESTION SUMMARY:');
    console.log(`- Total Funds Processed: ${result.summary.total}`);
    console.log(`- Successful Fetches:    ${result.summary.success}`);
    console.log(`- Total Execution Time:  ${result.summary.totalDurationMs}ms\n`);

    console.log('---------------------------------------------------------------');
    console.log('EXTRACTED & NORMALIZED SCHEMES:');
    console.log('---------------------------------------------------------------');

    for (const fund of result.records) {
      console.log(`\nScheme Name:    ${fund.scheme_name}`);
      console.log(`Category:       ${fund.category} / ${fund.sub_category}`);
      console.log(`Current NAV:    ₹${fund.nav} (as of ${fund.nav_date})`);
      console.log(`Fund AUM:       ₹${fund.aum.toLocaleString()} Crores`);
      console.log(`Expense Ratio:  ${fund.expense_ratio}%`);
      console.log(`5-Year CAGR:    ${fund.returns.return5y ? fund.returns.return5y + '%' : 'N/A'}`);
      console.log(`Exit Load:      ${fund.exit_load}`);
      console.log(`Lock-in:        ${fund.lock_in || 'None'}`);
      console.log(`Holdings Count: ${fund.holdings.length}`);
      console.log(`Top 3 Holdings: ${fund.holdings.slice(0, 3).map(h => `${h.company_name} (${h.corpus_per}%)`).join(', ')}`);
      console.log(`Source URL:     ${fund.url}`);
    }

    console.log('\n===============================================================');
    console.log('PHASE 1 INGESTION COMPLETED SUCCESSFULLY');
    console.log('===============================================================');
  } catch (err: any) {
    console.error('\nPhase 1 Ingestion failed:', err.message);
    process.exit(1);
  }
}

main();
