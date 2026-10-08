import { z } from 'zod';
import { ScoredCandidateSchema, RetrievalResultSchema } from '../phase4/schema';

export const ExtractedFinancialFigureSchema = z.object({
  figure: z.string(),
  numericValue: z.number().nullable(),
  unit: z.enum(['percent', 'inr_nav', 'crores_aum', 'years', 'count', 'other']),
  isGrounded: z.boolean(),
  groundedSourceChunkId: z.string().optional()
});
export type ExtractedFinancialFigure = z.infer<typeof ExtractedFinancialFigureSchema>;

export const FactCheckReportSchema = z.object({
  status: z.enum(['passed', 'repaired', 'rejected']),
  totalFiguresChecked: z.number(),
  groundedFiguresCount: z.number(),
  hallucinatedFigures: z.array(z.string()),
  citationsFound: z.array(z.string().url()),
  hasSebiDisclaimer: z.boolean(),
  hasElssLockInNotice: z.boolean(),
  confidenceScore: z.number().min(0).max(1)
});
export type FactCheckReport = z.infer<typeof FactCheckReportSchema>;

export const GuardrailedAnswerSchema = z.object({
  query: z.string(),
  rawModelResponse: z.string(),
  finalAnswerMarkdown: z.string(),
  retrievalMetadata: z.object({
    intent: z.string(),
    chunksUsedCount: z.number(),
    sourceUrls: z.array(z.string().url())
  }),
  factCheckReport: FactCheckReportSchema,
  regulatoryDisclaimer: z.string(),
  latencyMs: z.number(),
  model: z.string()
});
export type GuardrailedAnswer = z.infer<typeof GuardrailedAnswerSchema>;
