import React, { useState, useRef } from 'react'
import VerifyTransaction from './VerifyTransaction'
import { verifyMultipleTransactions } from '../api'

export default function VerifyTransactionsPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('verify') // 'verify' or 'batch'
  const [batchResults, setBatchResults] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setBatchResults([]) // Clear batch results when switching tabs
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a valid CSV file.')
      event.target.value = ''
      return
    }

    try {
      setUploading(true)
      const response = await verifyMultipleTransactions(file) // Send file to /predict_multiple
      setBatchResults(response.predictions) // Store predictions in state
      event.target.value = '' // Reset file input
    } catch (err) {
      console.error('Error predicting', err)
      alert('Failed to predict. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="verify-transactions-page">
      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => handleTabChange('verify')}
        >
          Verify Transaction
        </button>
        <button
          className={`view-toggle-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => handleTabChange('batch')}
        >
          Batch Verification
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'verify' ? (
          <div className="tab-panel">
            <VerifyTransaction onNavigate={onNavigate} />
          </div>
        ) : (
          <div className="tab-panel">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <button
                className={`view-toggle-btn ${uploading ? 'disabled' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload CSV File'}
              </button>
            </div>

            {batchResults.length > 0 && (
              <div className="transactions-list">
                <div className="transaction-header">
                  <div>Account Number</div>
                  <div>Date & Time</div>
                  <div>Amount</div>
                  <div>Merchant</div>
                  <div>Type</div>
                  <div>Fraud Probability</div>
                  <div>Status</div>
                </div>

                {batchResults.map((result, index) => {
                  // Format date and time
                  const formatDateTime = (dateTimeStr) => {
                    if (!dateTimeStr) return 'N/A'
                    try {
                      const date = new Date(dateTimeStr)
                      return date.toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })
                    } catch (e) {
                      return dateTimeStr
                    }
                  }

                  return (
                    <div
                      key={index}
                      className={`transaction-row ${result.isFraud ? 'fraud-row' : 'legitimate-row'}`}
                    >
                      <div>{result.accountNumber || 'N/A'}</div>
                      <div>{formatDateTime(result.transactionDateTime)}</div>
                      <div>${result.transactionAmount || 'N/A'}</div>
                      <div>{result.merchantName || 'N/A'}</div>
                      <div>{result.transactionType || 'N/A'}</div>
                      <div>
                        <span className={`status-badge ${result.isFraud ? 'fraud' : 'legitimate'}`}>
                          {typeof result.probabilityFraud === 'number' ? (result.probabilityFraud * 100).toFixed(2) + '%' : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className={`status-badge ${result.isFraud ? 'fraud' : 'legitimate'}`}>
                          {result.isFraud ? 'Fraud' : 'Legitimate'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
