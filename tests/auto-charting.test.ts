import { AutoChartingEngine } from '../src/auto-charting';

describe('AutoChartingEngine', () => {
  it('suggests charts for categorical + numerical data', () => {
    const eng = new AutoChartingEngine();
    const data = [
      { region: 'North', total: 10 },
      { region: 'South', total: 12 },
    ];
    const suggestions = eng.suggestCharts(data, 'vendas por região');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].type).toBeDefined();
  });
});
