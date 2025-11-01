import React, { useState, useEffect } from 'react'
import logo from '../assets/stranger-logo.svg'

export default function WelcomeScreen({ onFinished }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Start fade out after 2.5s
    const timer = setTimeout(() => {
      setFadeOut(true)
    }, 2500)

    // Tell parent to remove welcome screen after animation (3s total)
    const finishTimer = setTimeout(() => {
      onFinished()
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(finishTimer)
    }
  }, [onFinished])

  return (
    <div className={`welcome-screen ${fadeOut ? 'fade-out' : ''}`}>
      <img src={logo} alt="Stranger Strings Logo" className="welcome-logo" />
    </div>
  )
}