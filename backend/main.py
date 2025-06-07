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

app = FastAPI()

# CORS setup for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://file-transfer-cctd.vercel.app",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory file storage
file_store = {}  # code: {filename, content, expiry, max_downloads, downloads}

@app.get("/")
def read_root():
    return {"message": "File Transfer Backend Running"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    expiry_minutes: int = Form(10),
    max_downloads: int = Form(None)
):
    # Generate a random 4-digit PIN as string, zero-padded
    code = f"{random.randint(0, 9999):04d}"
    content = await file.read()
    expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)

    file_store[code] = {
        "filename": file.filename,
        "content": content,
        "expiry": expiry,
        "max_downloads": max_downloads,
        "downloads": 0
    }

    # Generate QR code as base64
    qr = qrcode.make(f"https://file-transfer-na50.onrender.com/download/{code}")
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    qr_data_url = f"data:image/png;base64,{qr_b64}"

    return JSONResponse({
        "code": code,
        "qr": qr_data_url,
        "download_url": f"https://file-transfer-na50.onrender.com/download/{code}"
    })

@app.get("/download/{code}")
def download_file(code: str):
    file_meta = file_store.get(code)
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")

    now = datetime.utcnow()
    if file_meta["expiry"] < now:
        del file_store[code]
        raise HTTPException(status_code=410, detail="File expired")

    if file_meta["max_downloads"] is not None and file_meta["downloads"] >= int(file_meta["max_downloads"]):
        del file_store[code]
        raise HTTPException(status_code=410, detail="Max downloads reached")

    file_meta["downloads"] += 1

    filename = file_meta["filename"]
    # Use RFC 5987 encoding for non-ASCII filenames
    quoted_filename = quote(filename)
    headers = {
        'Access-Control-Allow-Origin': 'https://file-transfer-cctd.vercel.app',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Disposition': f'attachment; filename="{filename}"; filename*=UTF-8''{quoted_filename}'
    }

    return StreamingResponse(io.BytesIO(file_meta["content"]), media_type='application/octet-stream', headers=headers)

# Background thread to clean up expired files
def cleanup_expired_files():
    while True:
        now = datetime.utcnow()
        expired = [code for code, meta in file_store.items() if meta["expiry"] < now]
        for code in expired:
            del file_store[code]
        time.sleep(60)

# Start background cleanup thread
threading.Thread(target=cleanup_expired_files, daemon=True).start()
