import { CascadeOrchestrator } from '../cascade_orchestrator';
import { CronScheduler } from '../cron_scheduler';
import { CascadeReportSchema, SchedulerStatusSchema } from '../schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase6Tests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<void> | void) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message
      });
    }
  };

  // -------------------------------------------------------------
  // UNIT TESTS: Schema & Locking
  // -------------------------------------------------------------

  await runTest('Unit 1: SchedulerStatusSchema validates initial scheduler status', () => {
    const orchestrator = new CascadeOrchestrator();
    const status = orchestrator.getStatus();
    SchedulerStatusSchema.parse(status);

    if (status.isLocked) throw new Error('Orchestrator should not be locked initially');
    if (!status.cronCadence.dailyNavSync.includes('23:30')) throw new Error('Missing daily NAV cadence');
  });

  await runTest('Unit 2: Mutex lock prevents concurrent overlapping cascade executions', async () => {
    const orchestrator = new CascadeOrchestrator();

    // Start cascade 1 in background
    const p1 = orchestrator.executeCascade('manual', { mockPhase1: true });

    // Immediate second attempt should fail with lock error
    let lockedRejected = false;
    try {
      await orchestrator.executeCascade('manual', { mockPhase1: true });
    } catch (err: any) {
      if (err.message.includes('locked')) {
        lockedRejected = true;
      }
    }

    await p1; // Wait for first to complete

    if (!lockedRejected) {
      throw new Error('Concurrent cascade run was not prevented by mutex lock');
    }
  });

  await runTest('Unit 3: Mutex lock is properly released after cascade completes', async () => {
    const orchestrator = new CascadeOrchestrator();
    await orchestrator.executeCascade('manual', { mockPhase1: true });

    const status = orchestrator.getStatus();
    if (status.isLocked) {
      throw new Error('Lock was not released after cascade completion');
    }
  });

  await runTest('Unit 4: Step execution logs records for all 7 pipeline steps', async () => {
    const orchestrator = new CascadeOrchestrator();
    const report = await orchestrator.executeCascade('manual', { mockPhase1: true });

    if (report.steps.length !== 7) {
      throw new Error(`Expected exactly 7 steps, got ${report.steps.length}`);
    }

    const stepNames = report.steps.map(s => s.stepName);
    if (!stepNames.some(s => s.includes('Phase 1'))) throw new Error('Missing Phase 1 step');
    if (!stepNames.some(s => s.includes('Delta Evaluation'))) throw new Error('Missing Delta step');
    if (!stepNames.some(s => s.includes('Phase 2'))) throw new Error('Missing Phase 2 step');
    if (!stepNames.some(s => s.includes('Phase 3'))) throw new Error('Missing Phase 3 step');
    if (!stepNames.some(s => s.includes('Cache Invalidation'))) throw new Error('Missing Cache step');
    if (!stepNames.some(s => s.includes('Sanity Evaluation'))) throw new Error('Missing Sanity step');
    if (!stepNames.some(s => s.includes('Telemetry'))) throw new Error('Missing Telemetry step');
  });

  await runTest('Unit 5: Step durations are measured and strictly non-negative', async () => {
    const orchestrator = new CascadeOrchestrator();
    const report = await orchestrator.executeCascade('manual', { mockPhase1: true });

    for (const step of report.steps) {
      if (step.durationMs < 0) {
        throw new Error(`Negative duration for step ${step.stepName}: ${step.durationMs}`);
      }
    }
  });

  await runTest('Unit 6: Cache invalidation marks status and records cycle in report', async () => {
    const orchestrator = new CascadeOrchestrator();
    const report1 = await orchestrator.executeCascade('manual', { mockPhase1: true });
    const report2 = await orchestrator.executeCascade('manual', { mockPhase1: true });

    if (!report1.cacheInvalidated || !report2.cacheInvalidated) {
      throw new Error('Cache invalidation flag not set in reports');
    }
  });

  await runTest('Unit 7: Synthetic RAG Sanity Evaluation verifies end-to-end question answerability', async () => {
    const orchestrator = new CascadeOrchestrator();
    const report = await orchestrator.executeCascade('manual', { mockPhase1: true });

    if (!report.sanityCheckPassed) {
      throw new Error('Sanity check evaluation failed during cascade');
    }
  });

  await runTest('Unit 8: CronScheduler starts and stops cleanly without dangling timers', () => {
    const scheduler = new CronScheduler();
    scheduler.startScheduler(60000);
    scheduler.stopScheduler();
  });

  await runTest('Unit 9: CronScheduler triggerNow initiates immediate manual cascade', async () => {
    const scheduler = new CronScheduler();
    const report = await scheduler.triggerNow('cron_daily_nav');

    if (report.trigger !== 'cron_daily_nav') {
      throw new Error(`Expected trigger cron_daily_nav, got ${report.trigger}`);
    }
    if (report.overallStatus !== 'success') {
      throw new Error(`Expected status success, got ${report.overallStatus}`);
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: Cross-Phase Cascade Execution
  // -------------------------------------------------------------

  await runTest('Integration 10: Full cascade processes all 4 funds and syncs 16 chunks', async () => {
    const orchestrator = new CascadeOrchestrator();
    const report = await orchestrator.executeCascade('manual', { mockPhase1: true });

    if (report.fundsProcessed !== 4) {
      throw new Error(`Expected 4 funds processed, got ${report.fundsProcessed}`);
    }
    if (report.chunksSynced !== 16) {
      throw new Error(`Expected 16 chunks synced, got ${report.chunksSynced}`);
    }
    CascadeReportSchema.parse(report);
  });

  await runTest('Integration 11: Orchestrator increments totalSuccessfulRuns counter', async () => {
    const orchestrator = new CascadeOrchestrator();
    const initialCount = orchestrator.getStatus().totalSuccessfulRuns;

    await orchestrator.executeCascade('manual', { mockPhase1: true });
    await orchestrator.executeCascade('manual', { mockPhase1: true });

    const newCount = orchestrator.getStatus().totalSuccessfulRuns;
    if (newCount !== initialCount + 2) {
      throw new Error(`Expected successful runs count to increment by 2, got ${newCount - initialCount}`);
    }
  });

  await runTest('Integration 12: Last run report is preserved and retrievable via getStatus()', async () => {
    const orchestrator = new CascadeOrchestrator();
    const report = await orchestrator.executeCascade('manual', { mockPhase1: true });

    const status = orchestrator.getStatus();
    if (!status.lastRunReport || status.lastRunReport.runId !== report.runId) {
      throw new Error('Last run report not accurately preserved in status');
    }
  });

  return results;
}
