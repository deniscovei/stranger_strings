import React, { useState, useEffect } from 'react'
import { verifyTransaction } from '../api'


export default function VerifyTransaction({ onNavigate }) {
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('verifyTransaction_formData')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved form data:', e)
      }
    }
    return {
      accountNumber: '',
      availableMoney: '',
      transactionDate: '',
      transactionTime: '',
      transactionAmount: '',
      merchantName: '',
      merchantCountryCode: '',
      posEntryMode: '',
      posConditionCode: '',
      merchantCategoryCode: '',
      currentExpDate: '',
      accountOpenDate: '',
      dateOfLastAddressChange: '',
      cardCVV: '',
      cardLast4Digits: '',
      transactionType: '',
      currentBalance: '',
      cardPresent: false,
      expirationDateKeyInMatch: false,
    }
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonText, setJsonText] = useState(() => {
    return localStorage.getItem('verifyTransaction_jsonText') || ''
  })
  const [jsonError, setJsonError] = useState('')
  const [isJsonSubmitting, setIsJsonSubmitting] = useState(false)

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('verifyTransaction_formData', JSON.stringify(formData))
  }, [formData])

  // Save JSON text to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('verifyTransaction_jsonText', jsonText)
  }, [jsonText])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    // Special handling for cardCVV - only allow 3 digits
    if (name === 'cardCVV') {
      if (value && !/^\d{0,3}$/.test(value)) {
        return // Don't update if it's not 0-3 digits
      }
    }
    
    // Special handling for cardLast4Digits - only allow 4 digits
    if (name === 'cardLast4Digits') {
      if (value && !/^\d{0,4}$/.test(value)) {
        return // Don't update if it's not 0-4 digits
      }
    }
    
    // Special handling for currentExpDate - enforce MM/YYYY format
    if (name === 'currentExpDate') {
      // Allow only digits and forward slash, and limit length
      if (value && !/^[\d/]{0,7}$/.test(value)) {
        return // Don't update if it contains invalid characters or is too long
      }
      // Auto-format: add slash after 2 digits
      let formattedValue = value.replace(/\D/g, '') // Remove all non-digits
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 6)
      }
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }))
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }))
      }
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Validate required text fields
    if (!formData.accountNumber) newErrors.accountNumber = 'Account number is required'
    if (!formData.availableMoney) newErrors.availableMoney = 'Available money is required'
    if (!formData.transactionDate) newErrors.transactionDate = 'Transaction date is required'
    if (!formData.transactionTime) newErrors.transactionTime = 'Transaction time is required'
    if (!formData.transactionAmount) newErrors.transactionAmount = 'Transaction amount is required'
    if (!formData.merchantName) newErrors.merchantName = 'Merchant name is required'
    if (!formData.merchantCountryCode) newErrors.merchantCountryCode = 'Merchant country code is required'
    if (!formData.posEntryMode) newErrors.posEntryMode = 'POS entry mode is required'
    if (!formData.posConditionCode) newErrors.posConditionCode = 'POS condition code is required'
    if (!formData.merchantCategoryCode) newErrors.merchantCategoryCode = 'Merchant category code is required'
    
    // Validate Current Exp Date - must be exactly MM/YYYY format
    if (!formData.currentExpDate) {
      newErrors.currentExpDate = 'Current exp date is required'
    } else {
      const expDateStr = String(formData.currentExpDate).trim()
      // Very strict MM/YYYY validation
      const mmYyyyRegex = /^(0[1-9]|1[0-2])\/(\d{4})$/
      if (!mmYyyyRegex.test(expDateStr)) {
        newErrors.currentExpDate = 'Date must be in MM/YYYY format (e.g., 01/2025)'
      } else {
        // Extract month and year to validate
        const [, month, year] = expDateStr.match(mmYyyyRegex)
        const monthNum = parseInt(month, 10)
        const yearNum = parseInt(year, 10)
        
        if (monthNum < 1 || monthNum > 12) {
          newErrors.currentExpDate = 'Month must be between 01 and 12'
        } else if (yearNum < 2000 || yearNum > 2099) {
          newErrors.currentExpDate = 'Year must be between 2000 and 2099'
        }
      }
    }
    
    if (!formData.accountOpenDate) newErrors.accountOpenDate = 'Account open date is required'
    if (!formData.dateOfLastAddressChange) newErrors.dateOfLastAddressChange = 'Date of last address change is required'
    
    // Validate Card CVV - must be exactly 3 digits
    if (!formData.cardCVV) {
      newErrors.cardCVV = 'Card CVV is required'
    } else {
      const cvvStr = String(formData.cardCVV).trim()
      if (!/^\d{3}$/.test(cvvStr)) {
        newErrors.cardCVV = 'CVV must be exactly 3 digits'
      }
    }
    
    // Validate Card Last 4 Digits - must be exactly 4 digits
    if (!formData.cardLast4Digits) {
      newErrors.cardLast4Digits = 'Card last 4 digits is required'
    } else {
      const last4Str = String(formData.cardLast4Digits).trim()
      if (!/^\d{4}$/.test(last4Str)) {
        newErrors.cardLast4Digits = 'Must be exactly 4 digits'
      }
    }
    
    if (!formData.transactionType) newErrors.transactionType = 'Transaction type is required'
    if (!formData.currentBalance) newErrors.currentBalance = 'Current balance is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      alert('Please fill in all required fields correctly')
      return
    }

  setIsSubmitting(true)

    try {
      // Build the payload using helper so the same shape can be used for JSON-send
      const submitData = buildSubmitData()

      // Call API to verify transaction
      const result = await verifyTransaction(submitData)
      
      // Transform API response to match expected format for TransactionResult
      // Include full submitData to show all transaction details (matching JSON verbosity)
      const transformedResult = {
        isFraud: result.is_fraud,
        confidence: result.is_fraud ? result.probability_fraud : result.probability_non_fraud,
        prediction: result.prediction,
        modelType: result.model_type,
        probabilityFraud: result.probability_fraud,
        probabilityNonFraud: result.probability_non_fraud,
        transactionId: result.transaction_id,
        details: submitData
      }
      
      // Navigate to result page with the result data
      onNavigate?.('result', transformedResult)
      
    } catch (error) {
      console.error('Error verifying transaction:', error)
      alert(`Failed to verify transaction: ${error.response?.data?.error || error.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to build the payload that matches backend API
  const buildSubmitData = () => {
    const transactionDateTime = `${formData.transactionDate}T${formData.transactionTime}`
    return {
      accountNumber: formData.accountNumber,
      availableMoney: formData.availableMoney ? parseFloat(formData.availableMoney) : undefined,
      transactionDateTime: transactionDateTime,
      transactionAmount: formData.transactionAmount ? parseFloat(formData.transactionAmount) : undefined,
      merchantName: formData.merchantName,
      merchantCountryCode: formData.merchantCountryCode,
      posEntryMode: formData.posEntryMode ? String(formData.posEntryMode).padStart(2, '0') : formData.posEntryMode,
      posConditionCode: formData.posConditionCode ? String(formData.posConditionCode).padStart(2, '0') : formData.posConditionCode,
      merchantCategoryCode: formData.merchantCategoryCode,
      currentExpDate: formData.currentExpDate,
      accountOpenDate: formData.accountOpenDate,
      dateOfLastAddressChange: formData.dateOfLastAddressChange,
      cardCVV: formData.cardCVV,
      cardLast4Digits: formData.cardLast4Digits,
      transactionType: formData.transactionType,
      currentBalance: formData.currentBalance ? parseFloat(formData.currentBalance) : undefined,
      cardPresent: formData.cardPresent,
      expirationDateKeyInMatch: formData.expirationDateKeyInMatch,
    }
  }

  const openJsonModal = () => {
    try {
      const payload = buildSubmitData()
      setJsonText(JSON.stringify(payload, null, 2))
    } catch (err) {
      setJsonText('')
    }
    setJsonError('')
    setShowJsonModal(true)
  }

  const sendJson = async () => {
    setJsonError('')
    let parsed
    try {
      parsed = JSON.parse(jsonText)
      if (!parsed || typeof parsed !== 'object') {
        setJsonError('JSON must be an object with the transaction fields')
        return
      }
    } catch (err) {
      setJsonError('Invalid JSON: ' + err.message)
      return
    }

    setIsJsonSubmitting(true)
    try {
      const result = await verifyTransaction(parsed)

      const transformedResult = {
        isFraud: result.is_fraud,
        confidence: result.is_fraud ? result.probability_fraud : result.probability_non_fraud,
        prediction: result.prediction,
        modelType: result.model_type,
        probabilityFraud: result.probability_fraud,
        probabilityNonFraud: result.probability_non_fraud,
        transactionId: result.transaction_id,
        details: parsed
      }

      setShowJsonModal(false)
      onNavigate?.('result', transformedResult)
    } catch (error) {
      console.error('Error sending JSON payload:', error)
      setJsonError(error.response?.data?.error || error.message || 'Unknown error')
    } finally {
      setIsJsonSubmitting(false)
    }
  }

  // Dropdown options
  const merchantCountryOptions = ['CAN', 'MEX', 'PR', 'US']
  const transactionTypeOptions = ['ADDRESS VERIFICATION', 'PURCHASE', 'REVERSAL']
  const merchantCategoryOptions = [
    'airline',
    'auto',
    'cable/phone',
    'entertainment',
    'fast food',
    'food',
    'food delivery',
    'fuel',
    'furniture',
    'gym',
    'health',
    'hotels',
    'mobile apps',
    'online gifts',
    'online retail',
    'online subscriptions',
    'personal care',
    'rideshare',
    'subscriptions'
  ]

  const fields = [
    { name: 'accountNumber', label: 'Account Number', type: 'number' },
    { name: 'availableMoney', label: 'Available Money', type: 'number', step: '0.01' },
    { name: 'transactionDate', label: 'Transaction Date', type: 'date' },
    { name: 'transactionTime', label: 'Transaction Time', type: 'time' },
    { name: 'transactionAmount', label: 'Transaction Amount', type: 'number', step: '0.01' },
    { name: 'merchantName', label: 'Merchant Name', type: 'text' },
    { name: 'merchantCountryCode', label: 'Merchant Country Code', type: 'select', options: merchantCountryOptions },
    { name: 'posEntryMode', label: 'POS Entry Mode', type: 'number' },
    { name: 'posConditionCode', label: 'POS Condition Code', type: 'number' },
    { name: 'merchantCategoryCode', label: 'Merchant Category Code', type: 'select', options: merchantCategoryOptions },
    { name: 'currentExpDate', label: 'Current Exp Date (MM/YYYY)', type: 'text', placeholder: 'MM/YYYY' },
    { name: 'accountOpenDate', label: 'Account Open Date', type: 'date' },
    { name: 'dateOfLastAddressChange', label: 'Date of Last Address Change', type: 'date' },
    { name: 'cardCVV', label: 'Card CVV', type: 'text' },
    { name: 'cardLast4Digits', label: 'Card Last 4 Digits', type: 'text' },
    { name: 'transactionType', label: 'Transaction Type', type: 'select', options: transactionTypeOptions },
    { name: 'currentBalance', label: 'Current Balance', type: 'number', step: '0.01' },
    { name: 'cardPresent', label: 'Card Present', type: 'checkbox' },
    { name: 'expirationDateKeyInMatch', label: 'Expiration Date Key In Match', type: 'checkbox' },
  ]

  // Split fields into two columns
  const midpoint = Math.ceil(fields.length / 2)
  const leftColumnFields = fields.slice(0, midpoint)
  const rightColumnFields = fields.slice(midpoint)

  const renderField = (field) => {
    const hasError = errors[field.name]
    
    if (field.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          id={field.name}
          name={field.name}
          checked={formData[field.name]}
          onChange={handleChange}
        />
      )
    } else if (field.type === 'select') {
      return (
        <>
          <select
            id={field.name}
            name={field.name}
            value={formData[field.name]}
            onChange={handleChange}
            className={hasError ? 'error' : ''}
            required
          >
            <option value="">Select...</option>
            {field.options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {hasError && <span className="error-message">{hasError}</span>}
        </>
      )
    } else {
      return (
        <>
          <input
            type={field.type}
            id={field.name}
            name={field.name}
            value={formData[field.name]}
            onChange={handleChange}
            step={field.step}
            placeholder={field.placeholder}
            className={`${field.type === 'number' ? 'no-spinners' : ''} ${hasError ? 'error' : ''}`}
            required={field.type !== 'checkbox'}
            maxLength={
              field.name === 'cardCVV' ? 3 : 
              field.name === 'cardLast4Digits' ? 4 : 
              field.name === 'currentExpDate' ? 7 : 
              undefined
            }
            pattern={
              field.name === 'cardCVV' ? '\\d{3}' : 
              field.name === 'cardLast4Digits' ? '\\d{4}' : 
              field.name === 'currentExpDate' ? '(0[1-9]|1[0-2])\\/\\d{4}' :
              undefined
            }
            title={
              field.name === 'cardCVV' ? 'Must be exactly 3 digits' : 
              field.name === 'cardLast4Digits' ? 'Must be exactly 4 digits' : 
              field.name === 'currentExpDate' ? 'Must be in MM/YYYY format (e.g., 01/2025)' :
              undefined
            }
          />
          {hasError && <span className="error-message">{hasError}</span>}
        </>
      )
    }
  }

  return (
    <section className="verify-transaction">
      <h2>Verify a Transaction</h2>
      <p>Enter transaction details below to verify if it's potentially fraudulent.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-columns">
          <div className="form-column">
            {leftColumnFields.map(field => (
              <div key={field.name} className="form-field">
                <label htmlFor={field.name}>{field.label}</label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="form-column">
            {rightColumnFields.map(field => (
              <div key={field.name} className="form-field">
                <label htmlFor={field.name}>{field.label}</label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="check-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Checking...' : 'Check'}
          </button>
          <button type="button" className="json-btn" onClick={openJsonModal} disabled={isSubmitting}>
            Check JSON
          </button>
        </div>
      </form>

      {showJsonModal && (
        <div className="chat-modal-overlay">
          <div className="chat-modal">
            <div className="chat-header">
              <h3>Send JSON to /predict</h3>
              <button className="close-btn" onClick={() => setShowJsonModal(false)}>×</button>
            </div>

            <div className="chat-body">
              <textarea
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
              />
              {jsonError && <div className="json-error">{jsonError}</div>}
            </div>

            <div className="chat-footer">
              <button className="chat-btn" onClick={() => setShowJsonModal(false)}>Cancel</button>
              <button className="chat-send-btn" onClick={sendJson} disabled={isJsonSubmitting}>
                {isJsonSubmitting ? 'Sending...' : 'Send JSON'}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
