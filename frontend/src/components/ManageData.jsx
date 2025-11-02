import React, { useState, useEffect, useRef } from 'react'
import { fetchTransactions, uploadDataFile } from '../api'


export default function ManageData() {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await fetchTransactions()
      setTransactions(data)
      setFilteredTransactions(data)
    } catch (err) {
      // Use mock data for development
      const mockData = generateMockData()
      setTransactions(mockData)
      setFilteredTransactions(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    filterTransactions()
  }, [searchTerm, filterBy, transactions])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterBy, itemsPerPage])

  const filterTransactions = () => {
    let filtered = [...transactions]

    if (filterBy !== 'all') {
      const isFraudFilter = filterBy === 'fraud' ? 1 : 0
      filtered = filtered.filter(t => t.isFraud === isFraudFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(t => 
        t.accountNumber?.toString().toLowerCase().includes(term) ||
        t.merchantName?.toLowerCase().includes(term) ||
        t.transactionType?.toLowerCase().includes(term) ||
        t.merchantCategoryCode?.toLowerCase().includes(term)
      )
    }

    setFilteredTransactions(filtered)
  }

  const handleUploadData = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      event.target.value = ''
      return
    }

    const maxSize = 1000 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size must be less than 1000MB')
      event.target.value = ''
      return
    }

    try {
      setUploading(true)
      const result = await uploadDataFile(file)
      alert(`File uploaded successfully! ${result.message || 'Data has been processed.'}`)
      await loadTransactions()
      event.target.value = ''
    } catch (err) {
      console.error('Failed to upload file:', err)
      alert(`Upload failed: ${err.response?.data?.message || err.message || 'Unknown error'}`)
      event.target.value = ''
    } finally {
      setUploading(false)
    }
  }

  const generateMockData = () => {
    const mockTransactions = []
    const merchantNames = ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Home Depot', 'Starbucks', 'McDonald\'s', 'Shell', 'Costco', 'Apple Store']
    const transactionTypes = ['PURCHASE', 'REVERSAL', 'ADDRESS VERIFICATION']
    const merchantCategories = ['5411', '5812', '5541', '5999', '5732', '5814', '5912']
    
    for (let i = 0; i < 50; i++) {
      const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
      mockTransactions.push({
        accountNumber: `ACC${100000 + i}`,
        transactionDateTime: date.toISOString(),
        transactionAmount: (Math.random() * 1000).toFixed(2),
        merchantName: merchantNames[Math.floor(Math.random() * merchantNames.length)],
        transactionType: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
        merchantCategoryCode: merchantCategories[Math.floor(Math.random() * merchantCategories.length)],
        isFraud: Math.random() > 0.85 ? 1 : 0
      })
    }
    return mockTransactions
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const getPageNumbers = () => {
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

  // 🗑️ Remove Data
  const handleRemoveData = () => {
    const confirmDelete = window.confirm('Are you sure you want to remove all data? This action cannot be undone.')
    if (!confirmDelete) return

    setTransactions([])
    setFilteredTransactions([])
    alert('All data has been removed successfully.')
  }

  return (
    <div className="manage-data-container">
      <h2>My Data</h2>
      
      <div className="data-controls">
        <input
          type="text"
          className="search-bar"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <select
          className="filter-dropdown"
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
        >
          <option value="all">All Transactions</option>
          <option value="fraud">Fraudulent</option>
          <option value="legitimate">Legitimate</option>
        </select>
      </div>

      {loading ? (
        <p>Loading transactions...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <div className="transactions-list">
            <div className="transaction-header">
              <div>Account Number</div>
              <div>Date & Time</div>
              <div>Amount</div>
              <div>Merchant</div>
              <div>Type</div>
              <div>Category</div>
              <div>Status</div>
            </div>
            
            {filteredTransactions.length === 0 ? (
              <div className="no-results">No transactions found</div>
            ) : (
              currentTransactions.map((transaction, index) => (
                <div key={index} className={`transaction-row ${transaction.isFraud ? 'fraud-row' : 'legitimate-row'}`}>
                  <div>{transaction.accountNumber}</div>
                  <div>{formatDateTime(transaction.transactionDateTime)}</div>
                  <div>${transaction.transactionAmount}</div>
                  <div>{transaction.merchantName}</div>
                  <div>{transaction.transactionType}</div>
                  <div>{transaction.merchantCategoryCode}</div>
                  <div>
                    <span className={`status-badge ${transaction.isFraud ? 'fraud' : 'legitimate'}`}>
                      {transaction.isFraud ? 'Fraud' : 'Legitimate'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredTransactions.length > 0 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </span>
                <div className="items-per-page">
                  <label htmlFor="itemsPerPage">Items per page:</label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="items-per-page-select"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="pagination-buttons">
                <button className="pagination-btn" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                  &laquo; First
                </button>
                <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
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

                <button className="pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next &rsaquo;
                </button>
                <button className="pagination-btn" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>
                  Last &raquo;
                </button>
              </div>
            </div>
          )}

          <div className="data-summary">Total: {transactions.length} transactions</div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />

          <div className="data-actions">
            <button 
              className="upload-data-btn" 
              onClick={handleUploadData}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Data'}
            </button>

            <button 
              className="upload-data-btn"  // same class → same style
              onClick={handleRemoveData}
              disabled={transactions.length === 0}
            >
              Remove Data
            </button>
          </div>
        </>
      )}
    </div>
  )
}
