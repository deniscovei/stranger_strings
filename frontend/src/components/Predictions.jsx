import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Predictions({ predictions }) {
  if (!predictions) {
    return (
      <section>
        <h2>Model Predictions</h2>
        <p>No predictions available. The frontend expects GET /api/predictions returning an object with fields <code>predictions</code> and <code>feature_importance</code>.</p>
      </section>
    )
  }

  const { predictions: preds = [], feature_importance: fi = [] } = predictions

  return (
    <section>
      <h2>Model Predictions</h2>

      <h3>Predictions Table</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>prediction</th>
              <th>score</th>
            </tr>
          </thead>
          <tbody>
            {preds.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{String(p.prediction)}</td>
                <td>{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Feature Importance</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={fi} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="feature" />
            <Tooltip />
            <Bar dataKey="importance" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
