import React, { useState, useRef } from 'react'
import VerifyTransaction from './VerifyTransaction'
import { verifyMultipleTransactions } from '../api'

export default function VerifyTransactionsPage() {
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
            <VerifyTransaction />
          </div>
        ) : (
          <div className="tab-panel">
            <h3>Batch Verification</h3>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <button
              className={`view-toggle-btn ${uploading ? 'disabled' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload CSV File'}
            </button>

            {batchResults.length > 0 && (
              <div className="batch-results">
                <div className="transaction-header">
                  <div>Transaction ID</div>
                  <div>Prediction</div>
                  <div>Is Fraud</div>
                  <div>Probability (Fraud)</div>
                  <div>Probability (Non-Fraud)</div>
                </div>

                {batchResults.map((result, index) => (
                  <div
                    key={index}
                    className={`transaction-row ${result.is_fraud ? 'fraud-row' : 'legitimate-row'}`}
                    style={{ cursor: 'default' }}
                  >
                    <div>{result.transaction_id || 'N/A'}</div>
                    <div>{String(result.prediction ?? 'N/A')}</div>
                    <div>{result.is_fraud ? 'Yes' : 'No'}</div>
                    <div>{typeof result.probability_fraud === 'number' ? result.probability_fraud.toFixed(2) : 'N/A'}</div>
                    <div>{typeof result.probability_non_fraud === 'number' ? result.probability_non_fraud.toFixed(2) : 'N/A'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
