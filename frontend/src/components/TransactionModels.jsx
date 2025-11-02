import React from 'react'

export default function TransactionModal({ transaction, onClose }) {
  if (!transaction) return null

  return (
    <div className="transaction-modal-overlay" onClick={onClose}>
      <div className="transaction-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Transaction Details</h3>
          <button className="modal-close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="modal-body">
          <div className="details-grid">
            {Object.entries(transaction).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key}</span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
