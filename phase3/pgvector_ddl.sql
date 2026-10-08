-- ============================================================================
-- Phase 3: Production PostgreSQL 16 + pgvector Hybrid Schema
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create mutual_fund_chunks table
CREATE TABLE IF NOT EXISTS mutual_fund_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id VARCHAR(120) UNIQUE NOT NULL,
    fund_id VARCHAR(100) NOT NULL,
    fund_name VARCHAR(255) NOT NULL,
    chunk_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    token_count INT NOT NULL,
    source_url TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    metadata JSONB NOT NULL,
    embedding vector(768) NOT NULL,
    content_tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content || ' ' || (metadata->>'sub_category'))
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HNSW Index for Dense Vector Cosine Distance
-- m = 16 (number of bidirectional links per node), ef_construction = 64 (search depth during build)
CREATE INDEX IF NOT EXISTS idx_mf_chunks_hnsw 
ON mutual_fund_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- 4. GIN Index for Sparse Keyword / BM25 Search
CREATE INDEX IF NOT EXISTS idx_mf_chunks_tsv 
ON mutual_fund_chunks 
USING gin (content_tsv);

-- 5. B-Tree / GIN Indexes for Metadata Pre-Filtering
CREATE INDEX IF NOT EXISTS idx_mf_chunks_fund_id ON mutual_fund_chunks (fund_id);
CREATE INDEX IF NOT EXISTS idx_mf_chunks_chunk_type ON mutual_fund_chunks (chunk_type);
CREATE INDEX IF NOT EXISTS idx_mf_chunks_metadata ON mutual_fund_chunks USING gin (metadata);

-- 6. Sample Hybrid Search Query with RRF (Reciprocal Rank Fusion) in SQL:
/*
WITH dense_search AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1) as dense_rank
    FROM mutual_fund_chunks
    WHERE metadata->>'sub_category' = 'Mid Cap' -- Pre-filtering
    LIMIT 20
),
sparse_search AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(content_tsv, plainto_tsquery('english', $2)) DESC) as sparse_rank
    FROM mutual_fund_chunks
    WHERE content_tsv @@ plainto_tsquery('english', $2)
    LIMIT 20
)
SELECT 
    c.chunk_id,
    c.title,
    c.content,
    c.source_url,
    COALESCE(1.0 / (60 + d.dense_rank), 0.0) + COALESCE(1.0 / (60 + s.sparse_rank), 0.0) AS rrf_score
FROM dense_search d
FULL OUTER JOIN sparse_search s ON d.id = s.id
JOIN mutual_fund_chunks c ON c.id = COALESCE(d.id, s.id)
ORDER BY rrf_score DESC
LIMIT 5;
*/
