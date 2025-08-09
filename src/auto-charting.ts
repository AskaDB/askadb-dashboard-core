import { ChartSuggestion, ChartType, DataStructure, DataPoint } from './types';
import { generateChartConfig } from './chart-generator';

export class AutoChartingEngine {
  private chartSuggestions: ChartSuggestion[] = [];
  
  suggestCharts(data: DataPoint[], originalQuestion?: string): ChartSuggestion[] {
    const suggestions: ChartSuggestion[] = [];
    
    const question = (originalQuestion || '').toLowerCase();
    
    // Analyze data structure
    const dataStructure = this.analyzeDataStructure(data);

    // Basic heuristics about the dataset
    const { stringColumns, numberColumns, dateLikeColumns, categoryCandidates } = this.summarizeColumns(data, dataStructure);
    const primaryCategory = categoryCandidates[0] || stringColumns[0] || dateLikeColumns[0];
    const categoryUniqueCount = primaryCategory ? this.uniqueCount(data, primaryCategory) : 0;

    // Column name mentions in question
    const allColumnNames = Object.keys(dataStructure.columnTypes).map(c => c.toLowerCase());
    const mentionedColumns = allColumnNames.filter(c => question.includes(c));

    const hasTwoCategories = (categoryCandidates.length >= 2) || (mentionedColumns.length >= 2 && stringColumns.length >= 2);
    
    // Generate suggestions based on data structure and question
    const chartTypes = this.getSuggestedChartTypes({
      dataStructure,
      question,
      hasCategory: categoryCandidates.length > 0 || stringColumns.length > 0,
      categoryUniqueCount,
      hasTime: dataStructure.hasTimeSeries || dateLikeColumns.length > 0,
      hasTwoNumbers: numberColumns.length >= 2,
      hasTwoCategories,
    });

    const asksGrowth = ['crescimento','growth','variação','evolução','aumento','queda','diferença','comparar mês','comparar mes']
      .some(k => question.includes(k));
    const asksDistribution = ['proporção','proporcao','distribuição','percentual','participação','participacao']
      .some(k => question.includes(k));
    const asksTrend = ['tendência','tendencia','ao longo','timeline'].some(k => question.includes(k));
    const hasTime = dataStructure.hasTimeSeries || dateLikeColumns.length > 0;

    for (const chartType of chartTypes) {
      let config = generateChartConfig(chartType, data, dataStructure);

      // Enrich: percent-of-total mode for proportion/participation
      if (asksDistribution) {
        config = this.applyPercentOfTotal(config);
      }

      // Enrich: growth series and KPI cards for time/growth questions
      if ((asksGrowth || asksTrend) && (chartType === 'line_chart' || chartType === 'area_chart') && hasTime) {
        config = this.applyGrowthEnrichment(config);
      }

      // Add narrative
      config = this.attachNarrative(config, data);

      const suggestion = this.createChartSuggestion(chartType, config, dataStructure, originalQuestion);
      suggestions.push(suggestion);
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
  
  private analyzeDataStructure(data: DataPoint[]): DataStructure {
    if (data.length === 0) {
      return {
        hasTimeSeries: false,
        hasCategories: false,
        hasNumericalComparison: false,
        hasGeographicData: false,
        columnTypes: {},
        rowCount: 0,
        columnCount: 0
      };
    }
    
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'> = {};
    
    // Analyze column types
    for (const column of columns) {
      columnTypes[column] = this.detectColumnType(data, column);
    }
    
    // Detect patterns
    const hasTimeSeries = this.detectTimeSeries(data, columnTypes);
    const hasCategories = this.detectCategories(data, columnTypes);
    const hasNumericalComparison = this.detectNumericalComparison(data, columnTypes);
    const hasGeographicData = this.detectGeographicData(data, columnTypes);
    
    return {
      hasTimeSeries,
      hasCategories,
      hasNumericalComparison,
      hasGeographicData,
      columnTypes,
      rowCount: data.length,
      columnCount: columns.length
    };
  }

  // Percent-of-total transformation (stacked bar or pie)
  private applyPercentOfTotal(config: any): any {
    if (!config?.data?.datasets || !config?.data?.labels) return config;

    const cloned = JSON.parse(JSON.stringify(config));

    // For bar charts with multiple datasets: normalize per label across datasets
    if (cloned.type === 'bar_chart' && cloned.data.datasets.length > 1) {
      const labels: string[] = cloned.data.labels;
      const datasets = cloned.data.datasets;
      for (let li = 0; li < labels.length; li++) {
        const totalAtLabel = datasets.reduce((acc: number, ds: any) => acc + (Number(ds.data?.[li] ?? 0)), 0) || 1;
        for (const ds of datasets) {
          const val = Number(ds.data?.[li] ?? 0);
          ds.data[li] = Number(((val / totalAtLabel) * 100).toFixed(2));
        }
      }
      cloned.options = cloned.options || {};
      cloned.options.scales = cloned.options.scales || {};
      cloned.options.scales.x = { ...(cloned.options.scales.x || {}), stacked: true };
      cloned.options.scales.y = { ...(cloned.options.scales.y || {}), beginAtZero: true, max: 100, stacked: true, ticks: { callback: (v: number) => `${v}%` } };
      cloned.options.plugins = cloned.options.plugins || {};
      cloned.options.plugins.tooltip = {
        ...(cloned.options.plugins.tooltip || {}),
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y ?? ctx.parsed}%`
        }
      };
      return cloned;
    }

    // For pie: normalize to 100%
    if (cloned.type === 'pie_chart' && cloned.data.datasets.length >= 1) {
      const ds = cloned.data.datasets[0];
      const total = (ds.data || []).reduce((acc: number, v: number) => acc + Number(v || 0), 0) || 1;
      ds.data = (ds.data || []).map((v: number) => Number((((Number(v || 0)) / total) * 100).toFixed(2)));
      cloned.options = cloned.options || {};
      cloned.options.plugins = cloned.options.plugins || {};
      cloned.options.plugins.tooltip = {
        ...(cloned.options.plugins.tooltip || {}),
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed}%`
        }
      };
      return cloned;
    }

    return config;
  }

