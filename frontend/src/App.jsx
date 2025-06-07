import { useRef, useEffect, useState } from 'react'
import './App.css'
import '../public/style.css'
import uploadCloud from './assets/pngwing.com.png';

// const BACKEND_URL = "https://file-transfer-na50.onrender.com";
const BACKEND_URL = "https://file-transfer-xw2e.onrender.com";

function App() {
  const transferRef = useRef(null)
  const heroRef = useRef(null)

  // Refs for download code inputs
  const codeRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)
  const [downloadStatus, setDownloadStatus] = useState('')

  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY
        // Parallax: move slower than scroll, max translateY 0 to -120px
        const parallaxY = Math.max(-120, -scrollY * 0.4)
        heroRef.current.style.transform = `translateY(${parallaxY}px)`
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScrollToTransfer = () => {
    if (heroRef.current && transferRef.current) {
      heroRef.current.classList.add('zoom-out-title')
      setTimeout(() => {
        transferRef.current.scrollIntoView({ behavior: 'smooth' })
        transferRef.current.classList.add('zoom-bg')
        setTimeout(() => {
          heroRef.current.classList.remove('zoom-out-title')
          transferRef.current.classList.remove('zoom-bg')
          // Remove the zoom-bg class after the animation so the section appears normal
        }, 1600)
      }, 900)
    }
  }

  // Auto-advance and backspace logic for download code inputs
  const handleDigitChange = (e, idx) => {
    const val = e.target.value
    if (/^\d$/.test(val)) {
      if (idx < codeRefs.length - 1) {
        codeRefs[idx + 1].current.focus()
      } else {
        e.target.blur()
      }
    }
  }

  const handleDigitKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
      codeRefs[idx - 1].current.focus()
    }
    // Allow left/right arrow navigation
    if (e.key === 'ArrowLeft' && idx > 0) {
      codeRefs[idx - 1].current.focus()
    }
    if (e.key === 'ArrowRight' && idx < codeRefs.length - 1) {
      codeRefs[idx + 1].current.focus()
    }
  }

  // Upload handler
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null)
    setUploadStatus('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Please select a file to upload.')
      return
    }
    setUploadStatus('Uploading...')
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('expiry_minutes', '10')
    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setUploadStatus('Upload successful!')
      setUploadResult(data)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadStatus('Upload failed!')
      setUploadResult(null)
    }
  }

  // Download handler
  const handleDownload = async () => {
    setDownloadStatus('')
    const code = codeRefs.map(ref => ref.current.value).join('')
    if (!/^\d{4}$/.test(code)) {
      setDownloadStatus('Enter 4-digit PIN')
      return
    }
    setDownloadStatus('Downloading...')
    try {
      const res = await fetch(`${BACKEND_URL}/download/${code}`)
      if (!res.ok) {
        setDownloadStatus('Invalid or expired PIN')
        return
      }
      // Get filename from header (robust for all browsers)
      let filename = ''
      const disposition = res.headers.get('Content-Disposition')
      if (disposition) {
        // Try to extract filename*=UTF-8''... first (RFC 5987)
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/)
        if (utf8Match) {
          filename = decodeURIComponent(utf8Match[1])
        } else {
          // Fallback to filename="..."
          const asciiMatch = disposition.match(/filename="([^"]+)"/)
          if (asciiMatch) filename = asciiMatch[1]
        }
      }
      if (!filename) filename = 'file';
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setDownloadStatus('Download started!')
      // Clear PIN inputs
      codeRefs.forEach(ref => ref.current.value = '')
    } catch (err) {
      setDownloadStatus('Download failed!')
    }
  }

  return (
    <>
      <div className="hero-section" ref={heroRef}>
        <h1 className="main-title">CONNECT<br />ANYWHERE</h1>
        <p className="tagline">UNTANGLE THE WEB WITH US</p>
        <button className="connect-btn" onClick={handleScrollToTransfer}>CONNECT HERE</button>
        <div className="shapes"></div>
      </div>
      <div className="transfer-section" ref={transferRef}>
        <div className="transfer-blur">
        <h1 className="main-sub-title">TRANSFER ANYWHERE</h1>
        <div className="cards">
          <div className="card upload">
            <h2>UPLOAD FILES</h2>
            <div className="cloud-img" style={{flexDirection: 'column', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '12px'}}>
              {!selectedFile && (
                <img src={uploadCloud} alt="Upload Cloud" style={{maxWidth: '120px', maxHeight: '80px', border: 'none', boxShadow: 'none', marginBottom: '8px'}} />
              )}
              {selectedFile && selectedFile.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt={selectedFile.name}
                  style={{maxWidth: '120px', maxHeight: '80px', border: 'none', boxShadow: 'none', marginBottom: '8px', objectFit: 'contain'}}
                />
              ) : null}
              <input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                multiple={false}
              />
              <div style={{ color: '#5b00c0', fontSize: '0.95em', marginTop: 4, wordBreak: 'break-all', textAlign: 'center', minHeight: '1.5em' }}>
                {selectedFile ? selectedFile.name : ''}
              </div>
            </div>
            {uploadStatus && (
              <div style={{ color: uploadStatus.includes('successful') ? '#22c55e' : '#f05cff', fontSize: '0.95em', marginBottom: 8, marginTop: 8, textAlign: 'center' }}>{uploadStatus}</div>
            )}
            {uploadResult && (
              <div style={{textAlign: 'center', marginBottom: 8}}>
                <div style={{color: '#5b00c0', fontWeight: 600, fontSize: '1.1em'}}>PIN: <span style={{fontSize: '1.3em'}}>{uploadResult.code}</span></div>
                <div style={{margin: '8px 0'}}>
                  <img src={uploadResult.qr} alt="QR Code" style={{maxWidth: '120px', margin: '0 auto'}} />
                </div>
                <div style={{fontSize: '0.9em', color: '#888'}}>Share PIN or QR to download</div>
              </div>
            )}
            <div className="card-btn-box">
              <button
                className="card-btn"
                onClick={() => {
                  if (!selectedFile) {
                    fileInputRef.current && fileInputRef.current.click();
                  } else {
                    handleUpload();
                  }
                }}
              >
                {selectedFile ? 'UPLOAD' : 'CHOOSE FILE'}
              </button>
            </div>
          </div>
          <div className="card download">
            <h2>DOWNLOAD</h2>
            <div className="cloud-img">
                <div className="download-code-boxes">
                  {codeRefs.map((ref, idx) => (
                    <input
                      key={idx}
                      ref={ref}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]"
                      inputMode="numeric"
                      className="download-digit"
                      onChange={e => handleDigitChange(e, idx)}
                      onKeyDown={e => handleDigitKeyDown(e, idx)}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>
            {downloadStatus && (
              <div style={{ color: downloadStatus.includes('Download started') ? '#22c55e' : '#f05cff', fontSize: '0.95em', marginBottom: 8, marginTop: 8, textAlign: 'center' }}>{downloadStatus}</div>
            )}
            <div className="card-btn-box">
              <button className="card-btn" onClick={handleDownload}>DOWNLOAD</button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

export default App

