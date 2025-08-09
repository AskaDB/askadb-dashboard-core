import { ChartType, DataPoint, DataStructure, ChartConfig } from './types';

export function generateChartConfig(
  chartType: ChartType, 
  data: DataPoint[], 
  dataStructure: DataStructure
): ChartConfig {
  switch (chartType) {
    case 'bar_chart':
      return generateBarChartConfig(data, dataStructure);
    case 'line_chart':
      return generateLineChartConfig(data, dataStructure);
    case 'pie_chart':
      return generatePieChartConfig(data, dataStructure);
    case 'area_chart':
      return generateAreaChartConfig(data, dataStructure);
    case 'horizontal_bar':
      return generateHorizontalBarChartConfig(data, dataStructure);
    case 'scatter_plot':
      return generateScatterPlotConfig(data, dataStructure);
    case 'table':
      return generateTableConfig(data, dataStructure);
    default:
      return generateBarChartConfig(data, dataStructure);
  }
}

function generateBarChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const { labels, values } = aggregateByCategory(data, categoryColumn, valueColumn);
  const sorted = sortLabelsIfMonth(labels, values);
  
  return {
    type: 'bar_chart',
    data: {
      labels: sorted.labels,
      datasets: [{
        label: valueColumn,
        data: sorted.values,
        backgroundColor: generateColors(sorted.values.length),
        borderColor: '#3b82f6',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${valueColumn} por ${categoryColumn}`
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
}

function generateLineChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const { labels, values } = aggregateByCategory(data, categoryColumn, valueColumn);
  const sorted = sortLabelsIfMonth(labels, values);
  
  return {
    type: 'line_chart',
    data: {
      labels: sorted.labels,
      datasets: [{
        label: valueColumn,
        data: sorted.values,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${valueColumn} ao longo do tempo`
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
}

function generatePieChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const { labels, values } = aggregateByCategory(data, categoryColumn, valueColumn);
  
  return {
    type: 'pie_chart',
    data: {
      labels,
      datasets: [{
        label: valueColumn,
        data: values,
        backgroundColor: generateColors(values.length),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Distribuição de ${valueColumn}`
        },
        legend: {
          display: true
        }
      }
    }
  };
}

function generateAreaChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const { labels, values } = aggregateByCategory(data, categoryColumn, valueColumn);
  const sorted = sortLabelsIfMonth(labels, values);
  
  return {
    type: 'area_chart',
    data: {
      labels: sorted.labels,
      datasets: [{
        label: valueColumn,
        data: sorted.values,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 2,
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${valueColumn} - Volume ao longo do tempo`
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
}

function generateHorizontalBarChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const { labels, values } = aggregateByCategory(data, categoryColumn, valueColumn);
  
  return {
    type: 'horizontal_bar',
    data: {
      labels,
      datasets: [{
        label: valueColumn,
        data: values,
        backgroundColor: generateColors(values.length),
        borderColor: '#3b82f6',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${valueColumn} por ${categoryColumn}`
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
}

function generateScatterPlotConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const labels = data.map(row => String(row[categoryColumn] || ''));
  const values = data.map(row => Number(row[valueColumn] || 0));
  
  return {
    type: 'scatter_plot',
    data: {
      labels,
      datasets: [{
        label: valueColumn,
        data: values,
        backgroundColor: generateColors(values.length),
        borderColor: '#3b82f6',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${valueColumn} vs ${categoryColumn}`
        },
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
}

function generateTableConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const columns = Object.keys(data[0] || {});
  
  return {
    type: 'table',
    data: {
      labels: columns,
      datasets: [{
        label: 'Dados',
        data: data.map((_, index) => index)
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Tabela de Dados'
        },
        legend: {
          display: false
        }
      }
    }
  };
}

function findCategoryColumn(data: DataPoint[], dataStructure: DataStructure): string {
  const columns = Object.keys(data[0] || {});

  // Prefer time-related columns first (dates or columns containing month/date/time)
  for (const column of columns) {
    const lower = column.toLowerCase();
    if (dataStructure.columnTypes[column] === 'date' || lower.includes('month') || lower.includes('date') || lower.includes('time')) {
      return column;
    }
  }
  
  // Then look for string columns
  for (const column of columns) {
    if (dataStructure.columnTypes[column] === 'string') {
      return column;
    }
  }
  
  // Fallback: any column
  return columns[0] || '';
}

function findValueColumn(data: DataPoint[], dataStructure: DataStructure): string {
  const columns = Object.keys(data[0] || {});
  
  // Look for number columns first
  for (const column of columns) {
    if (dataStructure.columnTypes[column] === 'number') {
      return column;
    }
  }
  
  // Default to second column or first if only one exists
  return columns[1] || columns[0] || '';
}

function generateColors(count: number): string[] {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
}

function aggregateByCategory(data: DataPoint[], categoryColumn: string, valueColumn: string): { labels: string[]; values: number[] } {
  const totals = new Map<string, number>();
  for (const row of data) {
    const key = String(row[categoryColumn] ?? '');
    const value = Number(row[valueColumn] ?? 0);
    totals.set(key, (totals.get(key) || 0) + value);
  }
  const labels = Array.from(totals.keys());
  const values = labels.map(label => totals.get(label) || 0);
  return { labels, values };
}

function sortLabelsIfMonth(labels: string[], values: number[]): { labels: string[]; values: number[] } {
  const monthOrder = ['january','february','march','april','may','june','july','august','september','october','november','december','jan','feb','mar','apr'];
  const monthOrderPt = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const idx = (name: string) => {
    const lower = name.toLowerCase();
    let i = monthOrderPt.indexOf(lower);
    if (i !== -1) return i;
    i = monthOrder.indexOf(lower);
    if (i !== -1) return i;
    return 999; // non-months at end
  };
  const indices = labels.map((l, i) => ({ i, order: idx(l) }));
  if (indices.every(x => x.order === 999)) {
    return { labels, values };
  }
  indices.sort((a, b) => a.order - b.order);
  const sortedLabels = indices.map(x => labels[x.i]);
  const sortedValues = indices.map(x => values[x.i]);
  return { labels: sortedLabels, values: sortedValues };
}
