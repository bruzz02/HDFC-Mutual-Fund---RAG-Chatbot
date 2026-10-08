import { EvaluationMetrics, EvaluationCaseResult, EvaluationSuiteReport } from './schema';
import { GoldenTestCase } from './golden_dataset';
import { Phase4RetrievalEngine } from '../phase4/index';
import { Phase5GenerationPipeline } from '../phase5/index';

export class RagEvaluator {
  private retrievalEngine: Phase4RetrievalEngine;
  private p5Pipeline: Phase5GenerationPipeline;

  constructor(retrievalEngine?: Phase4RetrievalEngine, p5Pipeline?: Phase5GenerationPipeline) {
    this.retrievalEngine = retrievalEngine ?? new Phase4RetrievalEngine();
    this.p5Pipeline = p5Pipeline ?? new Phase5GenerationPipeline({
      retrievalEngine: this.retrievalEngine,
      generatorOptions: { mode: 'deterministic' }
    });
  }

  /**
   * Computes the RAG Triad metrics for a single test case.
   */
  async evaluateCase(testCase: GoldenTestCase): Promise<EvaluationCaseResult> {
    const startTime = Date.now();

    // 1. Retrieve Chunks
    const retrieval = await this.retrievalEngine.retrieve(testCase.query, 3);

    // 2. Generate Guardrailed Answer
    const answer = await this.p5Pipeline.answer(retrieval, 3);

    // 3. Compute Context Precision
    let relevantChunks = 0;
    for (const chunk of retrieval.topChunks) {
      const doc = chunk.document;
      const isCategoryMatch = testCase.expectedCategory === 'Multi-Fund' || doc.metadata.sub_category === testCase.expectedCategory;
      const hasTermMatch = testCase.expectedKeyTerms.some(t => 
        doc.content.toLowerCase().includes(t.toLowerCase()) || doc.title.toLowerCase().includes(t.toLowerCase())
      );

      if (isCategoryMatch || hasTermMatch) {
        relevantChunks++;
      }
    }
    const contextPrecision = retrieval.topChunks.length > 0
      ? Number((relevantChunks / retrieval.topChunks.length).toFixed(3))
      : 0;

    // 4. Compute Faithfulness
    const faithfulness = answer.factCheckReport.confidenceScore;

    // 5. Compute Answer Relevance
    const answerLower = answer.finalAnswerMarkdown.toLowerCase();
    let termMatches = 0;
    for (const term of testCase.expectedKeyTerms) {
      if (answerLower.includes(term.toLowerCase())) termMatches++;
    }
    const answerRelevance = testCase.expectedKeyTerms.length > 0
      ? Number((termMatches / testCase.expectedKeyTerms.length).toFixed(3))
      : 1.0;

    // 6. Composite Triad Score (0.3 * precision + 0.4 * faithfulness + 0.3 * relevance)
    const compositeRagScore = Number((0.3 * contextPrecision + 0.4 * faithfulness + 0.3 * answerRelevance).toFixed(3));
    const passedThresholds = contextPrecision >= 0.6 && faithfulness >= 0.8 && answerRelevance >= 0.6;

    const latencyMs = Date.now() - startTime;

    return {
      caseId: testCase.id,
      query: testCase.query,
      expectedCategory: testCase.expectedCategory,
      retrievedChunksCount: retrieval.topChunks.length,
      metrics: {
        contextPrecision,
        faithfulness,
        answerRelevance,
        compositeRagScore
      },
      passedThresholds,
      latencyMs
    };
  }

  /**
   * Evaluates an entire suite of golden test cases and computes benchmark averages.
   */
  async evaluateSuite(cases: GoldenTestCase[]): Promise<EvaluationSuiteReport> {
    const results: EvaluationCaseResult[] = [];

    for (const tc of cases) {
      const res = await this.evaluateCase(tc);
      results.push(res);
    }

    const passedCases = results.filter(r => r.passedThresholds).length;
    const avgPrecision = Number((results.reduce((acc, r) => acc + r.metrics.contextPrecision, 0) / results.length).toFixed(3));
    const avgFaithfulness = Number((results.reduce((acc, r) => acc + r.metrics.faithfulness, 0) / results.length).toFixed(3));
    const avgRelevance = Number((results.reduce((acc, r) => acc + r.metrics.answerRelevance, 0) / results.length).toFixed(3));
    const overallScore = Number((results.reduce((acc, r) => acc + r.metrics.compositeRagScore, 0) / results.length).toFixed(3));

    return {
      totalCases: cases.length,
      passedCases,
      averageContextPrecision: avgPrecision,
      averageFaithfulness: avgFaithfulness,
      averageAnswerRelevance: avgRelevance,
      overallCompositeScore: overallScore,
      results,
      timestamp: new Date().toISOString()
    };
  }
}
