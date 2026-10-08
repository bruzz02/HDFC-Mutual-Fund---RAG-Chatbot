import { UiStateManager, DEFAULT_PROMPT_CHIPS } from '../ui_state';
import { FinancialUiFormatters } from '../formatters';
import { ActiveTabSchema, QuickPromptChipSchema, ComparisonMatrixColumnSchema } from '../schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase8Tests(): Promise<TestResult[]> {
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

  // -------------------------------------------------------------
  // UNIT TESTS: Schema & Formatters
  // -------------------------------------------------------------

  await runTest('Unit 1: ActiveTabSchema validates application navigation tabs', () => {
    ActiveTabSchema.parse('architecture');
    ActiveTabSchema.parse('phase1');
    ActiveTabSchema.parse('compare');
    ActiveTabSchema.parse('chat');
  });

  await runTest('Unit 2: QuickPromptChipSchema validates all preset financial chips', () => {
    for (const chip of DEFAULT_PROMPT_CHIPS) {
      QuickPromptChipSchema.parse(chip);
    }
  });

  await runTest('Unit 3: FinancialUiFormatters formats AUM in Indian Crores', () => {
    const formatted = FinancialUiFormatters.formatAumCr(108324.55);
    if (!formatted.includes('1,08,324.55') && !formatted.includes('108,324.55')) {
      throw new Error(`Unexpected AUM format: ${formatted}`);
    }
    if (!formatted.startsWith('₹') || !formatted.endsWith('Cr')) {
      throw new Error(`Missing ₹ prefix or Cr suffix: ${formatted}`);
    }
  });

  await runTest('Unit 4: FinancialUiFormatters formats NAV in Indian Rupees with 2 decimals', () => {
    const formatted = FinancialUiFormatters.formatNav(219.441);
    if (formatted !== '₹219.44') {
      throw new Error(`Expected ₹219.44, got ${formatted}`);
    }
    if (FinancialUiFormatters.formatNav(null) !== 'N/A') {
      throw new Error('Expected N/A for null NAV');
    }
  });

  await runTest('Unit 5: FinancialUiFormatters formats returns with explicit sign (+/-)', () => {
    const pos = FinancialUiFormatters.formatPercentReturn(124.09);
    const neg = FinancialUiFormatters.formatPercentReturn(-6.15);

    if (pos !== '+124.09%') throw new Error(`Expected +124.09%, got ${pos}`);
    if (neg !== '-6.15%') throw new Error(`Expected -6.15%, got ${neg}`);
  });

  await runTest('Unit 6: FinancialUiFormatters assigns color classes based on return values', () => {
    const posColor = FinancialUiFormatters.getReturnColorClass(10.5);
    const negColor = FinancialUiFormatters.getReturnColorClass(-5.2);
    const nullColor = FinancialUiFormatters.getReturnColorClass(null);

    if (!posColor.includes('emerald')) throw new Error('Positive return should be emerald');
    if (!negColor.includes('rose')) throw new Error('Negative return should be rose');
    if (!nullColor.includes('slate')) throw new Error('Null return should be slate');
  });

  await runTest('Unit 7: FinancialUiFormatters assigns risk classes matching SEBI riskometers', () => {
    const vHigh = FinancialUiFormatters.getRiskBadgeClass('Very High');
    const mod = FinancialUiFormatters.getRiskBadgeClass('Moderate');

    if (!vHigh.includes('rose')) throw new Error('Very High should use rose badge');
    if (!mod.includes('yellow')) throw new Error('Moderate should use yellow badge');
  });

  // -------------------------------------------------------------
  // UNIT TESTS: UI State Manager
  // -------------------------------------------------------------

  await runTest('Unit 8: UiStateManager tracks active tab and selected fund state', () => {
    const manager = new UiStateManager();
    if (manager.getActiveTab() !== 'architecture') throw new Error('Initial tab should be architecture');

    manager.setActiveTab('compare');
    if (manager.getActiveTab() !== 'compare') throw new Error('Tab update failed');

    manager.setSelectedFundId('fund-elss');
    if (manager.getSelectedFundId() !== 'fund-elss') throw new Error('Selected fund update failed');
  });

  await runTest('Unit 9: UiStateManager queues notifications and caps capacity at 20', () => {
    const manager = new UiStateManager();
    for (let i = 0; i < 25; i++) {
      manager.addNotification('info', `Title ${i}`, `Message ${i}`);
    }

    const notifs = manager.getNotifications();
    if (notifs.length !== 20) {
      throw new Error(`Expected capped notifications count of 20, got ${notifs.length}`);
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: High-Density Comparison Matrix
  // -------------------------------------------------------------

  await runTest('Integration 10: buildComparisonMatrix generates 4 columns for HDFC funds', () => {
    const matrix = UiStateManager.buildComparisonMatrix();
    if (matrix.length !== 4) {
      throw new Error(`Expected 4 columns, got ${matrix.length}`);
    }
  });

  await runTest('Integration 11: All generated comparison columns pass ComparisonMatrixColumnSchema', () => {
    const matrix = UiStateManager.buildComparisonMatrix();
    for (const col of matrix) {
      ComparisonMatrixColumnSchema.parse(col);
    }
  });

  await runTest('Integration 12: Comparison matrix isolates ELSS 3-year lock-in vs open-ended schemes', () => {
    const matrix = UiStateManager.buildComparisonMatrix();
    const elssCol = matrix.find(c => c.category === 'ELSS');
    const midCol = matrix.find(c => c.category === 'Mid Cap');

    if (!elssCol || !midCol) throw new Error('Missing ELSS or Mid Cap in comparison matrix');
    if (!elssCol.lockIn.includes('3 Years')) throw new Error('ELSS column missing 3 Years lock-in');
    if (!midCol.lockIn.includes('None') && !midCol.lockIn.includes('Open-ended')) {
      throw new Error('Mid Cap column should be open-ended');
    }
  });

  return results;
}