  // Growth enrichment for time-series charts
  private applyGrowthEnrichment(config: any): any {
    if (!config?.data?.labels || !config?.data?.datasets?.length) return config;

    const cloned = JSON.parse(JSON.stringify(config));
    const labels: string[] = cloned.data.labels;
    const baseDs = cloned.data.datasets[0];
    const values: number[] = (baseDs.data || []).map((n: any) => Number(n || 0));

    // Compute period-over-period growth %
    const growthPercents: (number | null)[] = values.map((v, i) => {
      if (i === 0) return null;
      const prev = values[i - 1] || 0;
      if (prev === 0) return null;
      return Number((((v - prev) / prev) * 100).toFixed(2));
    });

    // Last period KPI card
    if (!cloned.meta) cloned.meta = {};
    if (!cloned.meta.cards) cloned.meta.cards = [];
    const lastIdx = values.length - 1;
    if (lastIdx >= 1) {
      const lastLabel = labels[lastIdx];
      const prevLabel = labels[lastIdx - 1];
      const deltaAbs = Number((values[lastIdx] - values[lastIdx - 1]).toFixed(2));
      const deltaPct = growthPercents[lastIdx] ?? null;
      const arrow = deltaAbs >= 0 ? '⬆️' : '⬇️';
      const sign = deltaAbs >= 0 ? '+' : '';
      cloned.meta.cards.push({
        type: 'growth',
        title: `Crescimento ${prevLabel}→${lastLabel}`,
        value: `${arrow} ${deltaPct !== null ? `${deltaPct}%` : 'N/A'} (${sign}${deltaAbs})`
      });
    }

    // Add secondary axis dataset for Growth %
    cloned.data.datasets.push({
      label: 'Growth %',
      data: growthPercents.map(v => (v === null ? null : v)),
      yAxisID: 'y1',
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      borderWidth: 2,
      fill: false,
      tension: 0.1,
    });

    cloned.options = cloned.options || {};
    cloned.options.scales = cloned.options.scales || {};
    cloned.options.scales.y = { ...(cloned.options.scales.y || {}), beginAtZero: true };
    cloned.options.scales.y1 = {
      type: 'linear',
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { callback: (v: number) => `${v}%` }
    };

    return cloned;
  }

