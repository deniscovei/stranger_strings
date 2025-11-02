import React, { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import DataSummary from './components/DataSummary'
import Predictions from './components/Predictions'
import RightMenu from './components/RightMenu'
import ChatModal from './components/ChatModal'
import DataPage from './components/DataPage'
import ManageData from './components/ManageData'
import ChatPage from './components/ChatPage'
import VerifyTransaction from './components/VerifyTransaction'
import TransactionResult from './components/TransactionResult'
import Charts from './components/Charts'
import SqlQuery from './components/SqlQuery'
import strangerLogo from './assets/stranger-logo.png'
import { fetchData, fetchPredictions } from './api'

export default function App() {
  const [data, setData] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetchData(1, 100) // Get first page with 100 items
        setData(response.data) // Now response has { data, pagination }
      } catch (e) {
        console.warn('Could not fetch data', e)
      }
      try {
        const p = await fetchPredictions()
        setPredictions(p)
      } catch (e) {
        console.warn('Could not fetch predictions', e)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Initialize state from localStorage or use defaults
  const [menuOpen, setMenuOpen] = useState(() => {
    const saved = localStorage.getItem('menuOpen')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [chatOpen, setChatOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'home'
  })
  const [verificationResult, setVerificationResult] = useState(() => {
    const saved = localStorage.getItem('verificationResult')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved verification result:', e)
      }
    }
    return null
  })

  // Save currentPage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage)
  }, [currentPage])

  // Save menuOpen to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('menuOpen', JSON.stringify(menuOpen))
  }, [menuOpen])

  // Save verificationResult to localStorage whenever it changes
  useEffect(() => {
    if (verificationResult) {
      localStorage.setItem('verificationResult', JSON.stringify(verificationResult))
    } else {
      localStorage.removeItem('verificationResult')
    }
  }, [verificationResult])

  const handleNavigate = (page, data) => {
    setCurrentPage(page)
    setChatOpen(false) // Close chat modal when navigating
    if (page === 'result' && data) {
      setVerificationResult(data)
    }
  }

  const handleOpenChat = () => {
    setCurrentPage('chat')
    setChatOpen(false)
  }

  const handleBackToVerify = () => {
    setCurrentPage('verify')
    setVerificationResult(null)
  }

  return (
    <>
      {/* <img
        src={strangerLogo}
        alt="Stranger Strings Logo"
        className="top-right-logo"
        onClick={() => setCurrentPage('home')}
        role="button"
        aria-label="Go to main menu"
      /> */}
      
      <div className={`container layout ${menuOpen ? '' : 'menu-closed'}`}>
        <aside className={`left-menu-col ${menuOpen ? 'open' : 'closed'}`}>
          <RightMenu 
            onToggle={() => setMenuOpen((s) => !s)} 
            onOpenChat={handleOpenChat} 
            onNavigate={handleNavigate}
            isOpen={menuOpen}
          />
        </aside>

        <main className="main-col">
          {/* Only show header on home page */}
          {currentPage === 'home' && (
            <header style={{ display: 'none' }}>
              <h1>Stranger Strings — Data & Predictions</h1>
            </header>
          )}

          {loading && <p>Loading...</p>}

          {!loading && (
            <>
              {currentPage === 'data' ? (
                <ManageData />
              ) : currentPage === 'chat' ? (
                <ChatPage />
              ) : currentPage === 'verify' ? (
                <VerifyTransaction onNavigate={handleNavigate} />
              ) : currentPage === 'result' ? (
                <TransactionResult result={verificationResult} onBack={handleBackToVerify} />
              ) : currentPage === 'charts' ? (
                <Charts />
              ) : currentPage === 'sql' ? (
                <SqlQuery />
              ) : (
                <Dashboard onNavigate={handleNavigate} />
              )}
            </>
          )}
        </main>

        {/* right menu removed; left menu is rendered above */}

        {chatOpen && (
          <ChatModal onClose={() => setChatOpen(false)} userName={process.env.REACT_APP_USER || 'User'} />
        )}
      </div>
    </>
  )
}
