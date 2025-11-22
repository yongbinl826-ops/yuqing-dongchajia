import React from 'react';
import Plot from 'react-plotly.js';

interface SentimentPieChartProps {
  positive: number;
  neutral: number;
  negative: number;
}

export function SentimentPieChart({ positive, neutral, negative }: SentimentPieChartProps) {
  const total = positive + neutral + negative;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        暂无数据
      </div>
    );
  }

  const data: any = [
    {
      values: [positive, neutral, negative],
      labels: ['正面', '中性', '负面'],
      type: 'pie',
      marker: {
        colors: ['#10b981', '#64748b', '#ef4444'],
      },
      textinfo: 'label+percent',
      textfont: {
        color: '#ffffff',
        size: 14,
      },
      hoverinfo: 'label+value+percent',
      hole: 0.4,
    },
  ];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: '#e2e8f0',
      family: 'Inter, sans-serif',
    },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      xanchor: 'center' as const,
      y: -0.1,
      font: {
        color: '#e2e8f0',
        size: 12,
      },
    },
    margin: {
      l: 20,
      r: 20,
      t: 20,
      b: 60,
    },
    height: 350,
  };

  const config = {
    displayModeBar: false,
    responsive: true,
  };

  return (
    <div className="w-full">
      <Plot
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
