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
  const columns = Object.keys(data[0] || {});
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const labels = data.map(row => String(row[categoryColumn] || ''));
  const values = data.map(row => Number(row[valueColumn] || 0));
  
  return {
    type: 'bar_chart',
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

function generateLineChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const columns = Object.keys(data[0] || {});
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const labels = data.map(row => String(row[categoryColumn] || ''));
  const values = data.map(row => Number(row[valueColumn] || 0));
  
  return {
    type: 'line_chart',
    data: {
      labels,
      datasets: [{
        label: valueColumn,
        data: values,
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
  const columns = Object.keys(data[0] || {});
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const labels = data.map(row => String(row[categoryColumn] || ''));
  const values = data.map(row => Number(row[valueColumn] || 0));
  
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
          display: true,
          position: 'bottom'
        }
      }
    }
  };
}

function generateAreaChartConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const columns = Object.keys(data[0] || {});
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const labels = data.map(row => String(row[categoryColumn] || ''));
  const values = data.map(row => Number(row[valueColumn] || 0));
  
  return {
    type: 'area_chart',
    data: {
      labels,
      datasets: [{
        label: valueColumn,
        data: values,
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
  const columns = Object.keys(data[0] || {});
  const categoryColumn = findCategoryColumn(data, dataStructure);
  const valueColumn = findValueColumn(data, dataStructure);
  
  const labels = data.map(row => String(row[categoryColumn] || ''));
  const values = data.map(row => Number(row[valueColumn] || 0));
  
  return {
    type: 'horizontal_bar',
    data: {
      labels,
      datasets: [{
        label: valueColumn,
        data: values,
        backgroundColor: generateColors(values.length),
        borderColor: '#f59e0b',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
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
        x: {
          beginAtZero: true
        }
      }
    }
  };
}

function generateScatterPlotConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  const columns = Object.keys(data[0] || {});
  const numericColumns = columns.filter(col => 
    dataStructure.columnTypes[col] === 'number'
  );
  
  if (numericColumns.length < 2) {
    return generateBarChartConfig(data, dataStructure);
  }
  
  const xColumn = numericColumns[0];
  const yColumn = numericColumns[1];
  
  const points = data.map(row => ({
    x: Number(row[xColumn] || 0),
    y: Number(row[yColumn] || 0)
  }));
  
  return {
    type: 'scatter_plot',
    data: {
      labels: [],
      datasets: [{
        label: `${yColumn} vs ${xColumn}`,
        data: points,
        backgroundColor: '#8b5cf6',
        borderColor: '#8b5cf6',
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Correlação: ${yColumn} vs ${xColumn}`
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xColumn
          }
        },
        y: {
          title: {
            display: true,
            text: yColumn
          }
        }
      }
    }
  };
}

function generateTableConfig(data: DataPoint[], dataStructure: DataStructure): ChartConfig {
  return {
    type: 'table',
    data: {
      labels: Object.keys(data[0] || {}),
      datasets: [{
        label: 'Dados',
        data: data.map(row => Object.values(row))
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

// Helper functions
function findCategoryColumn(data: DataPoint[], dataStructure: DataStructure): string {
  const columns = Object.keys(data[0] || {});
  
  // Look for geographic columns first
  const geographicColumns = columns.filter(col => 
    col.toLowerCase().includes('region') || 
    col.toLowerCase().includes('country') ||
    col.toLowerCase().includes('state') ||
    col.toLowerCase().includes('city')
  );
  
  if (geographicColumns.length > 0) {
    return geographicColumns[0];
  }
  
  // Look for time-related columns
  const timeColumns = columns.filter(col => 
    col.toLowerCase().includes('month') || 
    col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('time')
  );
  
  if (timeColumns.length > 0) {
    return timeColumns[0];
  }
  
  // Look for string columns with limited unique values
  const stringColumns = columns.filter(col => 
    dataStructure.columnTypes[col] === 'string'
  );
  
  for (const col of stringColumns) {
    const uniqueValues = new Set(data.map(row => row[col]));
    if (uniqueValues.size > 1 && uniqueValues.size <= 20) {
      return col;
    }
  }
  
  // Default to first column
  return columns[0] || '';
}

function findValueColumn(data: DataPoint[], dataStructure: DataStructure): string {
  const columns = Object.keys(data[0] || {});
  
  // Look for numeric columns
  const numericColumns = columns.filter(col => 
    dataStructure.columnTypes[col] === 'number'
  );
  
  // Prefer columns with 'sales', 'amount', 'total', 'value' in the name
  const preferredColumns = numericColumns.filter(col => 
    col.toLowerCase().includes('sales') ||
    col.toLowerCase().includes('amount') ||
    col.toLowerCase().includes('total') ||
    col.toLowerCase().includes('value') ||
    col.toLowerCase().includes('quantity')
  );
  
  if (preferredColumns.length > 0) {
    return preferredColumns[0];
  }
  
  // Return first numeric column
  if (numericColumns.length > 0) {
    return numericColumns[0];
  }
  
  // Default to first column
  return columns[0] || '';
}

function generateColors(count: number): string[] {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
}