  // Narrative summarization
  private attachNarrative(config: any, data: DataPoint[]): any {
    const cloned = JSON.parse(JSON.stringify(config));
    if (!cloned.meta) cloned.meta = {};

    try {
      const totalRows = data.length;
      // Identify labels and primary dataset if present
      const labels: string[] = cloned?.data?.labels || [];
      const datasets: any[] = cloned?.data?.datasets || [];
      const hasDatasets = datasets.length > 0 && Array.isArray(datasets[0]?.data);

      let narrativeParts: string[] = [];

      if (hasDatasets) {
        const ds0 = datasets[0];
        const values: number[] = (ds0.data || []).map((v: any) => Number(v || 0));
        const sum = values.reduce((a: number, b: number) => a + b, 0);
        const avg = values.length ? sum / values.length : 0;
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        const maxIdx = values.indexOf(maxVal);
        const minIdx = values.indexOf(minVal);
        const maxLabel = labels[maxIdx] ?? '';
        const minLabel = labels[minIdx] ?? '';

        narrativeParts.push(`Total de pontos analisados: ${totalRows}.`);
        if (labels.length) narrativeParts.push(`Categorias/Períodos: ${labels.length}.`);
        narrativeParts.push(`Média: ${avg.toFixed(1)}; Máx: ${maxVal} (${maxLabel}); Mín: ${minVal} (${minLabel}).`);

        if (datasets.length > 1) {
          narrativeParts.push(`Foram comparadas ${datasets.length} séries (ex.: ${datasets[0].label} vs ${datasets[1].label}).`);
        }

        // If growth meta card exists, reference it
        const growthCard = cloned.meta.cards?.find((c: any) => c.type === 'growth');
        if (growthCard) {
          narrativeParts.push(`Variação recente: ${growthCard.value}.`);
        }
      } else {
        narrativeParts.push(`Total de registros: ${totalRows}.`);
      }

      cloned.meta.narrative = narrativeParts.join(' ');
    } catch (e) {
      // Best-effort, ignore narrative errors
    }

    return cloned;
  }

  // NEW: summarization helpers
  private summarizeColumns(data: DataPoint[], columnInfo: DataStructure) {
    const columns = Object.keys(columnInfo.columnTypes);
    const stringColumns = columns.filter(c => columnInfo.columnTypes[c] === 'string');
    const numberColumns = columns.filter(c => columnInfo.columnTypes[c] === 'number');
    const dateLikeColumns = columns.filter(c => columnInfo.columnTypes[c] === 'date' || c.toLowerCase().includes('month') || c.toLowerCase().includes('date') || c.toLowerCase().includes('time'));
    
    // Candidate categorical columns (string with limited unique values)
    const categoryCandidates = stringColumns.filter(c => {
      const u = this.uniqueCount(data, c);
      return u >= 2 && u <= 20; // treat as category if not too many unique values
    });

    return { stringColumns, numberColumns, dateLikeColumns, categoryCandidates };
  }

  private uniqueCount(data: DataPoint[], column: string): number {
    const s = new Set<any>();
    for (const row of data) s.add(row[column]);
    return s.size;
  }
  
