import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SqlQuery = () => {
  const [query, setQuery] = useState(() => {
    return localStorage.getItem('sqlQuery_query') || 'SELECT * FROM transactions LIMIT 10;'
  });
  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem('sqlQuery_result')
    return saved ? JSON.parse(saved) : null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(() => {
    return localStorage.getItem('sqlQuery_selectedTable') || null
  });
  const [schema, setSchema] = useState([]);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [prompt, setPrompt] = useState('');
  const [generatingQuery, setGeneratingQuery] = useState(false);
  const [queryAnimating, setQueryAnimating] = useState(false);
  const [explanation, setExplanation] = useState(() => {
    const saved = localStorage.getItem('sqlQuery_explanation')
    return saved ? JSON.parse(saved) : null
  });
  const [generatingExplanation, setGeneratingExplanation] = useState(false);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('sqlQuery_query', query);
  }, [query]);

  useEffect(() => {
    if (result) {
      localStorage.setItem('sqlQuery_result', JSON.stringify(result));
    }
  }, [result]);

  useEffect(() => {
    if (selectedTable) {
      localStorage.setItem('sqlQuery_selectedTable', selectedTable);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (explanation) {
      localStorage.setItem('sqlQuery_explanation', JSON.stringify(explanation));
    }
  }, [explanation]);

  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Load tables on mount
    loadTables();
    
    return () => observer.disconnect();
  }, []);

  const loadTables = async () => {
    try {
      const res = await axios.get('/sql/tables');
      setTables(res.data.tables || []);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  };

  const loadTableSchema = async (tableName) => {
    try {
      const res = await axios.get(`/sql/table/${tableName}/schema`);
      setSchema(res.data.columns || []);
      setSelectedTable(tableName);
    } catch (err) {
      console.error('Failed to load schema:', err);
    }
  };

  const generateQuery = async (autoExecute = false) => {
    if (!prompt.trim()) {
      setError('Please enter a description of what you want to query.');
      return;
    }

    setGeneratingQuery(true);
    setError(null);

    try {
      const res = await axios.post('/sql/generate', { prompt });
      const generatedQuery = res.data.query;
      
      // Trigger animation
      setQueryAnimating(true);
      setQuery(generatedQuery);
      setGeneratingQuery(false);
      
      // Reset animation after it completes
      setTimeout(() => setQueryAnimating(false), 600);
      
      if (autoExecute) {
        // Auto-execute after a brief delay to show the query
        setTimeout(() => executeQuery(generatedQuery), 800);
      }
    } catch (err) {
      setGeneratingQuery(false);
      setError(err.response?.data?.error || 'Failed to generate query');
    }
  };

  const executeQuery = async (queryToExecute = null) => {
    const sqlQuery = queryToExecute || query;
    if (!sqlQuery.trim()) {
      setError('Query cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setExplanation(null);

    try {
      const res = await axios.post('/sql/execute', { query: sqlQuery });
      setResult(res.data);
      
      // Generate explanation for the results
      if (res.data && res.data.rows && res.data.rows.length > 0) {
        generateExplanation(sqlQuery, res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateExplanation = async (sqlQuery, resultData) => {
    setGeneratingExplanation(true);
    try {
      const res = await axios.post('/sql/explain', {
        query: sqlQuery,
        result: {
          columns: resultData.columns,
          rowCount: resultData.rowCount,
          sampleRows: resultData.rows.slice(0, 5) // Send only first 5 rows for context
        }
      });
      setExplanation(res.data.explanation);
    } catch (err) {
      console.error('Failed to generate explanation:', err);
      // Don't set error - explanation is optional
    } finally {
      setGeneratingExplanation(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  const insertSampleQuery = (sampleQuery) => {
    setQuery(sampleQuery);
  };

  return (
    <div className="sql-query-container">
      <h2>SQL Query Tool</h2>

      {/* Main Layout */}
      <div className="sql-query-content">
        {/* Tables Dropdown & Schema */}
        <div className="sql-card">
          <div className="sql-tables-section">
            <div className="sql-table-selector">
              <label className="sql-label">
                Select Table:
              </label>
              <select
                value={selectedTable || ''}
                onChange={(e) => loadTableSchema(e.target.value)}
                className="sql-select"
              >
                <option value="">-- Select a table --</option>
                {tables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            </div>

            {selectedTable && schema.length > 0 && (
              <div className="sql-schema-display">
                <label className="sql-label">
                  Columns in {selectedTable}:
                </label>
                <div className="sql-columns-grid">
                  {schema.map(col => (
                    <span key={col.name} className="sql-column-badge">
                      <strong>{col.name}</strong>
                      <span className="sql-column-type">({col.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Query Generator */}
        <div className="sql-card">
          <h3 className="sql-card-title">
            AI Query Generator
          </h3>
          
          <div className="sql-prompt-section">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  generateQuery(false);
                }
              }}
              placeholder="Describe what you want to query... (e.g., 'Show me top 10 fraudulent transactions')"
              className="sql-input"
            />
          </div>

          <button
            onClick={() => generateQuery(false)}
            disabled={generatingQuery}
            className={`sql-generate-btn ${generatingQuery ? 'disabled' : ''}`}
          >
            {generatingQuery ? 'Generating Query...' : 'Generate Query with AI'}
          </button>
        </div>

        {/* Query Editor */}
        <div className="sql-card">
          <div className="sql-editor-header">
            <h3 className="sql-card-title">
              Query Editor
            </h3>
            <span className="sql-hint">
              Ctrl+Enter to execute
            </span>
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your SQL query here..."
            className={`sql-textarea ${queryAnimating ? 'animating' : ''}`}
          />

          <div className="sql-button-group">
            <button
              onClick={() => executeQuery()}
              disabled={loading}
              className={`sql-execute-btn ${loading ? 'disabled' : ''}`}
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </button>

            <button
              onClick={() => insertSampleQuery('SELECT * FROM transactions LIMIT 10;')}
              className="sql-sample-btn"
            >
              Sample Query
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="sql-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* AI Explanation - Show before results */}
        {result && (generatingExplanation || explanation) && (
          <div className="sql-card sql-ai-explanation">
            <div className="sql-ai-icon">🤖</div>
            <div className="sql-ai-content">
              <div className="sql-ai-title">AI Analysis</div>
              {generatingExplanation ? (
                <div className="sql-ai-loading">⏳ Analyzing results...</div>
              ) : (
                <div className="sql-ai-text">{explanation}</div>
              )}
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="sql-card">
            <div className="sql-results-header">
              <h3 className="sql-card-title">
                Results
              </h3>
              <div className="sql-results-info">
                {result.rowCount} rows • {result.executionTime}s
              </div>
            </div>

            <div className="sql-table-wrapper">
              <table className="sql-table">
                <thead>
                  <tr>
                    {result.columns.map((col, idx) => (
                      <th key={idx}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx}>
                          {cell === null ? <em className="sql-null">NULL</em> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SqlQuery;
