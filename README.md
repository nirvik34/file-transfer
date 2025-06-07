# Connect Anywhere – File Transfer App

A simple, modern web app for transferring files from anywhere. Upload a file, get a 4-digit PIN and QR code, and download the file from any device using the PIN or QR code. Built with FastAPI (backend) and React (frontend).

---

## Features
- Upload any file and get a unique 4-digit PIN and QR code for download
- Download files using the PIN or by scanning the QR code
- Files expire after a set time or after a maximum number of downloads
- No login or registration required
- Modern, mobile-friendly UI

---

## Tech Stack
- **Backend:** FastAPI, Uvicorn, Python
- **Frontend:** React, Vite
- **Other:** SQLAlchemy (for future DB support), QRCode, Pillow

---

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+

### 1. Clone the repository
```sh
git clone <your-repo-url>
cd file-transfer
```

### 2. Backend Setup
```sh
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```sh
cd ../frontend
npm install
npm run dev
```

- The frontend will run at http://localhost:5173
- The backend will run at http://localhost:8000

---

## Usage
1. Open the frontend in your browser.
2. Upload a file. You will get a 4-digit PIN and a QR code.
3. Share the PIN or QR code with anyone.
4. Anyone can enter the PIN or scan the QR code to download the file (until it expires or max downloads is reached).

---

## Deployment
- The backend CORS settings allow both local development and production frontend URLs.
- To deploy, push your backend to a service like Render, and your frontend to Vercel/Netlify.
- Update the `BACKEND_URL` in `frontend/src/App.jsx` to your deployed backend URL.

---

## License
MIT

---

## Credits
- UI/UX: Inspired by modern file transfer apps
- Built with ❤️ using FastAPI and React
