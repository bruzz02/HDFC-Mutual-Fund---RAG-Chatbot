import { Phase4RetrievalEngine } from '../phase4/index';
import { RetrievalResult } from '../phase4/schema';
import { GuardrailedGenerator, GeneratorOptions } from './generator';
import { HallucinationDefense } from './hallucination_defense';
import { GuardrailedAnswer, GuardrailedAnswerSchema } from './schema';
import { SEBI_REGULATORY_DISCLAIMER } from './prompt_templates';

export * from './schema';
export * from './prompt_templates';
export * from './hallucination_defense';
export * from './generator';

export interface Phase5PipelineOptions {
  generatorOptions?: GeneratorOptions;
  retrievalEngine?: Phase4RetrievalEngine;
}

export class Phase5GenerationPipeline {
  private generator: GuardrailedGenerator;
  private retrievalEngine: Phase4RetrievalEngine;

  constructor(options: Phase5PipelineOptions = {}) {
    this.generator = new GuardrailedGenerator(options.generatorOptions);
    this.retrievalEngine = options.retrievalEngine ?? new Phase4RetrievalEngine();
  }

  setRetrievalEngine(engine: Phase4RetrievalEngine) {
    this.retrievalEngine = engine;
  }

  /**
   * Executes the full Phase 5 generation & hallucination defense pipeline.
   */
  async answer(
    queryOrRetrieval: string | RetrievalResult,
    topK: number = 4
  ): Promise<GuardrailedAnswer> {
    const startTime = Date.now();

    // 1. Get or utilize retrieval result
    let retrievalResult: RetrievalResult;
    if (typeof queryOrRetrieval === 'string') {
      retrievalResult = await this.retrievalEngine.retrieve(queryOrRetrieval, topK);
    } else {
      retrievalResult = queryOrRetrieval;
    }

    // 2. LLM or Rule-based generation with system prompt guardrails
    const { text: rawModelResponse, modelUsed } = await this.generator.generate(retrievalResult);

    // 3. Post-Generation Hallucination Defense & Fact Checking
    const { repairedAnswer, report } = HallucinationDefense.verifyAgainstContext(
      rawModelResponse,
      retrievalResult
    );

    const latencyMs = Date.now() - startTime;

    return GuardrailedAnswerSchema.parse({
      query: retrievalResult.query,
      rawModelResponse,
      finalAnswerMarkdown: repairedAnswer,
      retrievalMetadata: {
        intent: retrievalResult.processedQuery.intent,
        chunksUsedCount: retrievalResult.topChunks.length,
        sourceUrls: Array.from(new Set(retrievalResult.topChunks.map(c => c.document.source_url)))
      },
      factCheckReport: report,
      regulatoryDisclaimer: SEBI_REGULATORY_DISCLAIMER,
      latencyMs,
      model: modelUsed
    });
  }
}
