import React from 'react'

export default function TransactionResult({ result, onBack }) {
  if (!result) {
    return (
      <section>
        <h2>Transaction Verification Result</h2>
        <p>Loading...</p>
      </section>
    )
  }

  const isFraudulent = result.isFraud || result.prediction === 1
  const confidence = isFraudulent 
    ? (result.probabilityFraud || result.confidence || 0) 
    : (result.probabilityNonFraud || (1 - result.confidence) || 0)

  return (
    <section className="transaction-result">
      <h2>Transaction Verification Result</h2>
      
      <div className={`result-card ${isFraudulent ? 'fraud' : 'legitimate'}`}>
        <div className="result-icon">
          {isFraudulent ? (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          ) : (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          )}
        </div>

        <h3 className="result-title">
          {isFraudulent ? '⚠️ Fraudulent Transaction Detected' : '✓ Transaction Appears Legitimate'}
        </h3>

        <p className="result-description">
          {isFraudulent 
            ? 'This transaction has been flagged as potentially fraudulent. Please review the details carefully and take appropriate action.'
            : 'This transaction appears to be legitimate based on the analysis. No fraud indicators were detected.'}
        </p>

        <div className="result-confidence">
          <label>Confidence Score:</label>
          <div className="confidence-bar">
            <div 
              className="confidence-fill"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="confidence-value">{(confidence * 100).toFixed(2)}%</span>
        </div>

        {result.modelType && (
          <div className="result-metric">
            <label>Model Type:</label>
            <span className="metric-value">{result.modelType}</span>
          </div>
        )}

        {result.probabilityFraud !== undefined && (
          <div className="result-metric">
            <label>Fraud Probability:</label>
            <span className="metric-value">{(result.probabilityFraud * 100).toFixed(2)}%</span>
          </div>
        )}

        {result.probabilityNonFraud !== undefined && (
          <div className="result-metric">
            <label>Non-Fraud Probability:</label>
            <span className="metric-value">{(result.probabilityNonFraud * 100).toFixed(2)}%</span>
          </div>
        )}
      </div>

      {result.details && (
        <div className="result-details">
          <h4>Transaction Details</h4>
          <div className="details-grid">
            {Object.entries(result.details).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.reasons && result.reasons.length > 0 && (
        <div className="result-reasons">
          <h4>Key Factors</h4>
          <ul>
            {result.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="result-actions">
        <button className="chat-btn check-btn" onClick={onBack}>
          Check Another Transaction
        </button>
      </div>
    </section>
  )
}
