import { CascadeOrchestrator } from './cascade_orchestrator';

async function main() {
  console.log('===============================================================');
  console.log('    MUTUAL FUND RAG - PHASE 6 PIPELINE CASCADE SCHEDULER       ');
  console.log('===============================================================\n');

  const orchestrator = new CascadeOrchestrator();

  console.log('Scheduler Initial Status:');
  const initialStatus = orchestrator.getStatus();
  console.log(`- Daily NAV Sync:      ${initialStatus.cronCadence.dailyNavSync}`);
  console.log(`- Monthly Holdings:    ${initialStatus.cronCadence.monthlyHoldingsSync}`);
  console.log(`- Currently Locked:    ${initialStatus.isLocked ? 'YES' : 'NO'}\n`);

  console.log('Triggering automated transactional cross-phase cascade...\n');
  const report = await orchestrator.executeCascade('manual', { mockPhase1: true });

  console.log('---------------------------------------------------------------');
  console.log('CASCADE EXECUTION REPORT:');
  console.log('---------------------------------------------------------------');
  console.log(`Run ID:              ${report.runId}`);
  console.log(`Overall Status:      [${report.overallStatus.toUpperCase()}]`);
  console.log(`Trigger:             ${report.trigger}`);
  console.log(`Total Duration:      ${report.totalDurationMs}ms`);
  console.log(`Funds Processed:     ${report.fundsProcessed}`);
  console.log(`Chunks Synced:       ${report.chunksSynced}`);
  console.log(`Sanity Check Passed: ${report.sanityCheckPassed ? 'YES' : 'NO'}`);
  console.log(`Cache Invalidation:  ${report.cacheInvalidated ? 'COMPLETED' : 'NO'}\n`);

  console.log('STEP DETAILS:');
  for (const step of report.steps) {
    console.log(`  [Step ${step.stepNumber}] [${step.status.toUpperCase()}] ${step.stepName} (${step.durationMs}ms)`);
    console.log(`         ${step.details}`);
  }

  console.log('\n===============================================================');
  console.log('PHASE 6 CASCADE RUN COMPLETED SUCCESSFULLY');
  console.log('===============================================================');
}

main();
