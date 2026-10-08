export interface GoldenTestCase {
  id: string;
  query: string;
  expectedCategory: 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'ELSS' | 'Multi-Fund';
  expectedKeyTerms: string[];
  expectedNumbers: string[];
}

export const GOLDEN_RAG_DATASET: GoldenTestCase[] = [
  {
    id: 'tc-elss-lockin',
    query: 'What is the lock in period and tax benefit under Section 80C for HDFC ELSS?',
    expectedCategory: 'ELSS',
    expectedKeyTerms: ['3 Years', '80C', 'statutory lock-in'],
    expectedNumbers: ['1.21%', '1405.488', '3 Years']
  },
  {
    id: 'tc-midcap-cagr',
    query: 'What is the 5-year CAGR return and expense ratio of HDFC Mid Cap Fund?',
    expectedCategory: 'Mid Cap',
    expectedKeyTerms: ['124.09%', '0.76%', 'Chirag Setalvad'],
    expectedNumbers: ['124.09%', '0.76%']
  },
  {
    id: 'tc-smallcap-holdings',
    query: 'Which companies are top holdings in HDFC Small Cap Fund?',
    expectedCategory: 'Small Cap',
    expectedKeyTerms: ['Firstsource', 'Sonata', 'Bank of Baroda'],
    expectedNumbers: ['0.79%']
  },
  {
    id: 'tc-large-mid-compare',
    query: 'Compare HDFC Large Cap vs HDFC Mid Cap returns and expense ratios',
    expectedCategory: 'Multi-Fund',
    expectedKeyTerms: ['1.04%', '0.76%', 'Large Cap', 'Mid Cap'],
    expectedNumbers: ['1.04%', '0.76%']
  }
];
