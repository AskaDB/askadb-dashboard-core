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
    
    for (const chartType of chartTypes) {
      const config = generateChartConfig(chartType, data, dataStructure);
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
