import React, { useState, useRef } from 'react'
import VerifyTransaction from './VerifyTransaction'
import { uploadDataFile } from '../api'

export default function VerifyTransactionsPage() {
  const [activeTab, setActiveTab] = useState('verify') // 'verify' or 'batch'
  const [batchResults, setBatchResults] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setBatchResults(null) // Clear batch results when switching tabs
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
      const response = await uploadDataFile(file, '/predict_multiple') // Send file to /predict_multiple
      setBatchResults(response.predictions) // Store predictions in state
      event.target.value = '' // Reset file input
    } catch (err) {
      console.error('Error uploading file:', err)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className={`verify-transactions-page ${activeTab === 'batch' ? 'center-content' : ''}`}
    >
      <div className="view-toggle" style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button
          className={`view-toggle-btn ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => handleTabChange('verify')}
          style={{ fontSize: '18px', padding: '10px 20px', border: 'none', borderRadius: '5px' }}
        >
          Verify Transaction
        </button>
        <button
          className={`view-toggle-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => handleTabChange('batch')}
          style={{ fontSize: '18px', padding: '10px 20px', border: 'none', borderRadius: '5px' }}
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
              style={{ fontSize: '18px', padding: '10px 20px', border: 'none', borderRadius: '5px' }}
            >
              {uploading ? 'Uploading...' : 'Upload CSV File'}
            </button>

            {batchResults && (
              <div className="batch-results">
                <h4>Batch Verification Results</h4>
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Prediction</th>
                      <th>Is Fraud</th>
                      <th>Probability (Fraud)</th>
                      <th>Probability (Non-Fraud)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((result, index) => (
                      <tr key={index}>
                        <td>{result.transaction_id || 'N/A'}</td>
                        <td>{result.prediction}</td>
                        <td>{result.is_fraud ? 'Yes' : 'No'}</td>
                        <td>{result.probability_fraud?.toFixed(2) || 'N/A'}</td>
                        <td>{result.probability_non_fraud?.toFixed(2) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
