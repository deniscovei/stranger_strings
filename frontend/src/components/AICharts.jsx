import React, { useState, useEffect } from 'react'
import { generateAIChart } from '../api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function AICharts() {
  const [prompt, setPrompt] = useState(() => {
    return localStorage.getItem('aiCharts_prompt') || ''
  })
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState(() => {
    const saved = localStorage.getItem('aiCharts_chartData')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved chart data:', e)
      }
    }
    return null
  })
  const [chartType, setChartType] = useState(() => {
    return localStorage.getItem('aiCharts_chartType') || 'bar'
  })
  const [error, setError] = useState(null)

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('aiCharts_prompt', prompt)
  }, [prompt])

  useEffect(() => {
    if (chartData) {
      localStorage.setItem('aiCharts_chartData', JSON.stringify(chartData))
    } else {
      localStorage.removeItem('aiCharts_chartData')
    }
  }, [chartData])

  useEffect(() => {
    localStorage.setItem('aiCharts_chartType', chartType)
  }, [chartType])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await generateAIChart(prompt)
      setChartData(response.data)
      setChartType(response.type || 'bar')
    } catch (err) {
      console.error('Failed to generate chart:', err)
      setError('Failed to generate chart. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const renderChart = () => {
    if (!chartData) return null

    const chartConfig = {
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: chartData.title || 'AI Generated Chart'
          }
        }
      }
    }

    switch (chartType) {
      case 'line':
        return <Line {...chartConfig} />
      case 'pie':
        return <Pie {...chartConfig} />
      case 'bar':
      default:
        return <Bar {...chartConfig} />
    }
  }

  return (
    <div className="ai-charts-container">
      <div className="chart-prompt-section">
        <div className="prompt-input-wrapper">
          <textarea
            className="chart-prompt-input"
            placeholder="Example: Show me a bar chart of total transaction amounts by merchant for the top 10 merchants..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={4}
          />
          <button
            className="generate-chart-btn"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Generating...
              </>
            ) : (
              <>
                <span className="chart-icon">📊</span>
                Generate Chart
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="chart-error-message">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="chart-loading-state">
          <div className="chart-loader"></div>
          <p>AI is analyzing your request and generating the chart...</p>
        </div>
      )}

      {chartData && !loading && (
        <div className="chart-display-section">
          <div className="chart-container">
            {renderChart()}
          </div>
          
          <div className="chart-actions">
            <button
              className="chart-action-btn"
              onClick={() => setChartData(null)}
            >
              Clear Chart
            </button>
            <button
              className="chart-action-btn secondary"
              onClick={handleGenerate}
              disabled={loading}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {!chartData && !loading && (
        <div className="chart-empty-state">
          <div className="empty-chart-icon">📈</div>
          <h3>No chart yet</h3>
          <p>Enter a prompt above to generate a chart using AI</p>
          <div className="chart-examples">
            <p className="examples-title">Try these examples:</p>
            <button
              className="example-prompt"
              onClick={() => setPrompt('Show me a bar chart of fraud vs legitimate transactions by month')}
            >
              Fraud trends by month
            </button>
            <button
              className="example-prompt"
              onClick={() => setPrompt('Create a pie chart showing the distribution of transaction amounts by category')}
            >
              Transactions by category
            </button>
            <button
              className="example-prompt"
              onClick={() => setPrompt('Show me a line chart of average transaction amounts over time')}
            >
              Average amounts over time
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
