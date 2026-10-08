import { z } from 'zod';

export const CascadeTriggerTypeSchema = z.enum(['manual', 'cron_daily_nav', 'cron_monthly_holdings', 'webhook']);
export type CascadeTriggerType = z.infer<typeof CascadeTriggerTypeSchema>;

export const StepStatusSchema = z.enum(['pending', 'running', 'completed', 'skipped', 'failed']);
export type StepStatus = z.infer<typeof StepStatusSchema>;

export const CascadeStepRecordSchema = z.object({
  stepNumber: z.number(),
  stepName: z.string(),
  status: StepStatusSchema,
  details: z.string(),
  durationMs: z.number()
});
export type CascadeStepRecord = z.infer<typeof CascadeStepRecordSchema>;

export const CascadeReportSchema = z.object({
  runId: z.string(),
  trigger: CascadeTriggerTypeSchema,
  startedAt: z.string(),
  completedAt: z.string(),
  totalDurationMs: z.number(),
  overallStatus: z.enum(['success', 'partial_failure', 'failed']),
  steps: z.array(CascadeStepRecordSchema),
  fundsProcessed: z.number(),
  chunksSynced: z.number(),
  cacheInvalidated: z.boolean(),
  sanityCheckPassed: z.boolean(),
  diffDetected: z.boolean()
});
export type CascadeReport = z.infer<typeof CascadeReportSchema>;

export const SchedulerStatusSchema = z.object({
  isRunning: z.boolean(),
  isLocked: z.boolean(),
  cronCadence: z.object({
    dailyNavSync: z.string(),
    monthlyHoldingsSync: z.string()
  }),
  lastRunReport: CascadeReportSchema.nullable(),
  totalSuccessfulRuns: z.number(),
  totalFailedRuns: z.number()
});
export type SchedulerStatus = z.infer<typeof SchedulerStatusSchema>;
