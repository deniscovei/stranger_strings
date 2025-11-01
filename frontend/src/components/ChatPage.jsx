import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendChatMessage } from '../api'

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello, I am ClaudIA, your AI assistant. How can I be of use today?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || isLoading) {
      return
    }

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    // Add user message to chat
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Call API to get LLM response
      const response = await sendChatMessage(inputMessage.trim())
      
      // Backend returns a plain string
      const assistantMessage = {
        role: 'assistant',
        content: typeof response === 'string' ? response : (response.message || response.content || 'I received your message.'),
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Determine error message based on error type
      let errorContent = 'Sorry, I encountered an error. Please try again.'
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorContent = 'The request timed out after 15 seconds. The AI might be busy. Please try again.'
      } else if (error.response) {
        errorContent = `Error: ${error.response.data?.error || error.response.statusText || 'Server error'}`
      } else if (error.request) {
        errorContent = 'Could not reach the server. Please check your connection.'
      }
      
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Chat cleared. How can I help you?',
          timestamp: new Date()
        }
      ])
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-page-header">
        <div>
          <h2>ClaudIA</h2>
          <p className="chat-subtitle">Ask me anything about your data and transactions</p>
        </div>
        <button className="clear-chat-btn" onClick={clearChat}>
          Clear Chat
        </button>
      </div>

      <div className="chat-messages-container">
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.role} ${message.isError ? 'error' : ''}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '👤 You' : '🤖 ClaudIA'}
                </span>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-content">
                {message.role === 'assistant' && !message.isError ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="chat-message assistant loading">
              <div className="message-header">
                <span className="message-role">🤖 ClaudIA</span>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputMessage.trim() || isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
