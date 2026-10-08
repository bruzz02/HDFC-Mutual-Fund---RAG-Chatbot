import { z } from 'zod';

export const ActiveTabSchema = z.enum(['architecture', 'phase1', 'compare', 'chat']);
export type ActiveTab = z.infer<typeof ActiveTabSchema>;

export const QuickPromptChipSchema = z.object({
  id: z.string(),
  label: z.string(),
  query: z.string(),
  category: z.enum(['returns', 'costs', 'comparison', 'tax_elss', 'holdings'])
});
export type QuickPromptChip = z.infer<typeof QuickPromptChipSchema>;

export const UiNotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string(),
  message: z.string(),
  timestamp: z.string()
});
export type UiNotification = z.infer<typeof UiNotificationSchema>;

export const ComparisonMatrixColumnSchema = z.object({
  fundId: z.string(),
  fundName: z.string(),
  category: z.string(),
  nav: z.string(),
  aum: z.string(),
  expenseRatio: z.string(),
  return1y: z.string(),
  return3y: z.string(),
  return5y: z.string(),
  lockIn: z.string(),
  exitLoad: z.string()
});
export type ComparisonMatrixColumn = z.infer<typeof ComparisonMatrixColumnSchema>;
