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
import os
from supabase import create_client, Client

app = FastAPI()

# CORS setup for production frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://file-transfer-peach.vercel.app",
        "https://file-transfer-xw2e.onrender.com",
        "http://localhost:5173"
    ],  # Allow both frontend and backend origins for CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = "https://hbexocvhexzkzbjssrcm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZXhvY3ZoZXh6a3pianNzcmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODM2MTIsImV4cCI6MjA2NDg1OTYxMn0.kbq_uqQ9m01OkT8YvEnd55Mbh7dINZFdOvtpsgOkrE0"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# In-memory metadata store for demo (replace with DB for production)
file_metadata = {}

@app.get("/")
def read_root():
    return {"message": "File Transfer Backend Running"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    expiry_minutes: int = Form(10),
    max_downloads: int = Form(None)
):
    try:
        code = f"{random.randint(0, 9999):04d}"
        content = await file.read()
        expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        filename = file.filename
        # Upload file to Supabase Storage
        storage_path = f"uploads/{code}_{filename}"
        res = supabase.storage.from_("uploads").upload(storage_path, content, file_options={"content-type": file.content_type})
        # Only check for error if the response has an 'error' attribute
        if hasattr(res, "error") and res.error:
            raise Exception(f"Supabase upload error: {res.error}")
        # Store metadata in memory
        file_metadata[code] = {
            'filename': filename,
            'storage_path': storage_path,
            'expiry': expiry.isoformat(),
            'max_downloads': max_downloads,
            'downloads': 0
        }
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
    except Exception as e:
        import traceback
        print("UPLOAD ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/download/{code}")
def download_file(code: str):
    meta = file_metadata.get(code)
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")
    now = datetime.utcnow()
    expiry = datetime.fromisoformat(meta['expiry'])
    if expiry < now:
        file_metadata.pop(code, None)
        raise HTTPException(status_code=410, detail="File expired")
    if meta['max_downloads'] is not None and meta['downloads'] >= int(meta['max_downloads']):
        file_metadata.pop(code, None)
        raise HTTPException(status_code=410, detail="Max downloads reached")
    # Increment download count
    meta['downloads'] += 1
    # Download file from Supabase Storage
    res = supabase.storage.from_("uploads").download(meta['storage_path'])
    if not res or hasattr(res, 'error'):
        raise HTTPException(status_code=404, detail="File not found in storage")
    content = res
    filename = meta['filename']
    quoted_filename = quote(filename)
    headers = {
        'Access-Control-Allow-Origin': ','.join([
            'https://file-transfer-peach.vercel.app',
            'https://file-transfer-xw2e.onrender.com'
        ]),
        'Access-Control-Allow-Credentials': 'true',
        'Content-Disposition': f'attachment; filename="{filename}"; filename*=UTF-8''{quoted_filename}'
    }
    return StreamingResponse(io.BytesIO(content), media_type='application/octet-stream', headers=headers)

@app.get("/test-cors")
def test_cors():
    return {"message": "CORS is working!"}

# Background thread to clean up expired files
# Use in-memory metadata for Supabase version

def cleanup_expired_files():
    while True:
        now = datetime.utcnow()
        expired = [k for k, v in file_metadata.items() if datetime.fromisoformat(v['expiry']) < now]
        for code in expired:
            file_metadata.pop(code, None)
        time.sleep(60)

# Start background cleanup thread
threading.Thread(target=cleanup_expired_files, daemon=True).start()
