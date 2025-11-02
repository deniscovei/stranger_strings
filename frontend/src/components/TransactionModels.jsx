import React from 'react'

export default function TransactionModal({ transaction, onClose }) {
  if (!transaction) return null

  const isFraud = transaction.isFraud === 1 || transaction.isFraud === true

  // Format field names from camelCase to readable text
  const formatFieldName = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim()
  }

  // Format field values
  const formatFieldValue = (key, value) => {
    if (value === null || value === undefined || value === '') return null

    // Format dates
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        }
      } catch (e) {
        // If date parsing fails, return original value
      }
    }

    // Format amounts
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('money') || 
        key.toLowerCase().includes('balance') || key.toLowerCase().includes('limit')) {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    }

    // Format boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    // Format fraud status specially
    if (key === 'isFraud') {
      return value ? '🚨 Fraud Detected' : '✅ Legitimate'
    }

    return String(value)
  }

  // Get all non-null fields
  const nonNullFields = Object.entries(transaction)
    .filter(([key, value]) => {
      if (value === null || value === undefined || value === '') return false
      return true
    })
    .map(([key, value]) => ({
      key,
      label: formatFieldName(key),
      value: formatFieldValue(key, value)
    }))
    .filter(field => field.value !== null)

  return (
    <div className="transaction-modal-overlay" onClick={onClose}>
      <div className={`transaction-modal ${isFraud ? 'fraud-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3>Transaction Details</h3>
            <span className={`status-badge ${isFraud ? 'fraud' : 'legitimate'}`}>
              {isFraud ? 'Fraud' : 'Legitimate'}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="modal-body">
          <div className="details-grid">
            {nonNullFields.map(({ key, label, value }) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{label}:</span>
                <span className={`detail-value ${key === 'isFraud' ? (isFraud ? 'fraud-value' : 'legitimate-value') : ''}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {nonNullFields.length === 0 && (
            <p className="no-data">No transaction data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
