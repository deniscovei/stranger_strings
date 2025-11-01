import React, { useState } from 'react'
import { verifyTransaction } from '../api'

export default function VerifyTransaction({ onNavigate }) {
  const [formData, setFormData] = useState({
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
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      // Combine date and time into a single datetime string
      const transactionDateTime = `${formData.transactionDate}T${formData.transactionTime}`
      
      const submitData = {
        ...formData,
        transactionDateTime,
      }

      // Call API to verify transaction
      const result = await verifyTransaction(submitData)
      
      // Navigate to result page with the result data
      onNavigate?.('result', result)
      
    } catch (error) {
      console.error('Error verifying transaction:', error)
      
      // For development: simulate a response if API fails
      const mockResult = {
        isFraud: Math.random() > 0.5,
        confidence: Math.random(),
        riskScore: Math.random() * 100,
        details: {
          amount: formData.transactionAmount,
          merchant: formData.merchantName,
          date: formData.transactionDate,
        },
        reasons: [
          'Transaction amount is unusual for this account',
          'Merchant location differs from typical spending pattern',
          'Transaction time is outside normal hours'
        ]
      }
      
      onNavigate?.('result', mockResult)
    } finally {
      setIsSubmitting(false)
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
          <button type="submit" className="chat-btn check-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Checking...' : 'Check'}
          </button>
        </div>
      </form>
    </section>
  )
}
