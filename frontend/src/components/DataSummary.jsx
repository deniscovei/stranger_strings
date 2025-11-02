import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

export default function DataSummary({ data }) {
  if (!data) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-title">📊 Data Summary</h2>
        <p className="dashboard-empty">No data available from backend. The frontend expects GET /api/data returning an array of items.</p>
      </section>
    )
  }

  // Example: assume data is an array of { category, value }
  const chartData = data

  // Calculate some statistics
  const totalValue = chartData.reduce((sum, item) => sum + (item.value || 0), 0)
  const avgValue = chartData.length > 0 ? (totalValue / chartData.length).toFixed(2) : 0
  const maxItem = chartData.reduce((max, item) => (item.value || 0) > (max.value || 0) ? item : max, chartData[0] || {})

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe']

  return (
    <section className="dashboard-section">
      <h2 className="dashboard-title">Data Overview</h2>
      
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">Total Value</div>
            <div className="stat-value">{totalValue.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Categories</div>
            <div className="stat-value">{chartData.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💡</div>
          <div className="stat-content">
            <div className="stat-label">Average</div>
            <div className="stat-value">{avgValue}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-label">Top Category</div>
            <div className="stat-value stat-value-small">{maxItem.category || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <h3 className="chart-title">Category Distribution</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis 
                dataKey="category" 
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
