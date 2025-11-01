import React, { useRef, useState } from 'react'
import { uploadDataFile } from '../api'

export default function DataPage() {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const onPick = () => {
    setMessage(null)
    fileRef.current?.click()
  }

  const onChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    setUploading(true)
    setMessage(null)
    try {
      const res = await uploadDataFile(file)
      setMessage({ type: 'success', text: `Uploaded: ${res.filename || file.name}` })
    } catch (err) {
      console.error('Upload error', err)
      setMessage({ type: 'error', text: 'Upload failed. Check backend.' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <section>
      <h2>Your Data</h2>
      <p>Upload a CSV or JSON file to add data for analysis.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="chat-btn" onClick={onPick} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload data'}</button>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onChange} />
        {message && (
          <div style={{ color: message.type === 'error' ? '#b91c1c' : '#15803d' }}>{message.text}</div>
        )}
      </div>
    </section>
  )
}
