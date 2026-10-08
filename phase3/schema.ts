import { z } from 'zod';
import { ChunkTypeEnum, ChunkMetadataSchema } from '../phase2/schema';

export const VectorDocumentSchema = z.object({
  id: z.string().min(1), // chunk_id
  fund_id: z.string().min(1),
  fund_name: z.string().min(1),
  chunk_type: ChunkTypeEnum,
  title: z.string().min(1),
  content: z.string().min(10),
  source_url: z.string().url(),
  token_count: z.number().positive(),
  embedding: z.array(z.number()).length(768), // 768-dimensional dense vector
  metadata: ChunkMetadataSchema,
  indexed_at: z.string()
});

export type VectorDocument = z.infer<typeof VectorDocumentSchema>;

export const SearchFilterSchema = z.object({
  category: z.string().optional(),
  sub_category: z.string().optional(),
  chunk_type: ChunkTypeEnum.optional(),
  fund_id: z.string().optional()
});

export type SearchFilter = z.infer<typeof SearchFilterSchema>;

export const DenseSearchResultSchema = z.object({
  document: VectorDocumentSchema,
  cosineScore: z.number().min(-1).max(1)
});

export type DenseSearchResult = z.infer<typeof DenseSearchResultSchema>;

export const SparseSearchResultSchema = z.object({
  document: VectorDocumentSchema,
  bm25Score: z.number().nonnegative(),
  matchedTerms: z.array(z.string())
});

export type SparseSearchResult = z.infer<typeof SparseSearchResultSchema>;

export const HybridSearchResultSchema = z.object({
  document: VectorDocumentSchema,
  hybridScore: z.number().nonnegative(),
  denseRank: z.number().int().nonnegative(),
  sparseRank: z.number().int().nonnegative(),
  scoreBreakdown: z.object({
    denseScore: z.number(),
    sparseScore: z.number()
  })
});

export type HybridSearchResult = z.infer<typeof HybridSearchResultSchema>;

export const IndexingSummarySchema = z.object({
  totalDocumentsIndexed: z.number(),
  vectorDimension: z.number(),
  sparseVocabularySize: z.number(),
  indexDurationMs: z.number(),
  timestamp: z.string()
});

export type IndexingSummary = z.infer<typeof IndexingSummarySchema>;
