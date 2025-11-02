import React from 'react'
import DarkModeToggle from './DarkModeToggle'

export default function RightMenu({ onToggle, onOpenChat, onNavigate, isOpen = true }) {
  return (
    <div className="left-menu">
      <div className="menu-header">
        <button className="menu-toggle" onClick={onToggle} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h3>Menu</h3>
      </div>

      <nav className="menu-items">
        <button className="menu-item" onClick={() => onNavigate?.('home')}>
          📊 Dashboard
        </button>
        <button className="menu-item" onClick={() => onNavigate?.('charts')}>
          📈 Analytics Charts
        </button>
        <button className="menu-item" onClick={() => onNavigate?.('sql')}>
          🗃️ SQL Query
        </button>
        <button className="menu-item" onClick={() => onNavigate?.('data')}>
          💾 Manage Data
        </button>
        <button className="menu-item" onClick={() => onNavigate?.('verify')}>
          ✓ Verify Transaction
        </button>
        <div className="menu-sep" />
        <button className="chat-btn" onClick={onOpenChat}>
          💬 Open Chat
        </button>
      </nav>

      <footer className="menu-footer">
        <DarkModeToggle />
        <small>Logged in as <strong>User</strong></small>
      </footer>
    </div>
  )
}
