import { CascadeOrchestrator } from './cascade_orchestrator';
import { CascadeReport, CascadeTriggerType } from './schema';

export class CronScheduler {
  private orchestrator: CascadeOrchestrator;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isScheduled: boolean = false;

  constructor(orchestrator?: CascadeOrchestrator) {
    this.orchestrator = orchestrator ?? new CascadeOrchestrator();
  }

  getOrchestrator(): CascadeOrchestrator {
    return this.orchestrator;
  }

  /**
   * Starts periodic polling / scheduler.
   */
  startScheduler(intervalMs: number = 3600000): void {
    if (this.isScheduled) return;
    this.isScheduled = true;
    this.intervalTimer = setInterval(async () => {
      try {
        await this.orchestrator.executeCascade('cron_daily_nav');
      } catch (err) {
        console.error('Scheduled cascade run failed:', err);
      }
    }, intervalMs);
  }

  stopScheduler(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isScheduled = false;
  }

  /**
   * Triggers an immediate cascade.
   */
  async triggerNow(triggerType: CascadeTriggerType = 'manual'): Promise<CascadeReport> {
    return this.orchestrator.executeCascade(triggerType);
  }
}
