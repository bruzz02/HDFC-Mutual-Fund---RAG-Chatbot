import { z } from 'zod';

export const FundHoldingSchema = z.object({
  company_name: z.string().min(1),
  sector_name: z.string().default('Other'),
  instrument_name: z.string().default('Equity'),
  market_value: z.number().optional().nullable(),
  corpus_per: z.number().min(0).max(100),
  stock_search_id: z.string().optional().nullable()
});

export type FundHolding = z.infer<typeof FundHoldingSchema>;

export const FundReturnsSchema = z.object({
  return1d: z.number().optional().nullable(),
  return1w: z.number().optional().nullable(),
  return1m: z.number().optional().nullable(),
  return3m: z.number().optional().nullable(),
  return6m: z.number().optional().nullable(),
  return1y: z.number().optional().nullable(),
  return2y: z.number().optional().nullable(),
  return3y: z.number().optional().nullable(),
  return5y: z.number().optional().nullable(),
  return7y: z.number().optional().nullable(),
  return10y: z.number().optional().nullable(),
  return_since_created: z.number().optional().nullable(),
  cat_return1y: z.number().optional().nullable(),
  cat_return3y: z.number().optional().nullable(),
  cat_return5y: z.number().optional().nullable()
});

export type FundReturns = z.infer<typeof FundReturnsSchema>;

export const SectorAllocationSchema = z.object({
  sector: z.string(),
  percentage: z.number().min(0).max(100)
});

export type SectorAllocation = z.infer<typeof SectorAllocationSchema>;

export const GrowwFundRecordSchema = z.object({
  id: z.string().min(1),
  search_id: z.string().min(1),
  url: z.string().url(),
  scheme_name: z.string().min(1),
  category: z.string().min(1),
  sub_category: z.string().min(1),
  fund_house: z.string().min(1),
  fund_manager: z.string().min(1),
  launch_date: z.string(),
  aum: z.number().positive(),
  nav: z.number().positive(),
  nav_date: z.string().min(1),
  expense_ratio: z.number().nonnegative(),
  exit_load: z.string(),
  lock_in: z.string().nullable(),
  benchmark_name: z.string(),
  risk: z.string(),
  min_investment_amount: z.number().nonnegative(),
  min_sip_investment: z.number().nonnegative(),
  crisil_rating: z.number().optional().nullable(),
  groww_rating: z.number().optional().nullable(),
  description: z.string().optional(),
  returns: FundReturnsSchema,
  holdings: z.array(FundHoldingSchema),
  sector_allocation: z.array(SectorAllocationSchema),
  extracted_at: z.string(),
  ingestion_status: z.enum(['success', 'failed', 'fallback_applied'])
});

export type GrowwFundRecord = z.infer<typeof GrowwFundRecordSchema>;

export const TargetFundConfigSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  expectedName: z.string(),
  subCategory: z.enum(['Large Cap', 'Mid Cap', 'Small Cap', 'ELSS'])
});

export type TargetFundConfig = z.infer<typeof TargetFundConfigSchema>;
