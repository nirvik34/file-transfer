from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import io
import base64
from datetime import datetime, timedelta
import threading
import time
import qrcode
import random
from urllib.parse import quote
import firebase_admin
from firebase_admin import credentials, firestore, storage as fb_storage
import os

app = FastAPI()

# CORS setup for production frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://file-transfer-peach.vercel.app",
        "https://file-transfer-xw2e.onrender.com"
    ],  # Allow both frontend and backend origins for CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use Render's secret file path for Firebase credentials
FIREBASE_CRED_PATH = "/etc/secrets/firebase-service-account.json"
# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CRED_PATH)
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'file-transfer-pin.appspot.com'
    })
db = firestore.client()
bucket = fb_storage.bucket()

@app.get("/")
def read_root():
    return {"message": "File Transfer Backend Running"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    expiry_minutes: int = Form(10),
    max_downloads: int = Form(None)
):
    code = f"{random.randint(0, 9999):04d}"
    content = await file.read()
    expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
    filename = file.filename
    # Upload file to Firebase Storage
    blob = bucket.blob(f"uploads/{code}_{filename}")
    blob.upload_from_string(content)
    blob.make_public()
    # Store metadata in Firestore
    db.collection('files').document(code).set({
        'filename': filename,
        'storage_path': blob.name,
        'expiry': expiry.isoformat(),
        'max_downloads': max_downloads,
        'downloads': 0
    })
    # Generate QR code as base64 (use production backend URL)
    prod_download_url = f"https://file-transfer-xw2e.onrender.com/download/{code}"
    qr = qrcode.make(prod_download_url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    qr_data_url = f"data:image/png;base64,{qr_b64}"
    return JSONResponse({
        "code": code,
        "qr": qr_data_url,
        "download_url": prod_download_url
    })

@app.get("/download/{code}")
def download_file(code: str):
    doc = db.collection('files').document(code).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="File not found")
    meta = doc.to_dict()
    now = datetime.utcnow()
    expiry = datetime.fromisoformat(meta['expiry'])
    if expiry < now:
        db.collection('files').document(code).delete()
        raise HTTPException(status_code=410, detail="File expired")
    if meta['max_downloads'] is not None and meta['downloads'] >= int(meta['max_downloads']):
        db.collection('files').document(code).delete()
        raise HTTPException(status_code=410, detail="Max downloads reached")
    # Increment download count
    db.collection('files').document(code).update({'downloads': firestore.Increment(1)})
    # Download file from Firebase Storage
    blob = bucket.blob(meta['storage_path'])
    content = blob.download_as_bytes()
    filename = meta['filename']
    quoted_filename = quote(filename)
    headers = {
        'Access-Control-Allow-Origin': 'https://file-transfer-peach.vercel.app',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Disposition': f'attachment; filename="{filename}"; filename*=UTF-8''{quoted_filename}'
    }
    return StreamingResponse(io.BytesIO(content), media_type='application/octet-stream', headers=headers)

@app.get("/test-cors")
def test_cors():
    return {"message": "CORS is working!"}

# Background thread to clean up expired files
def cleanup_expired_files():
    while True:
        now = datetime.utcnow()
        expired = db.collection('files').where('expiry', '<', now).stream()
        for doc in expired:
            db.collection('files').document(doc.id).delete()
        time.sleep(60)

# Start background cleanup thread
threading.Thread(target=cleanup_expired_files, daemon=True).start()
