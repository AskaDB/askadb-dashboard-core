import { ChartSuggestion, ChartType, DataStructure, DataPoint } from './types';
import { generateChartConfig } from './chart-generator';

export class AutoChartingEngine {
  private chartSuggestions: ChartSuggestion[] = [];
  
  suggestCharts(data: DataPoint[], originalQuestion?: string): ChartSuggestion[] {
    const suggestions: ChartSuggestion[] = [];
    
    // Analyze data structure
    const dataStructure = this.analyzeDataStructure(data);
    
    // Generate suggestions based on data structure and question
    const chartTypes = this.getSuggestedChartTypes(dataStructure, originalQuestion);
    
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
    
    // Check if all values are dates
    const allDates = sampleValues.every(val => {
      if (typeof val === 'string') {
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
  
  private getSuggestedChartTypes(dataStructure: DataStructure, originalQuestion?: string): ChartType[] {
    const suggestions: ChartType[] = [];
    const question = originalQuestion?.toLowerCase() || '';
    
    // Rule-based chart selection
    if (dataStructure.hasGeographicData || question.includes('região') || question.includes('region')) {
      suggestions.push('bar_chart', 'pie_chart');
    }
    
    if (dataStructure.hasTimeSeries || question.includes('mês') || question.includes('month') || question.includes('crescimento')) {
      suggestions.push('line_chart', 'area_chart');
    }
    
    if (dataStructure.hasCategories) {
      suggestions.push('bar_chart', 'pie_chart');
    }
    
    if (dataStructure.hasNumericalComparison) {
      suggestions.push('bar_chart', 'line_chart', 'scatter_plot');
    }
    
    if (question.includes('top') || question.includes('ranking')) {
      suggestions.push('horizontal_bar', 'bar_chart');
    }
    
    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('table', 'bar_chart');
    }
    
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
    
    // Boost confidence based on data structure match
    if (chartType === 'bar_chart' && dataStructure.hasCategories) confidence += 0.3;
    if (chartType === 'line_chart' && dataStructure.hasTimeSeries) confidence += 0.3;
    if (chartType === 'pie_chart' && dataStructure.hasCategories) confidence += 0.2;
    if (chartType === 'scatter_plot' && dataStructure.hasNumericalComparison) confidence += 0.3;
    
    // Boost confidence based on question keywords
    if (chartType === 'bar_chart' && (question.includes('região') || question.includes('region'))) confidence += 0.2;
    if (chartType === 'line_chart' && (question.includes('mês') || question.includes('month'))) confidence += 0.2;
    if (chartType === 'horizontal_bar' && (question.includes('top') || question.includes('ranking'))) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }
  
  private generateReasoning(chartType: ChartType, dataStructure: DataStructure, originalQuestion?: string): string {
    const question = originalQuestion?.toLowerCase() || '';
    
    if (chartType === 'bar_chart') {
      if (question.includes('região') || question.includes('region')) {
        return "Gráfico de barras é ideal para comparar vendas entre diferentes regiões";
      }
      return "Gráfico de barras é perfeito para comparar valores entre categorias";
    }
    
    if (chartType === 'line_chart') {
      if (question.includes('mês') || question.includes('month')) {
        return "Gráfico de linha mostra claramente a evolução das vendas ao longo dos meses";
      }
      return "Gráfico de linha é ideal para mostrar tendências ao longo do tempo";
    }
    
    if (chartType === 'pie_chart') {
      return "Gráfico de pizza mostra a proporção de cada região no total de vendas";
    }
    
    if (chartType === 'horizontal_bar') {
      return "Gráfico de barras horizontal é ideal para rankings e comparações";
    }
    
    return "Este tipo de visualização é adequado para os dados analisados";
  }
}
