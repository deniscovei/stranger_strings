import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

export default function Predictions({ predictions }) {
  if (!predictions) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-title">🤖 Model Predictions</h2>
        <p className="dashboard-empty">No predictions available. The frontend expects GET /api/predictions returning an object with fields <code>predictions</code> and <code>feature_importance</code>.</p>
      </section>
    )
  }

  const { predictions: preds = [], feature_importance: fi = [] } = predictions

  // Calculate statistics
  const totalPredictions = preds.length
  const avgScore = preds.length > 0 ? (preds.reduce((sum, p) => sum + (p.score || 0), 0) / preds.length).toFixed(3) : 0
  const positives = preds.filter(p => p.prediction === true || p.prediction === 1 || p.prediction === 'true').length
  const negatives = totalPredictions - positives

  const FEATURE_COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

  return (
    <section className="dashboard-section">
      <h2 className="dashboard-title">Model Predictions & Insights</h2>

      {/* Prediction Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-card-accent">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">Total Predictions</div>
            <div className="stat-value">{totalPredictions}</div>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Positive</div>
            <div className="stat-value">{positives}</div>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-label">Negative</div>
            <div className="stat-value">{negatives}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Avg Confidence</div>
            <div className="stat-value">{(avgScore * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="dashboard-table-container">
        <h3 className="dashboard-subtitle">Recent Predictions</h3>
        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Prediction</th>
                <th>Confidence Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {preds.slice(0, 10).map((p) => (
                <tr key={p.id}>
                  <td><span className="table-id">#{p.id}</span></td>
                  <td>
                    <span className={`prediction-badge ${String(p.prediction) === 'true' || p.prediction === 1 ? 'positive' : 'negative'}`}>
                      {String(p.prediction)}
                    </span>
                  </td>
                  <td>
                    <div className="score-bar-container">
                      <div className="score-bar" style={{ width: `${(p.score || 0) * 100}%` }}></div>
                      <span className="score-text">{((p.score || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>
                    {p.score > 0.8 ? (
                      <span className="status-badge high">High</span>
                    ) : p.score > 0.5 ? (
                      <span className="status-badge medium">Medium</span>
                    ) : (
                      <span className="status-badge low">Low</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Importance */}
      {fi.length > 0 && (
        <div className="chart-container">
          <h3 className="chart-title">Feature Importance Analysis</h3>
          <div className="chart-wrapper" style={{ height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={fi} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis 
                  type="number" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="feature" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(249, 115, 22, 0.2)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                  {fi.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FEATURE_COLORS[index % FEATURE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}
