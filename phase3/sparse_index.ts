export interface BM25DocEntry {
  id: string;
  terms: Map<string, number>;
  length: number;
}

export class BM25SparseIndex {
  private k1: number;
  private b: number;
  private documents: Map<string, BM25DocEntry> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private totalDocLength: number = 0;

  private stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
  ]);

  constructor(k1: number = 1.2, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9%₹]+/)
      .filter(t => t.length > 1 && !this.stopwords.has(t));
  }

  addDocument(id: string, text: string): void {
    const tokens = this.tokenize(text);
    const termMap = new Map<string, number>();

    for (const token of tokens) {
      termMap.set(token, (termMap.get(token) || 0) + 1);

      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(id);
    }

    if (this.documents.has(id)) {
      this.totalDocLength -= this.documents.get(id)!.length;
    }

    this.documents.set(id, {
      id,
      terms: termMap,
      length: tokens.length
    });

    this.totalDocLength += tokens.length;
  }

  getVocabularySize(): number {
    return this.invertedIndex.size;
  }

  getDocumentCount(): number {
    return this.documents.size;
  }

  search(query: string, topK: number = 10): Array<{ id: string; score: number; matchedTerms: string[] }> {
    const queryTokens = Array.from(new Set(this.tokenize(query)));
    if (queryTokens.length === 0 || this.documents.size === 0) return [];

    const N = this.documents.size;
    const avgdl = this.totalDocLength / N;
    const scores = new Map<string, { score: number; matched: string[] }>();

    for (const qTerm of queryTokens) {
      const posting = this.invertedIndex.get(qTerm);
      if (!posting) continue;

      const n = posting.size;
      // Lucene / standard BM25 IDF
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));

      for (const docId of posting) {
        const doc = this.documents.get(docId)!;
        const tf = doc.terms.get(qTerm) || 0;

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / avgdl));
        const termScore = idf * (numerator / denominator);

        if (!scores.has(docId)) {
          scores.set(docId, { score: 0, matched: [] });
        }
        const curr = scores.get(docId)!;
        curr.score += termScore;
        curr.matched.push(qTerm);
      }
    }

    return Array.from(scores.entries())
      .map(([id, val]) => ({
        id,
        score: Number(val.score.toFixed(4)),
        matchedTerms: val.matched
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
