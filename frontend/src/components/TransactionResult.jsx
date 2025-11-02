import React from 'react'

export default function TransactionResult({ result, onBack, hideBackButton = false }) {
  if (!result) {
    return (
      <section>
        <h2>Transaction Verification Result</h2>
        <p>Loading...</p>
      </section>
    )
  }

  // Format feature name for display
  const formatFeatureName = (name) => {
    if (!name || typeof name !== 'string') return String(name)
    
    // Handle special prefixes
    let displayName = name
    
    // Handle "no" prefix (e.g., notransactionType -> No Transaction Type)
    if (name.startsWith('no') && name.length > 2 && name[2] === name[2].toLowerCase()) {
      displayName = 'No ' + name.substring(2)
    }
    
    // Remove underscores and convert to title case
    return displayName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
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
          {isFraudulent ? 'Fraudulent Transaction Detected' : 'Transaction Appears Legitimate'}
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
      </div>

      {result.shapExplanation && result.shapExplanation.explanation_available && (
        <div className="shap-explanation">
          <h4>🔍 Feature Impact Analysis {result.shapExplanation.note ? '(Anomaly Detection)' : '(SHAP)'}</h4>
          <p className="shap-description">
            {result.shapExplanation.note || 'These features had the most significant impact on the fraud prediction:'}
          </p>
          
          <div className="shap-features">
            {result.shapExplanation.top_features.map((feature, index) => {
              // Handle both SHAP values and contribution scores
              const isIncreasing = feature.impact === 'increases_fraud_risk' || feature.impact === 'increases_anomaly_score'
              const impactValue = feature.shap_value !== undefined ? feature.shap_value : feature.contribution
              const absValue = Math.abs(impactValue)
              const maxAbsValue = Math.max(...result.shapExplanation.top_features.map(f => 
                Math.abs(f.shap_value !== undefined ? f.shap_value : f.contribution)
              ))
              const barWidth = (absValue / maxAbsValue) * 100
              
              return (
                <div key={index} className="shap-feature-item">
                  <div className="shap-feature-header">
                    <span className="shap-feature-rank">#{index + 1}</span>
                    <span className="shap-feature-name" title={feature.feature}>
                      {formatFeatureName(feature.feature)}
                    </span>
                    <span className={`shap-feature-impact ${isIncreasing ? 'increase' : 'decrease'}`}>
                      {isIncreasing ? '⬆️ Increases Risk' : '⬇️ Decreases Risk'}
                    </span>
                  </div>
                  <div className="shap-feature-details">
                    <span className="shap-feature-value">
                      Value: <strong>{typeof feature.value === 'number' ? feature.value.toFixed(2) : feature.value}</strong>
                    </span>
                    <span className="shap-feature-shap">
                      {feature.shap_value !== undefined ? (
                        <>SHAP: <strong>{feature.shap_value.toFixed(4)}</strong></>
                      ) : (
                        <>Impact: <strong>{feature.contribution.toFixed(4)}</strong></>
                      )}
                    </span>
                  </div>
                  <div className="shap-bar-container">
                    <div 
                      className={`shap-bar ${isIncreasing ? 'positive' : 'negative'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="shap-footer">
            <p className="shap-note">
              💡 <strong>How to read this:</strong> {result.shapExplanation.note ? (
                'Features with higher values had more influence on the anomaly detection. The bar length shows the magnitude of each feature\'s contribution.'
              ) : (
                'Features with positive SHAP values push the prediction towards fraud, while negative values push it towards legitimate. The bar length shows the magnitude of the impact.'
              )}
            </p>
          </div>
        </div>
      )}

      {result.details && (
        <div className="transaction-details-section">
          <h4>💳 Transaction Details</h4>
          <div className="transaction-details-grid">
            {Object.entries(result.details)
              .filter(([key, value]) => {
                // Filter out isFraud field (already shown in main result card)
                if (key === 'isFraud') return false
                // Filter out empty, null, undefined values
                if (value === null || value === undefined || value === '') return false
                // Filter out 'N/A', 'null', 'undefined' strings
                if (typeof value === 'string' && (
                  value.toLowerCase() === 'n/a' || 
                  value.toLowerCase() === 'null' || 
                  value.toLowerCase() === 'undefined' ||
                  value.trim() === ''
                )) return false
                return true
              })
              .map(([key, value]) => {
                // Group related fields with icons
                let icon = '📌'
                const keyLower = key.toLowerCase()
              
              if (keyLower.includes('amount') || keyLower.includes('balance')) {
                icon = '💰'
              } else if (keyLower.includes('merchant') || keyLower.includes('name')) {
                icon = '🏪'
              } else if (keyLower.includes('date') || keyLower.includes('time')) {
                icon = '📅'
              } else if (keyLower.includes('card') || keyLower.includes('account')) {
                icon = '💳'
              } else if (keyLower.includes('country') || keyLower.includes('location')) {
                icon = '🌍'
              } else if (keyLower.includes('type') || keyLower.includes('category')) {
                icon = '🏷️'
              } else if (keyLower.includes('code') || keyLower.includes('mode')) {
                icon = '🔢'
              }
              
              // Format value based on type
              let displayValue
              let valueClass = ''
              
              if (typeof value === 'boolean') {
                displayValue = value ? '✓ Yes' : '✗ No'
                valueClass = value ? 'boolean-true' : 'boolean-false'
              } else if (typeof value === 'number') {
                displayValue = value.toFixed(2)
              } else {
                displayValue = value
              }
              
              return (
                <div key={key} className="transaction-detail-card">
                  <div className="detail-icon">{icon}</div>
                  <div className="detail-content">
                    <label className="detail-label">{formatFeatureName(key)}</label>
                    <span className={`detail-value ${valueClass}`}>
                      {displayValue}
                    </span>
                  </div>
                </div>
              )
              })}
          </div>
        </div>
      )}

      {result.reasons && result.reasons.length > 0 && (
        <div className="key-factors-section">
          <h4>🔍 Key Detection Factors</h4>
          <div className="factors-list">
            {result.reasons.map((reason, index) => (
              <div key={index} className="factor-item">
                <span className="factor-bullet">•</span>
                <span className="factor-text">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hideBackButton && (
        <div className="result-actions">
          <button className="chat-btn check-btn" onClick={onBack}>
            ← Back to Verification
          </button>
        </div>
      )}
    </section>
  )
}
