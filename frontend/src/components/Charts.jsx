import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ResponsiveContainer
} from 'recharts';
import { fetchChartData } from '../api';
import AICharts from './AICharts';

// Modern vibrant color palette
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
const DARK_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#22d3ee'];

const Charts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [view, setView] = useState(() => {
    return localStorage.getItem('charts_view') || 'analytics'
  });

  // Save view preference to localStorage
  useEffect(() => {
    localStorage.setItem('charts_view', view);
  }, [view]);

  useEffect(() => {
    loadChartData();
    
    // Watch for theme changes on <html> element
    const observer = new MutationObserver(() => {
      const darkMode = document.documentElement.classList.contains('dark');
      console.log('Theme changed! Dark mode:', darkMode);
      setIsDark(darkMode);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  console.log('Current isDark state:', isDark);

  const loadChartData = async () => {
    try {
      setLoading(true);
      console.log('Fetching chart data...');
      const chartData = await fetchChartData();
      console.log('Chart data received:', chartData);
      setData(chartData);
      setLoading(false);
    } catch (err) {
      console.error('Chart data error', err);
      setError(err.message || 'Failed to load chart data');
      setLoading(false);
    }
  };

  const chartColors = isDark ? DARK_COLORS : COLORS;

  return (
    <div className="charts-page">
      <div className="charts-header">
        <h1>Transaction Analytics Dashboard</h1>
        <p>Comprehensive analysis of transaction patterns and fraud detection metrics</p>
        
        {/* View Toggle Buttons - Always visible */}
        <div className="chart-view-toggle">
          <button 
            className={`view-toggle-btn ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => setView('analytics')}
          >
            📊 Analytics Charts
          </button>
          <button 
            className={`view-toggle-btn ${view === 'ai-generator' ? 'active' : ''}`}
            onClick={() => setView('ai-generator')}
          >
            🤖 AI Chart Generator
          </button>
        </div>
      </div>

      {view === 'ai-generator' ? (
        <AICharts />
      ) : loading ? (
        <div className="charts-loading-container">
          <div className="charts-loader-wrapper">
            <div className="charts-loader">
              <div className="loader-bar"></div>
              <div className="loader-bar"></div>
              <div className="loader-bar"></div>
              <div className="loader-bar"></div>
              <div className="loader-bar"></div>
            </div>
            <h2>Loading Analytics...</h2>
            <p>Fetching transaction data and generating visualizations</p>
          </div>
        </div>
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
          <h2>Error loading data: {error}</h2>
          <p>Check browser console for details</p>
          <button onClick={loadChartData} style={{ marginTop: '20px', padding: '10px 20px' }}>
            Retry
          </button>
        </div>
      ) : !data ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>No data available</h2>
          <p>Check console: {JSON.stringify(data)}</p>
        </div>
      ) : (
        <div className="analytics-charts-container">

      {/* 1. Fraud Distribution */}
      <div className="chart-card">
        <h3 className="chart-title">Fraud Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.fraudDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Bar dataKey="count" activeBar={false}>
              {(data?.fraudDistribution || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Fraud' ? (isDark ? '#f472b6' : '#ec4899') : (isDark ? '#34d399' : '#10b981')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Top 15 Merchants */}
      <div className="chart-card">
        <h3 className="chart-title">Top 15 Merchants</h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={data?.topMerchants || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis dataKey="name" type="category" width={150} stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="count" fill={isDark ? '#a78bfa' : '#8b5cf6'} activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Transaction Types */}
      <div className="chart-card">
        <h3 className="chart-title">Transaction Types Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={(data?.transactionTypes || []).sort((a, b) => b.value - a.value)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {(data?.transactionTypes || []).sort((a, b) => b.value - a.value).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Fraud by Category */}
      <div className="chart-card">
        <h3 className="chart-title">Fraud Rate by Merchant Category</h3>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={data?.fraudByCategory || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis dataKey="category" type="category" width={150} stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="fraudRate" fill={isDark ? '#f87171' : '#e74c3c'} name="Fraud Rate (%)" activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5. Countries Distribution */}
      <div className="chart-card">
        <h3 className="chart-title">Top Countries by Transaction Count</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.countries || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="country" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="count" fill={isDark ? '#22d3ee' : '#06b6d4'} activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 6. Card Present Analysis */}
      <div className="chart-card">
        <h3 className="chart-title">Fraud Rate: Card Present vs Not Present</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.cardPresent || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="status" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Bar dataKey="fraudRate" name="Fraud Rate (%)" activeBar={false}>
              {(data?.cardPresent || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.status === 'Present' ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#f472b6' : '#ec4899')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 7. Amount Distribution */}
      <div className="chart-card">
        <h3 className="chart-title">Transaction Amount Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.amountStats || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="type" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="mean" fill={isDark ? '#60a5fa' : '#3b82f6'} name="Mean Amount ($)" activeBar={false} />
            <Bar dataKey="median" fill={isDark ? '#a78bfa' : '#8b5cf6'} name="Median Amount ($)" activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 8. Fraud Trend Over Time */}
      {/* <div className="chart-card">
        <h3 className="chart-title">Fraud Trend Over Time (Monthly)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data?.fraudTrend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis yAxisId="left" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis yAxisId="right" orientation="right" stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Line yAxisId="left" type="monotone" dataKey="total" stroke={isDark ? '#60a5fa' : '#3498db'} strokeWidth={2} name="Total Transactions" activeDot={false} />
            <Line yAxisId="left" type="monotone" dataKey="frauds" stroke={isDark ? '#f87171' : '#e74c3c'} strokeWidth={2} name="Fraud Count" activeDot={false} />
            <Line yAxisId="right" type="monotone" dataKey="fraudRate" stroke={isDark ? '#fbbf24' : '#f39c12'} strokeWidth={2} name="Fraud Rate (%)" strokeDasharray="5 5" activeDot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div> */}

      {/* 9. Transaction Amount Distribution */}
      <div className="chart-card">
        <h3 className="chart-title">Transaction Amount Distribution</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data?.amountDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="range" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="count" fill={isDark ? '#60a5fa' : '#3b82f6'} name="Total Transactions" activeBar={false} />
            <Bar dataKey="frauds" fill={isDark ? '#f472b6' : '#ec4899'} name="Fraud Count" activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 10. Fraud by Hour of Day */}
      {/* <div className="chart-card">
        <h3 className="chart-title">Fraud Activity by Hour of Day</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data?.fraudByHour || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="hour" stroke={isDark ? '#94a3b8' : '#666'} label={{ value: 'Hour (0-23)', position: 'insideBottom', offset: -5 }} />
            <YAxis yAxisId="left" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis yAxisId="right" orientation="right" stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Line yAxisId="left" type="monotone" dataKey="total" stroke={isDark ? '#60a5fa' : '#3498db'} strokeWidth={2} name="Total Transactions" activeDot={false} />
            <Line yAxisId="left" type="monotone" dataKey="frauds" stroke={isDark ? '#f87171' : '#e74c3c'} strokeWidth={2} name="Fraud Count" activeDot={false} />
            <Line yAxisId="right" type="monotone" dataKey="fraudRate" stroke={isDark ? '#fbbf24' : '#f39c12'} strokeWidth={2} name="Fraud Rate (%)" strokeDasharray="5 5" activeDot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div> */}

      {/* 11. Top Merchants by Fraud Count */}
      <div className="chart-card">
        <h3 className="chart-title">Top 10 Merchants by Fraud Count</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data?.topFraudMerchants || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis dataKey="name" type="category" width={150} stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="frauds" fill={isDark ? '#f472b6' : '#ec4899'} name="Fraud Count" activeBar={false} />
            <Bar dataKey="fraudRate" fill={isDark ? '#fbbf24' : '#f59e0b'} name="Fraud Rate (%)" activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 12. Transaction Type vs Fraud Rate */}
      <div className="chart-card">
        <h3 className="chart-title">Fraud Rate by Transaction Type</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data?.transactionTypeFraud || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="type" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="fraudRate" fill={isDark ? '#f472b6' : '#ec4899'} name="Fraud Rate (%)" activeBar={false} />
            <Bar dataKey="total" fill={isDark ? '#60a5fa' : '#3b82f6'} name="Total Transactions" activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
        </div>
      )}
    </div>
  );
};

export default Charts;
