import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [downloadCode, setDownloadCode] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [downloadLink, setDownloadLink] = useState('')
  const [expiry, setExpiry] = useState(10)
  const [maxDownloads, setMaxDownloads] = useState('')
  const [downloadStatus, setDownloadStatus] = useState('')
  const [showSuccessPop, setShowSuccessPop] = useState(false)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('Uploading...');
    setQrUrl('');
    setDownloadCode('');
    setDownloadLink('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('expiry_minutes', expiry);
    if (maxDownloads) formData.append('max_downloads', maxDownloads);

    try {
      const res = await fetch('https://file-transfer-na50.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setUploadStatus('Upload successful!');
      setQrUrl(data.qr);
      setDownloadCode(data.code);
      setDownloadLink(data.download_url);
      console.log('File uploaded:', data);
      setShowSuccessPop(true);
      setTimeout(() => setShowSuccessPop(false), 3000);
    } catch (err) {
      setUploadStatus('Upload failed.');
    }
  }

  const handleDownload = async () => {
    setDownloadStatus('Fetching file...');
    setDownloadLink('');
    try {
      const res = await fetch(`https://file-transfer-na50.onrender.com/download/${downloadCode}`);
      if (!res.ok) {
        const errData = await res.json();
        setDownloadStatus(errData.detail || 'Download failed.');
        return;
      }
      // Get filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'file';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadStatus('Download started!');
    } catch (err) {
      setDownloadStatus('Download failed.');
    }
  }

  return (
    <div className="container">
      <h1>Online File Transfer</h1>
      <div className="upload-section">
        <h2>Upload File</h2>
        <input type="file" onChange={handleFileChange} />
        <div style={{ margin: '1em 0' }}>
          <label>
            Expiry (minutes):
            <input
              type="number"
              min="1"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              style={{ width: 60, marginLeft: 8 }}
            />
          </label>
          <label style={{ marginLeft: 16 }}>
            Max downloads:
            <input
              type="number"
              min="1"
              value={maxDownloads}
              onChange={e => setMaxDownloads(e.target.value)}
              style={{ width: 60, marginLeft: 8 }}
            />
          </label>
        </div>
        <button onClick={handleUpload} disabled={!file}>Upload</button>
        {uploadStatus && <p>{uploadStatus}</p>}
        {qrUrl && (
          <div>
            <h3>Share this QR or code:</h3>
            <img src={qrUrl} alt="QR Code" />
            <p>Code: <b>{downloadCode}</b></p>
          </div>
        )}
      </div>
      <hr />
      <div className="download-section">
        <h2>Download File</h2>
        <input
          type="text"
          placeholder="Enter code"
          value={downloadCode}
          onChange={e => setDownloadCode(e.target.value)}
        />
        <button onClick={handleDownload} disabled={!downloadCode}>Download</button>
        {downloadStatus && <p>{downloadStatus}</p>}
      </div>
      {showSuccessPop && (
        <div className="success-pop">
          <span className="tick">✔</span> File uploaded successfully!
        </div>
      )}
    </div>
  )
}

export default App

