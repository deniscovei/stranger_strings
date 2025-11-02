import React, { useState, useEffect } from 'react'
import { fetchMerchantTransactions } from '../api'
import TransactionModal from './TransactionModels'

export default function MerchantModal({ merchant, onClose }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const itemsPerPage = 20

  useEffect(() => {
    if (merchant) {
      setCurrentPage(1) // Reset to page 1 when merchant changes
    }
  }, [merchant])

  useEffect(() => {
    if (merchant) {
      loadMerchantTransactions()
    }
  }, [merchant, currentPage])

  const loadMerchantTransactions = async () => {
    if (!merchant?.merchantName) return
    
    try {
      setLoading(true)
      const response = await fetchMerchantTransactions(merchant.merchantName, currentPage, itemsPerPage)
      setTransactions(response.data)
      setPagination(response.pagination)
    } catch (err) {
      console.error('Failed to fetch merchant transactions:', err)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  if (!merchant) return null

  const fraudPercentage = parseFloat(merchant.fraudPercentage) || 0
  const isHighRisk = fraudPercentage > 50

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const getPageNumbers = () => {
    const totalPages = pagination?.totalPages || 1
    const pages = []
    const maxPagesToShow = 5
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  return (
    <div className="transaction-modal-overlay" onClick={onClose}>
      <div className={`merchant-modal ${isHighRisk ? 'fraud-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{merchant.merchantName}</h3>
            <div className="merchant-header-badges">
              <span className={`status-badge ${isHighRisk ? 'fraud' : 'legitimate'}`}>
                {fraudPercentage.toFixed(1)}% Fraud Rate
              </span>
              <span className="info-badge">
                {merchant.totalTransactions} Total Transactions
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="modal-body">
          {/* Merchant Statistics */}
          <div className="merchant-stats-row">
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Total Amount</span>
                <span className="stat-value">
                  ${parseFloat(merchant.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Average Amount</span>
                <span className="stat-value">
                  ${parseFloat(merchant.avgAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="stat-card fraud-card">
              <div className="stat-content">
                <span className="stat-label">Fraudulent</span>
                <span className="stat-value fraud-text">{merchant.fraudCount}</span>
              </div>
            </div>

            <div className="stat-card legitimate-card">
              <div className="stat-content">
                <span className="stat-label">Legitimate</span>
                <span className="stat-value legitimate-text">{merchant.legitimateCount}</span>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="merchant-transactions-section">
            <div className="section-header">
              <h4>Transaction History</h4>
              {pagination && (
                <span className="transaction-count">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.totalRows)} of {pagination.totalRows}
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No transactions found for this merchant</p>
              </div>
            ) : (
              <>
                <div className="merchant-transactions-list-container">
                  <div className="merchant-transaction-header">
                    <div>Account Number</div>
                    <div>Date & Time</div>
                    <div>Amount</div>
                    <div>Type</div>
                    <div>Status</div>
                  </div>

                  {transactions.map((transaction, index) => (
                    <div
                      key={index}
                      className={`merchant-transaction-row ${transaction.isFraud ? 'fraud-row' : 'legitimate-row'}`}
                      onClick={() => setSelectedTransaction(transaction)}
                      style={{ cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedTransaction(transaction)
                        }
                      }}
                    >
                      <div>{transaction.accountNumber}</div>
                      <div>{formatDateTime(transaction.transactionDateTime)}</div>
                      <div>${transaction.transactionAmount}</div>
                      <div>{transaction.transactionType}</div>
                      <div>
                        <span className={`status-badge ${transaction.isFraud ? 'fraud' : 'legitimate'}`}>
                          {transaction.isFraud ? 'Fraud' : 'Legitimate'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="merchant-pagination-controls">
                    <button 
                      className="pagination-btn" 
                      onClick={() => handlePageChange(1)} 
                      disabled={currentPage === 1}
                    >
                      &laquo; First
                    </button>
                    <button 
                      className="pagination-btn" 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1}
                    >
                      &lsaquo; Prev
                    </button>

                    {getPageNumbers().map((page, index) =>
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={page}
                          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button 
                      className="pagination-btn" 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage === pagination.totalPages}
                    >
                      Next &rsaquo;
                    </button>
                    <button 
                      className="pagination-btn" 
                      onClick={() => handlePageChange(pagination.totalPages)} 
                      disabled={currentPage === pagination.totalPages}
                    >
                      Last &raquo;
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <TransactionModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  )
}
