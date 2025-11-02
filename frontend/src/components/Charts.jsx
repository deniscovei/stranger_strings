import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ResponsiveContainer
} from 'recharts';
import { fetchChartData } from '../api';

const COLORS = ['#2ecc71', '#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];

const Charts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const chartData = await fetchChartData();
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
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px', color: '#2c3e50' }}>
        📊 Transaction Analytics Dashboard
      </h1>

      {/* 1. Fraud Distribution */}
      <ChartCard title="Fraud Distribution">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.fraudDistribution || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3498db">
              {(data?.fraudDistribution || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Fraud' ? '#e74c3c' : '#2ecc71'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Top Merchants */}
      <ChartCard title="Top 10 Merchants">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data?.topMerchants || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#9b59b6" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3. Transaction Types */}
      <ChartCard title="Transaction Types Distribution">
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 4. Fraud by Category */}
      <ChartCard title="Fraud Rate by Merchant Category">
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={data?.fraudByCategory || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="category" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="fraudRate" fill="#e74c3c" name="Fraud Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 5. Countries Distribution */}
      <ChartCard title="Top Countries by Transaction Count">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.countries || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="country" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#1abc9c" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 6. Card Present Analysis */}
      <ChartCard title="Fraud Rate: Card Present vs Not Present">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.cardPresent || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="fraudRate" fill="#f39c12" name="Fraud Rate (%)">
              {(data?.cardPresent || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.status === 'Present' ? '#2ecc71' : '#e74c3c'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 7. Amount Distribution */}
      <ChartCard title="Transaction Amount Comparison">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.amountStats || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="mean" fill="#3498db" name="Mean Amount ($)" />
            <Bar dataKey="median" fill="#9b59b6" name="Median Amount ($)" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <h2 style={{
      marginBottom: '20px',
      color: '#2c3e50',
      fontSize: '20px',
      fontWeight: 'bold'
    }}>
      {title}
    </h2>
    {children}
  </div>
);

export default Charts;
