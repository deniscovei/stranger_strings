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
            className={`verify-transactions-page`}
            style={{
                maxWidth: 1000,
                margin: '0 auto',
                padding: '20px'
            }}
        >
            {/* Top buttons centered */}
            <div
                className="view-toggle"
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 20,
                    marginBottom: 24,
                    background: 'none',
                    boxShadow: 'none',
                    border: 'none',
                }}
            >
                <button
                    className={`view-toggle-btn ${activeTab === 'verify' ? 'active' : ''}`}
                    onClick={() => handleTabChange('verify')}
                    style={{ fontSize: 18, padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                >
                    Verify Transaction
                </button>
                <button
                    className={`view-toggle-btn ${activeTab === 'batch' ? 'active' : ''}`}
                    onClick={() => handleTabChange('batch')}
                    style={{ fontSize: 18, padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer' }}
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
                    // Center the entire batch view
                    <div
                        className="tab-panel"
                        style={{
                            minHeight: '60vh',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            gap: 16
                        }}
                    >
                        <h3 style={{ margin: 0 }}>Batch Verification</h3>

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
                            style={{ fontSize: 18, padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                        >
                            {uploading ? 'Uploading...' : 'Upload CSV File'}
                        </button>

                        {batchResults && (
                            <div className="batch-results" style={{ width: '100%', maxWidth: 900, marginTop: 12 }}>
                                <h4 style={{ textAlign: 'left' }}>Batch Verification Results</h4>
                                <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                                <td>{String(result.prediction ?? 'N/A')}</td>
                                                <td>{result.is_fraud ? 'Yes' : 'No'}</td>
                                                <td>{typeof result.probability_fraud === 'number' ? result.probability_fraud.toFixed(2) : 'N/A'}</td>
                                                <td>{typeof result.probability_non_fraud === 'number' ? result.probability_non_fraud.toFixed(2) : 'N/A'}</td>
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
