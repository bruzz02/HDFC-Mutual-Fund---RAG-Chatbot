import { ActiveTab, QuickPromptChip, ComparisonMatrixColumn, UiNotification } from './schema';
import { FinancialUiFormatters } from './formatters';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { FundData } from '../src/types/mutualFund';

export const DEFAULT_PROMPT_CHIPS: QuickPromptChip[] = [
  {
    id: 'elss-costs',
    label: 'ELSS Lock-in & TER',
    query: 'What is the expense ratio and lock-in period of HDFC ELSS Tax Saver Fund?',
    category: 'tax_elss'
  },
  {
    id: 'midcap-cagr',
    label: 'Mid Cap 5Y CAGR',
    query: 'What is the 5-year CAGR return and fund manager for HDFC Mid Cap Fund?',
    category: 'returns'
  },
  {
    id: 'compare-large-mid',
    label: 'Compare Large vs Mid Cap',
    query: 'Compare HDFC Large Cap vs HDFC Mid Cap across AUM, returns, and expense ratio',
    category: 'comparison'
  },
  {
    id: 'smallcap-holdings',
    label: 'Small Cap Top Holdings',
    query: 'What are the top stock holdings and sector allocations in HDFC Small Cap Fund?',
    category: 'holdings'
  }
];

export class UiStateManager {
  private activeTab: ActiveTab = 'architecture';
  private selectedFundId: string = 'hdfc-mid-cap-fund-direct-growth';
  private notifications: UiNotification[] = [];

  getActiveTab(): ActiveTab {
    return this.activeTab;
  }

  setActiveTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  getSelectedFundId(): string {
    return this.selectedFundId;
  }

  setSelectedFundId(id: string): void {
    this.selectedFundId = id;
  }

  addNotification(type: UiNotification['type'], title: string, message: string): UiNotification {
    const notif: UiNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > 20) this.notifications.pop();
    return notif;
  }

  getNotifications(): UiNotification[] {
    return this.notifications;
  }

  /**
   * Builds high-density side-by-side matrix columns from active fund records.
   */
  static buildComparisonMatrix(funds: FundData[] = INITIAL_HDFC_FUNDS): ComparisonMatrixColumn[] {
    return funds.map(f => ({
      fundId: f.id,
      fundName: f.scheme_name,
      category: f.sub_category || f.category,
      nav: FinancialUiFormatters.formatNav(f.nav),
      aum: FinancialUiFormatters.formatAumCr(f.aum),
      expenseRatio: f.expense_ratio !== undefined && f.expense_ratio !== null ? `${f.expense_ratio}%` : 'N/A',
      return1y: FinancialUiFormatters.formatPercentReturn(f.returns?.return1y),
      return3y: FinancialUiFormatters.formatPercentReturn(f.returns?.return3y),
      return5y: FinancialUiFormatters.formatPercentReturn(f.returns?.return5y),
      lockIn: f.lock_in || (f.sub_category === 'ELSS' ? '3 Years' : 'None (Open-ended)'),
      exitLoad: f.exit_load || 'Nil'
    }));
  }
}
