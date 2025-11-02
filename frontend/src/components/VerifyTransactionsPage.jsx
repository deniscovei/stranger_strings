import React, { useState, useRef, useEffect } from 'react'
import VerifyTransaction from './VerifyTransaction'
import TransactionResult from './TransactionResult'
import { verifyMultipleTransactions, verifyTransaction } from '../api'

export default function VerifyTransactionsPage({ onNavigate, resultData, onBackToVerify }) {
  const [activeTab, setActiveTab] = useState('verify') // 'verify' or 'batch' or 'result'
  const [batchResults, setBatchResults] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [modalResult, setModalResult] = useState(null) // For showing transaction details in modal
  const fileInputRef = useRef(null)

  console.log('VerifyTransactionsPage render:', { activeTab, batchResultsLength: batchResults.length, resultData })

  // If resultData is provided, switch to result view
  useEffect(() => {
    if (resultData) {
      setActiveTab('result')
    }
  }, [resultData])

  const handleTabChange = (tab) => {
    if (tab === 'result') return // Don't allow manual switch to result
    setActiveTab(tab)
    setBatchResults([]) // Clear batch results when switching tabs
    if (onBackToVerify) onBackToVerify() // Clear result data
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
      
      console.log('Batch response:', response)
      
      // Store results - originalTransaction will come from backend response
      if (response && response.predictions && Array.isArray(response.predictions)) {
        setBatchResults(response.predictions)
        console.log('Batch results set:', response.predictions.length, 'transactions')
      } else {
        console.error('Invalid response format:', response)
        alert('Invalid response from server')
      }
      event.target.value = '' // Reset file input
    } catch (err) {
      console.error('Error predicting', err)
      alert('Failed to predict. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleTransactionClick = async (result) => {
    try {
      setLoadingDetails(true)
      
      // Use the result directly from batch (it already has SHAP explanation now)
      const transformedResult = {
        isFraud: result.isFraud,
        confidence: result.isFraud ? result.probabilityFraud : result.probabilityNonFraud,
        prediction: result.prediction,
        modelType: result.modelType,
        probabilityFraud: result.probabilityFraud,
        probabilityNonFraud: result.probabilityNonFraud,
        shapExplanation: result.shapExplanation,
        details: result.originalTransaction // Original transaction data
      }
      
      // Show result in modal
      setModalResult(transformedResult)
    } catch (error) {
      console.error('Error getting transaction details:', error)
      alert('Failed to load transaction details. Please try again.')
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeModal = () => {
    setModalResult(null)
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
        {activeTab === 'result' ? (
          <div className="tab-panel">
            <TransactionResult result={resultData} onBack={() => handleTabChange('verify')} />
          </div>
        ) : activeTab === 'verify' ? (
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

            {loadingDetails && (
              <div style={{ textAlign: 'center', margin: '20px 0', color: '#6366f1', fontSize: '16px' }}>
                🔄 Loading detailed analysis with SHAP explanations...
              </div>
            )}

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
                      className={`transaction-row ${result.isFraud ? 'fraud-row' : 'legitimate-row'} clickable-row`}
                      onClick={() => handleTransactionClick(result)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view detailed analysis with SHAP explanations"
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

      {/* Modal for showing transaction details */}
      {modalResult && (
        <div className="transaction-modal-overlay" onClick={closeModal}>
          <div className="transaction-modal batch-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>
              ✕
            </button>
            <div className="modal-body">
              <TransactionResult result={modalResult} onBack={closeModal} hideBackButton={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
