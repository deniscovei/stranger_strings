import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DataSummary({ data }) {
  if (!data) {
    return (
      <section>
        <h2>Data Summary</h2>
        <p>No data available from backend. The frontend expects GET /api/data returning an array of items.</p>
      </section>
    )
  }

  // Example: assume data is an array of { category, value }
  const chartData = data

  return (
    <section>
      <h2>Data Summary</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
