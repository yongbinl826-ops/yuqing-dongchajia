import React from 'react';
import Plot from 'react-plotly.js';

interface SentimentStat {
  date: string;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

interface SentimentTrendChartProps {
  stats: SentimentStat[];
}

export function SentimentTrendChart({ stats }: SentimentTrendChartProps) {
  if (!stats || stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        暂无趋势数据
      </div>
    );
  }

  const dates = stats.map(s => s.date);
  const positiveData = stats.map(s => s.positiveCount);
  const neutralData = stats.map(s => s.neutralCount);
  const negativeData = stats.map(s => s.negativeCount);

  const data = [
    {
      x: dates,
      y: positiveData,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: '正面',
      line: {
        color: '#10b981',
        width: 3,
      },
      marker: {
        size: 8,
        color: '#10b981',
      },
    },
    {
      x: dates,
      y: neutralData,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: '中性',
      line: {
        color: '#64748b',
        width: 3,
      },
      marker: {
        size: 8,
        color: '#64748b',
      },
    },
    {
      x: dates,
      y: negativeData,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: '负面',
      line: {
        color: '#ef4444',
        width: 3,
      },
      marker: {
        size: 8,
        color: '#ef4444',
      },
    },
  ];

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
    font: {
      color: '#e2e8f0',
      family: 'Inter, sans-serif',
    },
    xaxis: {
      title: { text: '日期' },
      gridcolor: 'rgba(100, 116, 139, 0.2)',
      color: '#94a3b8',
    },
    yaxis: {
      title: { text: '评论数量' },
      gridcolor: 'rgba(100, 116, 139, 0.2)',
      color: '#94a3b8',
    },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      x: 0.5,
      xanchor: 'center' as const,
      y: -0.15,
      font: {
        color: '#e2e8f0',
        size: 12,
      },
    },
    margin: {
      l: 60,
      r: 20,
      t: 20,
      b: 80,
    },
    height: 400,
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
