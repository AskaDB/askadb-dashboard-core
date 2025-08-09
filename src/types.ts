export type ChartType = 
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'scatter_plot'
  | 'horizontal_bar'
  | 'table'
  | 'map';

export interface DataPoint {
  [key: string]: any;
}

export interface DataStructure {
  hasTimeSeries: boolean;
  hasCategories: boolean;
  hasNumericalComparison: boolean;
  hasGeographicData: boolean;
  columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
  rowCount: number;
  columnCount: number;
}

export interface ChartSuggestion {
  type: ChartType;
  title: string;
  description: string;
  confidence: number;
  config: any;
  reasoning: string;
}

export interface ChartConfig {
  type: ChartType;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
      stack?: string;
      yAxisID?: string;
    }>;
  };
  // Allow flexible chart options (multi-axes, stacking, tooltips, etc.)
  options: any;
  // Optional metadata for UI narratives/KPIs
  meta?: any;
}
