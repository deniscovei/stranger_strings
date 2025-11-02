import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SqlQuery = () => {
  const [query, setQuery] = useState('SELECT * FROM transactions LIMIT 10;');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [schema, setSchema] = useState([]);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [prompt, setPrompt] = useState('');
  const [generatingQuery, setGeneratingQuery] = useState(false);
  const [queryAnimating, setQueryAnimating] = useState(false);

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

    try {
      const res = await axios.post('/sql/execute', { query: sqlQuery });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
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
    <div style={{
      padding: '20px',
      backgroundColor: isDark ? '#0f172a' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '30px',
        color: isDark ? '#e5e7eb' : '#2c3e50'
      }}>
        🗃️ SQL Query Tool
      </h1>

      {/* Main Layout */}
      <div style={{ marginBottom: '20px' }}>
        {/* Tables Dropdown & Schema */}
        <div style={{
          backgroundColor: isDark ? '#0b1220' : 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          border: isDark ? '1px solid #1f2937' : 'none'
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: isDark ? '#e5e7eb' : '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                📋 Select Table:
              </label>
              <select
                value={selectedTable || ''}
                onChange={(e) => loadTableSchema(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
                  backgroundColor: isDark ? '#111827' : '#f9fafb',
                  color: isDark ? '#e5e7eb' : '#111827',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${isDark ? '%23cbd5e1' : '%23374151'}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '40px'
                }}
              >
                <option value="">-- Select a table --</option>
                {tables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            </div>

            {selectedTable && schema.length > 0 && (
              <div style={{ flex: '2 1 400px', minWidth: '300px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: isDark ? '#e5e7eb' : '#2c3e50',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  📝 Columns in {selectedTable}:
                </label>
                <div style={{
                  padding: '10px',
                  backgroundColor: isDark ? '#111827' : '#f9fafb',
                  borderRadius: '6px',
                  border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {schema.map(col => (
                    <span key={col.name} style={{
                      padding: '4px 10px',
                      backgroundColor: isDark ? '#0b1220' : 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: isDark ? '#94a3b8' : '#6b7280',
                      border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
                      whiteSpace: 'nowrap'
                    }}>
                      <strong style={{ color: isDark ? '#cbd5e1' : '#374151' }}>{col.name}</strong>
                      <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.7 }}>({col.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Query Generator */}
        <div style={{
          backgroundColor: isDark ? '#0b1220' : 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
          border: isDark ? '1px solid #1f2937' : 'none'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: isDark ? '#e5e7eb' : '#2c3e50',
            fontSize: '16px'
          }}>
            🤖 AI Query Generator
          </h3>
          
          <div style={{ marginBottom: '12px' }}>
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
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '6px',
                border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
                backgroundColor: isDark ? '#111827' : '#f9fafb',
                color: isDark ? '#e5e7eb' : '#111827',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.target.style.borderColor = isDark ? '#1f2937' : '#e5e7eb'}
            />
          </div>

          <button
            onClick={() => generateQuery(false)}
            disabled={generatingQuery}
            style={{
              padding: '12px 24px',
              backgroundColor: generatingQuery ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: generatingQuery ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              width: '100%'
            }}
            onMouseEnter={(e) => !generatingQuery && (e.target.style.backgroundColor = '#7c3aed')}
            onMouseLeave={(e) => !generatingQuery && (e.target.style.backgroundColor = '#8b5cf6')}
          >
            {generatingQuery ? '⏳ Generating Query...' : '✨ Generate Query with AI'}
          </button>
        </div>

        {/* Query Editor */}
        <div>
          <div style={{
            backgroundColor: isDark ? '#0b1220' : 'white',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
            border: isDark ? '1px solid #1f2937' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{
                margin: 0,
                color: isDark ? '#e5e7eb' : '#2c3e50',
                fontSize: '16px'
              }}>
                ✏️ Query Editor
              </h3>
              <span style={{
                fontSize: '12px',
                color: isDark ? '#94a3b8' : '#6b7280'
              }}>
                Ctrl+Enter to execute
              </span>
            </div>

            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your SQL query here..."
              style={{
                width: '100%',
                height: '150px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: '"Courier New", monospace',
                borderRadius: '6px',
                border: queryAnimating 
                  ? '2px solid #8b5cf6' 
                  : (isDark ? '1px solid #1f2937' : '1px solid #e5e7eb'),
                backgroundColor: queryAnimating 
                  ? (isDark ? '#1e1b4b' : '#f5f3ff')
                  : (isDark ? '#111827' : '#f9fafb'),
                color: isDark ? '#e5e7eb' : '#111827',
                resize: 'vertical',
                outline: 'none',
                transition: 'all 0.3s ease-in-out',
                boxSizing: 'border-box',
                transform: queryAnimating ? 'scale(1.01)' : 'scale(1)',
                boxShadow: queryAnimating 
                  ? '0 0 20px rgba(139, 92, 246, 0.4)' 
                  : 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
              onBlur={(e) => e.target.style.borderColor = isDark ? '#1f2937' : '#e5e7eb'}
            />

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => executeQuery()}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#9ca3af' : '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s, transform 0.1s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4338ca')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#4f46e5')}
              >
                {loading ? '⏳ Executing...' : '▶️ Execute Query'}
              </button>

              <button
                onClick={() => insertSampleQuery('SELECT * FROM transactions LIMIT 10;')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  color: isDark ? '#e5e7eb' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Sample Query
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
            <div style={{
              backgroundColor: isDark ? '#2b1a1a' : '#fee2e2',
              border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`,
              color: isDark ? '#fecaca' : '#991b1b',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <strong>❌ Error:</strong> {error}
            </div>
          )}

        {/* Results Display */}
        {result && (
          <div style={{
            backgroundColor: isDark ? '#0b1220' : 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
            border: isDark ? '1px solid #1f2937' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{
                margin: 0,
                color: isDark ? '#e5e7eb' : '#2c3e50',
                fontSize: '16px'
              }}>
                📊 Results
              </h3>
              <div style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#6b7280' }}>
                {result.rowCount} rows • {result.executionTime}s
              </div>
            </div>

            {/* Horizontal scroll wrapper with custom scrollbar */}
            <div style={{ 
              overflowX: 'auto', 
              overflowY: 'auto',
              maxHeight: '500px',
              border: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
              borderRadius: '6px'
            }}>
              <table style={{
                width: 'max-content',
                minWidth: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: isDark ? '#111827' : '#f9fafb',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    {result.columns.map((col, idx) => (
                      <th key={idx} style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        borderBottom: isDark ? '2px solid #1f2937' : '2px solid #e5e7eb',
                        color: isDark ? '#cbd5e1' : '#374151',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        minWidth: '120px'
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} style={{
                      backgroundColor: rowIdx % 2 === 0 
                        ? (isDark ? '#0b1220' : 'white') 
                        : (isDark ? '#111827' : '#f9fafb')
                    }}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} style={{
                          padding: '8px 12px',
                          borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e5e7eb',
                          color: isDark ? '#e5e7eb' : '#111827',
                          whiteSpace: 'nowrap',
                          minWidth: '120px'
                        }}>
                          {cell === null ? <em style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>NULL</em> : String(cell)}
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
