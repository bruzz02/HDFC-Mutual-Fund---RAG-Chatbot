import { SemanticChunk } from './schema';
import fs from 'fs';
import path from 'path';

export interface ChunkDiff {
  chunkId: string;
  fundId: string;
  isNew: boolean;
  hasChanged: boolean;
  oldHash?: string;
  newHash?: string;
}

export class Phase2Storage {
  private dataDir: string;
  private manifestFile: string;

  constructor(customDir?: string) {
    this.dataDir = customDir || path.resolve(process.cwd(), 'data_snapshots');
    this.manifestFile = path.resolve(this.dataDir, 'latest_phase2_chunks.json');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        // Ignore
      }
    }
  }

  readChunks(): SemanticChunk[] {
    try {
      if (fs.existsSync(this.manifestFile)) {
        const raw = fs.readFileSync(this.manifestFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read phase 2 chunks manifest:', err);
    }
    return [];
  }

  writeChunks(chunks: SemanticChunk[]): void {
    try {
      this.ensureDirectory();
      fs.writeFileSync(this.manifestFile, JSON.stringify(chunks, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write phase 2 chunks manifest:', err);
    }
  }

  computeChunkDiff(oldChunks: SemanticChunk[], newChunks: SemanticChunk[]): ChunkDiff[] {
    const diffs: ChunkDiff[] = [];

    for (const n of newChunks) {
      const old = oldChunks.find((o) => o.chunk_id === n.chunk_id);
      if (!old) {
        diffs.push({
          chunkId: n.chunk_id,
          fundId: n.fund_id,
          isNew: true,
          hasChanged: true,
          newHash: n.content_hash
        });
        continue;
      }

      const hasChanged = old.content_hash !== n.content_hash;
      diffs.push({
        chunkId: n.chunk_id,
        fundId: n.fund_id,
        isNew: false,
        hasChanged,
        oldHash: old.content_hash,
        newHash: n.content_hash
      });
    }

    return diffs;
  }
}