  private detectColumnType(data: DataPoint[], column: string): 'string' | 'number' | 'date' | 'boolean' {
    const sampleValues = data.slice(0, 10).map(row => row[column]);
    
    // Check if all values are numbers
    const allNumbers = sampleValues.every(val => 
      typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))
    );
    
    if (allNumbers) return 'number';
    
    // Check if all values are booleans
    const allBooleans = sampleValues.every(val => 
      typeof val === 'boolean' || val === 'true' || val === 'false'
    );
    
    if (allBooleans) return 'boolean';
    
    // Check if all values are dates or month strings
    const allDates = sampleValues.every(val => {
      if (typeof val === 'string') {
        const lower = val.toLowerCase();
        const looksLikeMonth = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez','january','february','march','april','may','june','july','august','september','october','november','december']
          .some(m => lower.includes(m));
        if (looksLikeMonth) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      }
      return false;
    });
    
    if (allDates) return 'date';
    
    return 'string';
  }
  
  private detectTimeSeries(data: DataPoint[], columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>): boolean {
    const dateColumns = Object.entries(columnTypes)
      .filter(([_, type]) => type === 'date')
      .map(([col, _]) => col);
    
    const monthColumns = Object.keys(columnTypes).filter(col => 
      col.toLowerCase().includes('month') || 
      col.toLowerCase().includes('date') ||
      col.toLowerCase().includes('time')
    );
    
    return dateColumns.length > 0 || monthColumns.length > 0;
  }
  
  private detectCategories(data: DataPoint[], columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>): boolean {
    const stringColumns = Object.entries(columnTypes)
      .filter(([_, type]) => type === 'string')
      .map(([col, _]) => col);
    
    // Check if string columns have limited unique values (categories)
    for (const column of stringColumns) {
      const uniqueValues = new Set(data.map(row => row[column]));
      if (uniqueValues.size > 1 && uniqueValues.size <= 20) {
        return true;
      }
    }
    
    return false;
  }
  
  private detectNumericalComparison(data: DataPoint[], columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>): boolean {
    const numberColumns = Object.entries(columnTypes)
      .filter(([_, type]) => type === 'number')
      .map(([col, _]) => col);
    
    return numberColumns.length >= 2;
  }
  
  private detectGeographicData(data: DataPoint[], columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>): boolean {
    const geographicColumns = Object.keys(columnTypes).filter(col => 
      col.toLowerCase().includes('region') || 
      col.toLowerCase().includes('country') ||
      col.toLowerCase().includes('state') ||
      col.toLowerCase().includes('city') ||
      col.toLowerCase().includes('location')
    );
    
    return geographicColumns.length > 0;
  }
  
  private getSuggestedChartTypes(context: {
    dataStructure: DataStructure;
    question: string;
    hasCategory: boolean;
    categoryUniqueCount: number;
    hasTime: boolean;
    hasTwoNumbers: boolean;
    hasTwoCategories: boolean;
  }): ChartType[] {
    const { dataStructure, question, hasCategory, categoryUniqueCount, hasTime, hasTwoNumbers, hasTwoCategories } = context;
    const suggestions: ChartType[] = [];

    const asksGrowth = ['crescimento','growth','variação','evolução','aumento','queda','diferença','comparar mês','comparar mes']
      .some(k => question.includes(k));
    const asksTrend = ['tendência','tendencia','ao longo','timeline'].some(k => question.includes(k));
    const asksDistribution = ['proporção','proporcao','distribuição','percentual','participação','participacao'].some(k => question.includes(k));
    const asksRanking = ['top','ranking','maiores','menores','ordenar'].some(k => question.includes(k));
    const asksCorrelation = ['correlação','correlacao','relação','relacao','impacto','influência','influencia'].some(k => question.includes(k));

    // 0) Explicit multi-dimension comparison like "por produto e região"
    if (hasTwoCategories) {
      if (hasTime || asksTrend || asksGrowth) {
        suggestions.push('line_chart'); // multi-série por categoria secundária
      } else {
        suggestions.push('bar_chart'); // barras agrupadas/empilhadas
      }
    }

    // 1) Time series / growth
    if (hasTime || asksGrowth || asksTrend) {
      suggestions.push('line_chart', 'area_chart');
    }

    // 2) Distribution / proportions with few categories
    if (hasCategory && categoryUniqueCount > 0 && categoryUniqueCount <= 6 && asksDistribution) {
      suggestions.push('pie_chart');
    }

    // 3) Ranking
    if (asksRanking && hasCategory) {
      suggestions.push('horizontal_bar');
    }

    // 4) Correlation
    if (hasTwoNumbers && asksCorrelation) {
      suggestions.push('scatter_plot');
    }

    // 5) Generic categorical comparisons
    if (hasCategory) {
      if (categoryUniqueCount <= 6 && !asksTrend && !hasTime) {
        suggestions.push('pie_chart', 'bar_chart');
      } else {
        suggestions.push('bar_chart');
      }
    }

    // 6) Fallbacks
    if (!hasCategory && hasTwoNumbers) suggestions.push('scatter_plot');
    if (suggestions.length === 0) suggestions.push('table', 'bar_chart');

    // Remove duplicates and return unique suggestions
    return [...new Set(suggestions)];
  }
  
  private createChartSuggestion(
    chartType: ChartType, 
    config: any, 
    dataStructure: DataStructure,
    originalQuestion?: string
  ): ChartSuggestion {
    const titles = {
      'bar_chart': 'Gráfico de Barras',
      'line_chart': 'Gráfico de Linha',
      'pie_chart': 'Gráfico de Pizza',
      'area_chart': 'Gráfico de Área',
      'scatter_plot': 'Gráfico de Dispersão',
      'horizontal_bar': 'Gráfico de Barras Horizontal',
      'table': 'Tabela',
      'map': 'Mapa'
    };
    
    const descriptions = {
      'bar_chart': 'Ideal para comparar valores entre categorias',
      'line_chart': 'Perfeito para mostrar tendências ao longo do tempo',
      'pie_chart': 'Ótimo para mostrar proporções de um todo',
      'area_chart': 'Bom para mostrar volume e tendências',
      'scatter_plot': 'Ideal para correlacionar duas variáveis numéricas',
      'horizontal_bar': 'Bom para rankings e comparações',
      'table': 'Apresenta todos os dados de forma organizada',
      'map': 'Ideal para dados geográficos'
    };
    
    const confidence = this.calculateConfidence(chartType, dataStructure, originalQuestion);
    
    return {
      type: chartType,
      title: titles[chartType] || chartType,
      description: descriptions[chartType] || '',
      confidence,
      config,
      reasoning: this.generateReasoning(chartType, dataStructure, originalQuestion)
    };
  }
  
  private calculateConfidence(chartType: ChartType, dataStructure: DataStructure, originalQuestion?: string): number {
    let confidence = 0.5; // Base confidence
    
    const question = originalQuestion?.toLowerCase() || '';
    const asksGrowth = question.includes('crescimento') || question.includes('growth') || question.includes('variação') || question.includes('evolução');
    const asksRanking = question.includes('top') || question.includes('ranking') || question.includes('maiores') || question.includes('menores');

    // Boost confidence based on data structure match
    if (chartType === 'bar_chart' && dataStructure.hasCategories) confidence += 0.25;
    if (chartType === 'line_chart' && dataStructure.hasTimeSeries) confidence += 0.35;
    if (chartType === 'area_chart' && dataStructure.hasTimeSeries) confidence += 0.3;
    if (chartType === 'pie_chart' && dataStructure.hasCategories) confidence += 0.2;
    if (chartType === 'scatter_plot' && dataStructure.hasNumericalComparison) confidence += 0.3;
    if (chartType === 'horizontal_bar' && dataStructure.hasCategories) confidence += 0.2;
    
    // Boost confidence based on question keywords
    if (chartType === 'line_chart' && (question.includes('mês') || question.includes('month') || asksGrowth)) confidence += 0.25;
    if (chartType === 'area_chart' && (question.includes('mês') || question.includes('month') || asksGrowth)) confidence += 0.2;
    if (chartType === 'horizontal_bar' && asksRanking) confidence += 0.25;
    if (chartType === 'pie_chart' && (question.includes('propor') || question.includes('percent'))) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }
  
  private generateReasoning(chartType: ChartType, dataStructure: DataStructure, originalQuestion?: string): string {
    const question = originalQuestion?.toLowerCase() || '';
    const asksGrowth = question.includes('crescimento') || question.includes('growth') || question.includes('variação') || question.includes('evolução');
    
    if (chartType === 'bar_chart') {
      if (question.includes('região') || question.includes('region')) {
        return 'Gráfico de barras é ideal para comparar vendas entre diferentes regiões';
      }
      return 'Gráfico de barras é perfeito para comparar valores entre categorias';
    }
    
    if (chartType === 'line_chart') {
      if (asksGrowth || question.includes('mês') || question.includes('month')) {
        return 'Gráfico de linha evidencia crescimento e tendências entre meses';
      }
      return 'Gráfico de linha é ideal para mostrar tendências ao longo do tempo';
    }
    
    if (chartType === 'area_chart') {
      return 'Gráfico de área destaca volume acumulado e evolução temporal';
    }
    
    if (chartType === 'pie_chart') {
      return 'Gráfico de pizza mostra a proporção de cada categoria no total';
    }
    
    if (chartType === 'horizontal_bar') {
      return 'Gráfico de barras horizontal é ideal para rankings e comparações';
    }
    
    if (chartType === 'scatter_plot') {
      return 'Gráfico de dispersão ajuda a visualizar correlações entre variáveis numéricas';
    }
    
    return 'Este tipo de visualização é adequado para os dados analisados';
  }
}
