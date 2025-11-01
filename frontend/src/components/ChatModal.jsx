import React, { useState } from 'react'

export default function ChatModal({ onClose, userName }) {
  const [text, setText] = useState('')
  const [history, setHistory] = useState([
    { id: 1, from: 'system', text: `Welcome, ${userName}! How can I help you today?` },
  ])

  function send() {
    if (!text.trim()) return
    const m = { id: Date.now(), from: 'user', text }
    setHistory((h) => [...h, m])
    setText('')
    // Placeholder for actual chat call; append an echo reply for now
    setTimeout(() => {
      setHistory((h) => [...h, { id: Date.now() + 1, from: 'assistant', text: `Echo: ${m.text}` }])
    }, 400)
  }

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="chat-header">
          <h2>Chat with the assistant</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <div className="chat-body">
          {history.map((m) => (
            <div key={m.id} className={`chat-msg ${m.from}`}>
              <div className="chat-from">{m.from}</div>
              <div className="chat-text">{m.text}</div>
            </div>
          ))}
        </div>

        <footer className="chat-footer">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
          <button onClick={send}>Send</button>
        </footer>
      </div>
    </div>
  )
}
