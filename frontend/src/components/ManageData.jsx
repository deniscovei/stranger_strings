import React, { useState, useEffect, useRef } from 'react'
import { fetchData, uploadDataFile, clearData, fetchMerchants } from '../api'
import TransactionModal from './TransactionModels' // Import TransactionModal
import MerchantModal from './MerchantModal' // Import MerchantModal

export default function ManageData() {
  const [viewMode, setViewMode] = useState('transactions') // 'transactions' or 'merchants'
  const [transactions, setTransactions] = useState([])
  const [merchants, setMerchants] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedMerchant, setSelectedMerchant] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)
  const [pagination, setPagination] = useState(null) // Store pagination metadata
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (viewMode === 'transactions') {
      loadTransactions()
    } else {
      loadMerchants()
    }
  }, [viewMode])

  const loadTransactions = async (page = 1, pageSize = 100, search = '', filter = 'all') => {
    try {
      console.log('Fetching transactions with filters:', { page, pageSize, search, filter })
      setLoading(true)
      const response = await fetchData(page, pageSize, search, filter)
      console.log('Transactions fetched:', response)
      setTransactions(response.data) // Extract data from paginated response
      setFilteredTransactions(response.data)
      setPagination(response.pagination) // Store pagination info
      setCurrentPage(page) // Update current page
    } catch (err) {
      const mockData = generateMockData()
      setTransactions(mockData)
      setFilteredTransactions(mockData)
      console.error('Failed to fetch transactions:', err.response || err.message || err)
    } finally {
      setLoading(false)
    }
  }

  const loadMerchants = async (page = 1, pageSize = 100, search = '', filter = 'all') => {
    try {
      console.log('Fetching merchants with filters:', { page, pageSize, search, filter })
      setLoading(true)
      const response = await fetchMerchants(page, pageSize, search, filter)
      console.log('Merchants fetched:', response)
      setMerchants(response.data)
      setPagination(response.pagination)
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to fetch merchants:', err.response || err.message || err)
      setMerchants([])
    } finally {
      setLoading(false)
    }
  }

  // Reload data whenever search, filter, page, itemsPerPage, or viewMode changes
  useEffect(() => {
    if (viewMode === 'transactions') {
      loadTransactions(currentPage, itemsPerPage, searchTerm, filterBy)
    } else {
      loadMerchants(currentPage, itemsPerPage, searchTerm, filterBy)
    }
  }, [searchTerm, filterBy, currentPage, itemsPerPage, viewMode])

  // Reset to page 1 when search, filter, itemsPerPage, or viewMode changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterBy, itemsPerPage, viewMode])

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    const merchantNames = ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Home Depot', 'Starbucks', "McDonald's", 'Shell', 'Costco', 'Apple Store']
    const transactionTypes = ['PURCHASE', 'REVERSAL', 'ADDRESS VERIFICATION']
    const merchantCategories = ['5411', '5812', '5541', '5999', '5732', '5814', '5912']

    for (let i = 0; i < 50; i++) {
      const date = new Date(
        2024,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1,
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60)
      )
      mockTransactions.push({
        id: `TX${i + 1}`, // useful for keys
        accountNumber: `ACC${100000 + i}`,
        transactionDateTime: date.toISOString(),
        transactionAmount: (Math.random() * 1000).toFixed(2),
        merchantName: merchantNames[Math.floor(Math.random() * merchantNames.length)],
        transactionType: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
        merchantCategoryCode: merchantCategories[Math.floor(Math.random() * merchantCategories.length)],
        merchantCountryCode: ['US', 'CA', 'MX', 'PR'][Math.floor(Math.random() * 4)],
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
      minute: '2-digit',
    })
  }

  // Pagination
  // Use pagination from backend instead of local filtering
  const totalPages = pagination?.totalPages || 1
  const totalRows = pagination?.totalRows || 0
  const currentTransactions = filteredTransactions // Already paginated from backend
  const currentMerchants = merchants // Already paginated from backend

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

  // Remove Data
  const handleRemoveData = async () => {
    const confirmDelete = window.confirm('Are you sure you want to remove all data? This action cannot be undone.')
    if (!confirmDelete) return

    try {
      const response = await clearData() // Call the /clear endpoint
      if (response.status === 200) {
        setTransactions([])
        setFilteredTransactions([])
        alert('All data has been removed successfully.')
      } else {
        alert('Failed to clear data. Please try again.')
      }
    } catch (err) {
      console.error('Failed to clear data:', err)
      alert('An error occurred while clearing data.')
    }
  }

  // Row click handlers (mouse + keyboard)
  const handleRowClick = (tx) => setSelectedTransaction(tx)
  const handleRowKeyDown = (e, tx) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedTransaction(tx)
    }
  }

  return (
    <div className="manage-data-container">
      <h2>My Data</h2>

      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'transactions' ? 'active' : ''}`}
          onClick={() => setViewMode('transactions')}
        >
          Transactions
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'merchants' ? 'active' : ''}`}
          onClick={() => setViewMode('merchants')}
        >
          Merchants
        </button>
      </div>

      <div className="data-controls">
        <input
          type="text"
          className="search-bar"
          placeholder={viewMode === 'transactions' ? 'Search transactions...' : 'Search merchants...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className={`filter-dropdown ${filterBy === 'fraud' ? 'fraud-filter' : ''}`}
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
        >
          <option value="all">{viewMode === 'transactions' ? 'All Transactions' : 'All Merchants'}</option>
          <option value="fraud">Fraudulent</option>
          <option value="legitimate">Legitimate</option>
        </select>
      </div>

      {loading ? (
        <p>Loading {viewMode}...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          {viewMode === 'transactions' ? (
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
                currentTransactions.map((transaction) => (
                  <div
                    key={transaction.id || transaction.accountNumber}
                    className={`transaction-row ${transaction.isFraud ? 'fraud-row' : 'legitimate-row'}`}
                    onClick={() => handleRowClick(transaction)}
                    onKeyDown={(e) => handleRowKeyDown(e, transaction)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${transaction.accountNumber}`}
                    style={{ cursor: 'pointer' }}
                  >
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
          ) : (
            <div className="transactions-list">
              <div className="transaction-header">
                <div>Merchant Name</div>
                <div>Total Transactions</div>
                <div>Fraud Count</div>
                <div>Legitimate Count</div>
                <div>Fraud %</div>
                <div>Total Amount</div>
                <div>Avg Amount</div>
              </div>

              {merchants.length === 0 ? (
                <div className="no-results">No merchants found</div>
              ) : (
                currentMerchants.map((merchant, index) => (
                  <div
                    key={merchant.merchantName || index}
                    className={`transaction-row ${merchant.fraudPercentage > 50 ? 'fraud-row' : 'legitimate-row'}`}
                    onClick={() => setSelectedMerchant(merchant)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${merchant.merchantName}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>{merchant.merchantName}</div>
                    <div>{merchant.totalTransactions}</div>
                    <div>{merchant.fraudCount}</div>
                    <div>{merchant.legitimateCount}</div>
                    <div>{merchant.fraudPercentage}%</div>
                    <div>${parseFloat(merchant.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div>${parseFloat(merchant.avgAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {pagination && totalRows > 0 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRows)} of {totalRows.toLocaleString()} transactions
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
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
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

          <div className="data-summary">Total: {totalRows.toLocaleString()} {viewMode}</div>

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
              className="upload-data-btn"
              onClick={handleRemoveData}
              disabled={transactions.length === 0}
            >
              Remove Data
            </button>
          </div>

          {/* Modals with details */}
          <TransactionModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
          <MerchantModal
            merchant={selectedMerchant}
            onClose={() => setSelectedMerchant(null)}
          />
        </>
      )}
    </div>
  )
}
