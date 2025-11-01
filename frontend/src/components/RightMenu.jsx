import React from 'react'

export default function RightMenu({ onToggle, onOpenChat, onNavigate }) {
  return (
    <div className="left-menu">
      <div className="menu-header">
        <button className="menu-toggle" onClick={onToggle} aria-label="Toggle menu">☰</button>
        <h3>Menu</h3>
      </div>

      <nav className="menu-items">
        <button className="menu-item" onClick={() => onNavigate?.('data')}>Your Data</button>
        <button className="menu-item">Your Analytics</button>
        <div className="menu-sep" />
        <button className="chat-btn" onClick={onOpenChat}>Open Chat</button>
      </nav>

      <footer className="menu-footer">
        <small>Logged in as <strong>User</strong></small>
      </footer>
    </div>
  )
}
