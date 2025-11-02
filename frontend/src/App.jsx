import React, { useEffect, useState } from 'react'
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
import strangerLogo from './assets/stranger-logo.png'
import { fetchData, fetchPredictions } from './api'

export default function App() {
  const [data, setData] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const d = await fetchData()
        setData(d)
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

  const [menuOpen, setMenuOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')
  const [verificationResult, setVerificationResult] = useState(null)

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
      <img
        src={strangerLogo}
        alt="Stranger Strings Logo"
        className="top-right-logo"
        onClick={() => setCurrentPage('home')}
        role="button"
        aria-label="Go to main menu"
      />
      
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
            <header>
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
              ) : (
                <>
                  <DataSummary data={data} />
                  <Predictions predictions={predictions} />
                </>
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
