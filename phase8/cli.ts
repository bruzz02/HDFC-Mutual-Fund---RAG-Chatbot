import { UiStateManager, DEFAULT_PROMPT_CHIPS } from './ui_state';
import { FinancialUiFormatters } from './formatters';

async function main() {
  console.log('===============================================================');
  console.log('       MUTUAL FUND RAG - PHASE 8 FRONTEND UX & STATE ENGINE    ');
  console.log('===============================================================\n');

  const uiManager = new UiStateManager();
  console.log(`Initial Active Tab: [${uiManager.getActiveTab().toUpperCase()}]`);

  uiManager.setActiveTab('compare');
  console.log(`Updated Active Tab: [${uiManager.getActiveTab().toUpperCase()}]`);

  console.log('\nDefault Financial Quick Prompt Chips:');
  DEFAULT_PROMPT_CHIPS.forEach(c => console.log(`  - [${c.category.toUpperCase()}] ${c.label} -> "${c.query}"`));

  console.log('\n---------------------------------------------------------------');
  console.log('HIGH-DENSITY COMPARISON MATRIX DATA:');
  console.log('---------------------------------------------------------------');

  const matrix = UiStateManager.buildComparisonMatrix();
  for (const col of matrix) {
    console.log(`\nScheme: ${col.fundName}`);
    console.log(`  Category:     ${col.category}`);
    console.log(`  NAV:          ${col.nav}`);
    console.log(`  AUM:          ${col.aum}`);
    console.log(`  TER:          ${col.expenseRatio}`);
    console.log(`  1Y Return:    ${col.return1y}`);
    console.log(`  5Y Return:    ${col.return5y}`);
    console.log(`  Lock-in:      ${col.lockIn}`);
  }

  console.log('\n===============================================================');
  console.log('PHASE 8 FRONTEND STATE TESTING COMPLETE');
  console.log('===============================================================');
}

main();
