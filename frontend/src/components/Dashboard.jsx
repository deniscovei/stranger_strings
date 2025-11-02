import React from 'react'

export default function Dashboard({ onNavigate }) {
  const tools = [
    {
      id: 'verify',
      icon: '🔍',
      title: 'Check a Transaction',
      description: 'Not sure if a transaction is safe? Enter the details and our AI will instantly tell you if it looks suspicious or legitimate.',
      action: 'Check Now',
      color: 'blue'
    },
    {
      id: 'data',
      icon: '📊',
      title: 'View All Transactions',
      description: 'Browse through all your transactions in one place. Filter by fraudulent or legitimate ones, search for specific entries, and see detailed information.',
      action: 'Browse Data',
      color: 'purple'
    },
    {
      id: 'charts',
      icon: '📈',
      title: 'Visual Analytics',
      description: 'See your transaction patterns at a glance with beautiful charts and graphs. Understand trends, spot anomalies, and get insights visually.',
      action: 'View Charts',
      color: 'green'
    },
    {
      id: 'sql',
      icon: '🔎',
      title: 'Advanced Search',
      description: 'Need to find something specific? Use our powerful search tool to query your data in any way you want. AI can even help you build queries.',
      action: 'Search Data',
      color: 'orange'
    },
    {
      id: 'chat',
      icon: '💬',
      title: 'Ask Questions',
      description: 'Have a question about your transactions or fraud detection? Chat with our AI assistant who can explain things in simple terms and help you understand.',
      action: 'Start Chatting',
      color: 'pink'
    }
  ]

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered',
      description: 'Advanced artificial intelligence analyzes your transactions instantly'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Get results in seconds, not hours'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your data is protected with enterprise-grade security'
    },
    {
      icon: '📱',
      title: 'Easy to Use',
      description: 'No technical knowledge needed - simple and intuitive'
    }
  ]

  return (
    <div className="new-dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Stranger Strings</h1>
          <p className="hero-subtitle">
            Your smart companion for detecting fraudulent transactions. We use AI to help you stay safe and informed.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="tools-section">
        <h2 className="section-heading">What Would You Like to Do?</h2>
        <p className="section-description">
          Choose from our powerful tools designed to make fraud detection simple and effective.
        </p>

        <div className="tools-grid">
          {tools.map(tool => (
            <div 
              key={tool.id} 
              className={`tool-card tool-card-${tool.color}`}
              onClick={() => onNavigate(tool.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate(tool.id)}
            >
              <div className="tool-icon">{tool.icon}</div>
              <h3 className="tool-title">{tool.title}</h3>
              <p className="tool-description">{tool.description}</p>
              <button className="tool-button">
                {tool.action} →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <h2 className="section-heading">Why Choose Stranger Strings?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3 className="step-title">Enter Your Transaction</h3>
            <p className="step-description">
              Simply fill in the transaction details you want to check
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h3 className="step-title">AI Analysis</h3>
            <p className="step-description">
              Our intelligent system analyzes the transaction instantly
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h3 className="step-title">Get Clear Results</h3>
            <p className="step-description">
              Receive easy-to-understand results and recommendations
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Protect yourself from fraud with just a few clicks. Try checking your first transaction now!
          </p>
          <button 
            className="cta-button"
            onClick={() => onNavigate('verify')}
          >
            Check a Transaction Now
          </button>
        </div>
      </div>
    </div>
  )
}
