import { ScoredCandidate, ProcessedQuery } from './schema';

export class ContextBuilder {
  /**
   * Assembles prompt-ready context from pristine retrieved chunks.
   * Includes strict citation headers, Groww URL attribution, and metadata badges.
   */
  static buildContextMarkdown(
    candidates: ScoredCandidate[],
    processedQuery: ProcessedQuery
  ): string {
    if (candidates.length === 0) {
      return 'No relevant fund context could be retrieved for this query.';
    }

    const sections: string[] = [];
    sections.push(`### Retrieved Financial Context (${candidates.length} verified chunks)`);
    sections.push(`*Query Intent:* \`${processedQuery.intent.toUpperCase()}\` | *Target Categories:* ${processedQuery.targetSubCategories.join(', ') || 'All HDFC Funds'}\n`);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const doc = c.document;

      const header = `[Context Chunk ${i + 1}] ${doc.title} (Relevance Score: ${c.rerankScore ?? 'N/A'}, RRF Rank: #${c.denseRank ?? 'N/A'}/${c.sparseRank ?? 'N/A'})`;
      const metadataBadge = `- Fund: **${doc.fund_name}** | Sub-Category: **${doc.metadata.sub_category}** | Type: \`${doc.chunk_type}\``;
      const sourceBadge = `- Source URL: [${doc.source_url}](${doc.source_url})`;
      const rationaleBadge = c.relevanceRationale ? `- Selection Rationale: *${c.relevanceRationale}*` : '';

      const chunkBody = doc.content.trim();

      sections.push(
        `${header}\n${metadataBadge}\n${sourceBadge}${rationaleBadge ? '\n' + rationaleBadge : ''}\n\n\`\`\`\n${chunkBody}\n\`\`\`\n`
      );
    }

    return sections.join('\n---\n\n');
  }
}
