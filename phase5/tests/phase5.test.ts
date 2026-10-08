import { PromptTemplates, SEBI_REGULATORY_DISCLAIMER, ELSS_STATUTORY_LOCK_IN_NOTICE } from '../prompt_templates';
import { HallucinationDefense } from '../hallucination_defense';
import { GuardrailedGenerator } from '../generator';
import { Phase5GenerationPipeline } from '../index';
import { GuardrailedAnswerSchema } from '../schema';
import { Phase4RetrievalEngine } from '../../phase4/index';
import { RetrievalResult } from '../../phase4/schema';
import { SemanticChunker } from '../../phase2/chunker';
import { INITIAL_HDFC_FUNDS } from '../../src/data/defaultFundData';
import { GrowwFundRecord } from '../../phase1/schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase5Tests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<void> | void) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message
      });
    }
  };

  const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
  const allChunks: any[] = [];
  for (const f of allFunds) {
    allChunks.push(...SemanticChunker.chunkFund(f));
  }

  const retrievalEngine = new Phase4RetrievalEngine();
  await retrievalEngine.indexChunks(allChunks);

  // -------------------------------------------------------------
  // UNIT TESTS: Prompt Templates & Guardrails
  // -------------------------------------------------------------

  await runTest('Unit 1: PromptTemplates system prompt contains all mandatory financial guardrails', () => {
    const sys = PromptTemplates.getSystemInstruction();

    if (!sys.includes('ZERO HALLUCINATION POLICY')) {
      throw new Error('System prompt missing Zero Hallucination policy');
    }
    if (!sys.includes('MULTI-FUND COMPARISON FORMAT')) {
      throw new Error('System prompt missing Markdown table comparison rule');
    }
    if (!sys.includes('MANDATORY ATTRIBUTION')) {
      throw new Error('System prompt missing mandatory source attribution rule');
    }
    if (!sys.includes('STATUTORY ELSS MANDATE')) {
      throw new Error('System prompt missing ELSS 3-year lock-in mandate');
    }
    if (!sys.includes(SEBI_REGULATORY_DISCLAIMER)) {
      throw new Error('System prompt missing exact SEBI regulatory disclaimer');
    }
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Hallucination Defense & Fact Checking
  // -------------------------------------------------------------

  await runTest('Unit 2: HallucinationDefense extracts percentages, rupee figures, and years', () => {
    const text = 'HDFC Mid Cap TER is 0.76%, 5Y CAGR is 124.09%, NAV is ₹219.44, and AUM is ₹108,324.55 Cr with 3 years history.';
    const figures = HallucinationDefense.extractFinancialFigures(text);

    if (figures.length < 5) throw new Error(`Expected at least 5 figures, found ${figures.length}`);

    const hasTer = figures.some(f => f.numericValue === 0.76 && f.unit === 'percent');
    const hasCagr = figures.some(f => f.numericValue === 124.09 && f.unit === 'percent');
    const hasNav = figures.some(f => f.numericValue === 219.44 && f.unit === 'inr_nav');
    const hasAum = figures.some(f => f.numericValue === 108324.55 && f.unit === 'crores_aum');
    const hasYears = figures.some(f => f.numericValue === 3 && f.unit === 'years');

    if (!hasTer || !hasCagr || !hasNav || !hasAum || !hasYears) {
      throw new Error('Failed to extract all expected financial entities');
    }
  });

  await runTest('Unit 3: HallucinationDefense verifies grounded figures against retrieved context', async () => {
    const retrieval = await retrievalEngine.retrieve('What is the expense ratio and AUM of HDFC Mid Cap Fund?', 3);
    const validText = `HDFC Mid Cap Fund Direct Growth has an expense ratio of 0.76% and an AUM of ₹108,324.55 Cr. https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth\n\n*Disclaimer: ${SEBI_REGULATORY_DISCLAIMER}*`;

    const { report } = HallucinationDefense.verifyAgainstContext(validText, retrieval);

    if (report.groundedFiguresCount === 0) {
      throw new Error('Expected grounded figures count > 0');
    }
    if (report.hallucinatedFigures.length > 0) {
      throw new Error(`False positive hallucinations detected: ${report.hallucinatedFigures.join(', ')}`);
    }
    if (report.confidenceScore < 1.0) {
      throw new Error(`Expected confidence 1.0, got ${report.confidenceScore}`);
    }
  });

  await runTest('Unit 4: HallucinationDefense catches fabricated/hallucinated figures', async () => {
    const retrieval = await retrievalEngine.retrieve('What is the expense ratio of HDFC Mid Cap Fund?', 2);
    const fabricatedText = `HDFC Mid Cap Fund has an expense ratio of 99.99% and NAV of ₹8888.88.`;

    const { report } = HallucinationDefense.verifyAgainstContext(fabricatedText, retrieval);

    if (report.hallucinatedFigures.length < 2) {
      throw new Error(`Failed to catch fabricated figures: ${report.hallucinatedFigures.join(', ')}`);
    }
    if (report.status !== 'repaired') {
      throw new Error(`Expected status repaired, got ${report.status}`);
    }
  });

  await runTest('Unit 5: HallucinationDefense auto-injects missing SEBI disclaimer', async () => {
    const retrieval = await retrievalEngine.retrieve('HDFC Mid Cap NAV', 2);
    const textWithoutDisclaimer = 'NAV of HDFC Mid Cap is ₹219.44.';

    const { repairedAnswer, report } = HallucinationDefense.verifyAgainstContext(textWithoutDisclaimer, retrieval);

    if (!repairedAnswer.includes(SEBI_REGULATORY_DISCLAIMER)) {
      throw new Error('Repaired answer does not contain SEBI disclaimer');
    }
    if (!report.hasSebiDisclaimer) {
      throw new Error('Report failed to record SEBI disclaimer');
    }
  });

  await runTest('Unit 6: HallucinationDefense auto-injects ELSS Section 80C 3-year lock-in notice', async () => {
    const retrieval = await retrievalEngine.retrieve('HDFC ELSS Tax Saver Fund NAV', 2);
    const textWithoutLockIn = 'HDFC ELSS NAV is ₹1,405.49.';

    const { repairedAnswer, report } = HallucinationDefense.verifyAgainstContext(textWithoutLockIn, retrieval);

    if (!repairedAnswer.includes(ELSS_STATUTORY_LOCK_IN_NOTICE)) {
      throw new Error('Repaired answer missing ELSS statutory lock-in notice');
    }
    if (!report.hasElssLockInNotice) {
      throw new Error('Report failed to record ELSS lock-in notice');
    }
  });

  await runTest('Unit 7: HallucinationDefense auto-injects verified Groww source citations if omitted', async () => {
    const retrieval = await retrievalEngine.retrieve('HDFC Small Cap performance', 2);
    const textWithoutUrls = 'HDFC Small Cap 5-year CAGR is 91.43%.';

    const { repairedAnswer, report } = HallucinationDefense.verifyAgainstContext(textWithoutUrls, retrieval);

    if (!repairedAnswer.includes('https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth')) {
      throw new Error('Repaired answer did not inject Groww source URL');
    }
    if (report.citationsFound.length === 0) {
      throw new Error('Report citationsFound is empty');
    }
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Generator & Comparison Formatting
  // -------------------------------------------------------------

  await runTest('Unit 8: GuardrailedGenerator creates Markdown comparison table for comparative queries', async () => {
    const retrieval = await retrievalEngine.retrieve('Compare HDFC Large Cap vs HDFC Mid Cap', 3);
    const generator = new GuardrailedGenerator({ mode: 'deterministic' });
    const { text } = await generator.generate(retrieval);

    if (!text.includes('| Parameter |') || !text.includes('| :--- |')) {
      throw new Error('Comparison response did not generate Markdown table');
    }
    if (!text.includes('HDFC Large Cap') || !text.includes('HDFC Mid Cap')) {
      throw new Error('Comparison table missing fund columns');
    }
    if (!text.includes('Expense Ratio (TER)') || !text.includes('5-Year CAGR')) {
      throw new Error('Comparison table missing key parameter rows');
    }
  });

  await runTest('Unit 9: GuardrailedAnswer strictly validates against Zod schema', async () => {
    const pipeline = new Phase5GenerationPipeline({
      retrievalEngine,
      generatorOptions: { mode: 'deterministic' }
    });

    const answer = await pipeline.answer('HDFC Mid Cap returns', 2);
    GuardrailedAnswerSchema.parse(answer);

    if (answer.factCheckReport.status === 'rejected') {
      throw new Error('Valid answer rejected');
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: End-to-End Question Answering Pipeline
  // -------------------------------------------------------------

  await runTest('Integration 10: ELSS tax saver & lock-in query produces grounded figures and statutory notice', async () => {
    const pipeline = new Phase5GenerationPipeline({
      retrievalEngine,
      generatorOptions: { mode: 'deterministic' }
    });

    const answer = await pipeline.answer('What is the expense ratio and lock in period for HDFC ELSS Tax Saver Fund?', 3);

    if (!answer.finalAnswerMarkdown.includes('1.21%')) {
      throw new Error('Missing verified expense ratio 1.21% for ELSS');
    }
    if (!answer.finalAnswerMarkdown.includes('3 Years') && !answer.finalAnswerMarkdown.includes('3-year')) {
      throw new Error('Missing statutory 3-year lock in mention');
    }
    if (!answer.finalAnswerMarkdown.includes('Section 80C')) {
      throw new Error('Missing Section 80C tax deduction mention');
    }
    if (!answer.finalAnswerMarkdown.includes(SEBI_REGULATORY_DISCLAIMER)) {
      throw new Error('Missing mandatory SEBI regulatory disclaimer');
    }
  });

  await runTest('Integration 11: Mid Cap 5-year CAGR performance query produces verified numbers', async () => {
    const pipeline = new Phase5GenerationPipeline({
      retrievalEngine,
      generatorOptions: { mode: 'deterministic' }
    });

    const answer = await pipeline.answer('What is the 5 year CAGR return of HDFC Mid Cap Fund?', 3);

    if (!answer.finalAnswerMarkdown.includes('124.09%')) {
      throw new Error('Missing verified 5Y CAGR return of 124.09%');
    }
    if (!answer.finalAnswerMarkdown.includes('https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth')) {
      throw new Error('Missing Groww source citation URL');
    }
    if (answer.factCheckReport.confidenceScore < 1.0) {
      throw new Error(`Confidence score unexpectedly low: ${answer.factCheckReport.confidenceScore}`);
    }
  });

  await runTest('Integration 12: Multi-fund comparison generates complete Markdown table with verified metrics', async () => {
    const pipeline = new Phase5GenerationPipeline({
      retrievalEngine,
      generatorOptions: { mode: 'deterministic' }
    });

    const answer = await pipeline.answer('Compare returns and expense ratio between HDFC Large Cap and HDFC Small Cap', 4);

    if (!answer.finalAnswerMarkdown.includes('| Parameter |')) {
      throw new Error('Expected comparison table in final markdown');
    }
    if (!answer.finalAnswerMarkdown.includes('1.04%') || !answer.finalAnswerMarkdown.includes('0.79%')) {
      throw new Error('Comparison table missing expense ratios for Large Cap (1.04%) or Small Cap (0.79%)');
    }
    if (!answer.factCheckReport.hasSebiDisclaimer) {
      throw new Error('Fact check report missing SEBI disclaimer confirmation');
    }
  });

  return results;
}
