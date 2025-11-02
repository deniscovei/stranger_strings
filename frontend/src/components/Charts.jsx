import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ResponsiveContainer
} from 'recharts';
import { fetchChartData } from '../api';

// Modern vibrant color palette
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
const DARK_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#22d3ee'];

const Charts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading charts...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
        <h2>Error loading data: {error}</h2>
        <p>Check browser console for details</p>
        <button onClick={loadChartData} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>No data available</h2>
        <p>Check console: {JSON.stringify(data)}</p>
      </div>
    );
  }

  const chartColors = isDark ? DARK_COLORS : COLORS;

  return (
    <div style={{ padding: '20px', backgroundColor: isDark ? '#0f172a' : '#f5f5f5' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px', color: isDark ? '#e5e7eb' : '#2c3e50' }}>
        📊 Transaction Analytics Dashboard
      </h1>

      {/* 1. Fraud Distribution */}
      <ChartCard title="Fraud Distribution" isDark={isDark}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.fraudDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="count" fill="#3b82f6">
              {(data?.fraudDistribution || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Fraud' ? (isDark ? '#f472b6' : '#ec4899') : (isDark ? '#34d399' : '#10b981')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Top 15 Merchants */}
      <ChartCard title="Top 15 Merchants" isDark={isDark}>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={data?.topMerchants || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis dataKey="name" type="category" width={150} stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="count" fill={isDark ? '#a78bfa' : '#8b5cf6'} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3. Transaction Types */}
      <ChartCard title="Transaction Types Distribution" isDark={isDark}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data?.transactionTypes || []}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {(data?.transactionTypes || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 4. Fraud by Category */}
      <ChartCard title="Fraud Rate by Merchant Category" isDark={isDark}>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={data?.fraudByCategory || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis dataKey="category" type="category" width={150} stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="fraudRate" fill={isDark ? '#f87171' : '#e74c3c'} name="Fraud Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 5. Countries Distribution */}
      <ChartCard title="Top Countries by Transaction Count" isDark={isDark}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.countries || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="country" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="count" fill={isDark ? '#22d3ee' : '#06b6d4'} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 6. Card Present Analysis */}
      <ChartCard title="Fraud Rate: Card Present vs Not Present" isDark={isDark}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.cardPresent || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="status" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="fraudRate" fill={isDark ? '#fbbf24' : '#f59e0b'} name="Fraud Rate (%)">
              {(data?.cardPresent || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.status === 'Present' ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#f472b6' : '#ec4899')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 7. Amount Distribution */}
      <ChartCard title="Transaction Amount Comparison" isDark={isDark}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.amountStats || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="type" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="mean" fill={isDark ? '#60a5fa' : '#3b82f6'} name="Mean Amount ($)" />
            <Bar dataKey="median" fill={isDark ? '#a78bfa' : '#8b5cf6'} name="Median Amount ($)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 8. Fraud Trend Over Time */}
      <ChartCard title="Fraud Trend Over Time (Monthly)" isDark={isDark}>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data?.fraudTrend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis yAxisId="left" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis yAxisId="right" orientation="right" stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Line yAxisId="left" type="monotone" dataKey="total" stroke={isDark ? '#60a5fa' : '#3498db'} strokeWidth={2} name="Total Transactions" />
            <Line yAxisId="left" type="monotone" dataKey="frauds" stroke={isDark ? '#f87171' : '#e74c3c'} strokeWidth={2} name="Fraud Count" />
            <Line yAxisId="right" type="monotone" dataKey="fraudRate" stroke={isDark ? '#fbbf24' : '#f39c12'} strokeWidth={2} name="Fraud Rate (%)" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 9. Transaction Amount Distribution */}
      <ChartCard title="Transaction Amount Distribution" isDark={isDark}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data?.amountDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="range" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="count" fill={isDark ? '#60a5fa' : '#3b82f6'} name="Total Transactions" />
            <Bar dataKey="frauds" fill={isDark ? '#f472b6' : '#ec4899'} name="Fraud Count" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 10. Fraud by Hour of Day */}
      <ChartCard title="Fraud Activity by Hour of Day" isDark={isDark}>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data?.fraudByHour || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="hour" stroke={isDark ? '#94a3b8' : '#666'} label={{ value: 'Hour (0-23)', position: 'insideBottom', offset: -5 }} />
            <YAxis yAxisId="left" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis yAxisId="right" orientation="right" stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Line yAxisId="left" type="monotone" dataKey="total" stroke={isDark ? '#60a5fa' : '#3498db'} strokeWidth={2} name="Total Transactions" />
            <Line yAxisId="left" type="monotone" dataKey="frauds" stroke={isDark ? '#f87171' : '#e74c3c'} strokeWidth={2} name="Fraud Count" />
            <Line yAxisId="right" type="monotone" dataKey="fraudRate" stroke={isDark ? '#fbbf24' : '#f39c12'} strokeWidth={2} name="Fraud Rate (%)" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 11. Top Merchants by Fraud Count */}
      <ChartCard title="Top 10 Merchants by Fraud Count" isDark={isDark}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data?.topFraudMerchants || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis type="number" stroke={isDark ? '#94a3b8' : '#666'} />
            <YAxis dataKey="name" type="category" width={150} stroke={isDark ? '#94a3b8' : '#666'} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000' }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000' }} />
            <Bar dataKey="frauds" fill={isDark ? '#f472b6' : '#ec4899'} name="Fraud Count" />
            <Bar dataKey="fraudRate" fill={isDark ? '#fbbf24' : '#f59e0b'} name="Fraud Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 12. Transaction Type vs Fraud Rate */}
      <ChartCard title="Fraud Rate by Transaction Type" isDark={isDark}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data?.transactionTypeFraud || []}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1f2937' : '#e0e0e0'} />
            <XAxis dataKey="type" stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 12 }} />
            <YAxis stroke={isDark ? '#94a3b8' : '#666'} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', border: `1px solid ${isDark ? '#1f2937' : '#ccc'}`, color: isDark ? '#e5e7eb' : '#000', fontSize: 12 }} />
            <Legend wrapperStyle={{ color: isDark ? '#cbd5e1' : '#000', fontSize: 12 }} />
            <Bar dataKey="fraudRate" fill={isDark ? '#f472b6' : '#ec4899'} name="Fraud Rate (%)" />
            <Bar dataKey="total" fill={isDark ? '#60a5fa' : '#3b82f6'} name="Total Transactions" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

const ChartCard = ({ title, children, isDark }) => {
  console.log('ChartCard rendering with isDark:', isDark);
  
  return (
    <div className="chart-card" style={{
      backgroundColor: isDark ? '#0b1220' : '#ffffff',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '30px',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
      border: isDark ? '1px solid #1f2937' : 'none',
      transition: 'background-color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease'
    }}>
      <h2 style={{
        marginBottom: '20px',
        color: isDark ? '#e5e7eb' : '#2c3e50',
        fontSize: '20px',
        fontWeight: 'bold',
        transition: 'color 0.3s ease'
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
};

export default Charts;
