# Backend Connection via Ngrok - Setup & Testing Guide

## 🚀 Overview
Your Android app now uses **Ngrok** as the global backend URL:
```
https://map-reversing-dude.ngrok-free.dev
```

This tunnel routes all requests from your mobile device → Ngrok → Your local Flask server (localhost:5001)

---

## 📋 Prerequisites

1. **Flask Backend Running** (local machine)
   ```bash
   cd D:\app4\app3\my-react-app\backend
   python server.py
   ```
   Expected output:
   ```
   * Running on http://127.0.0.1:5001
   * WARNING: This is a development server...
   ```

2. **Ngrok Tunnel Active** (separate terminal)
   ```bash
   ngrok http 5001
   ```
   You'll see:
   ```
   Session Status    online
   Account           [your-account]
   Version           [version]
   Region            [region]
   Forwarding        https://map-reversing-dude.ngrok-free.dev -> http://localhost:5001
   ```

---

## 🔌 Connection Flow

```
Mobile App (Android Device/Emulator)
    ↓
https://map-reversing-dude.ngrok-free.dev
    ↓
Ngrok Tunnel (Global Router)
    ↓
http://localhost:5001 (Your Flask Backend)
    ↓
Processing...
    ↓
Response sent back through Ngrok → Mobile App
```

---

## 📱 Testing from Mobile App

### Option 1: Upload APK File
1. Build and run the Android app
2. Navigate to **Home** tab
3. Go to **File Scanner** section
4. Click **"Choose File"** or drag & drop an APK
5. App will scan via Ngrok

### Option 2: Text Scan
1. In **Home** tab, find **"Quick Scan"** section
2. Enter text, package name, or URL
3. Click **"Scan this app"**
4. Request goes through Ngrok

### Option 3: Direct Testing (Browser)
```bash
# Test the connection
curl -X GET "https://map-reversing-dude.ngrok-free.dev/api/ping"

# Or from your app's web version
fetch('https://map-reversing-dude.ngrok-free.dev/api/scan/text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
  body: JSON.stringify({ text: 'test', source: 'text' })
})
```

---

## 🔍 Monitoring & Debugging

### 1. **Ngrok Terminal** (Shows HTTP traffic)
```
POST /api/scan/app                 200 OK       5.234s
POST /api/scan/text                200 OK       1.523s
GET /api/ping                      200 OK       0.045s
```
Click on any request to see details:
- Request headers
- Request body
- Response status
- Response body

### 2. **Flask Terminal** (Shows backend processing)
```
127.0.0.1 - - [30/Apr/2026 12:34:56] "POST /api/scan/app HTTP/1.1" 200 -
127.0.0.1 - - [30/Apr/2026 12:34:57] "POST /api/scan/text HTTP/1.1" 200 -
```

### 3. **Mobile App Console**
In your React app, you'll see:
```
📱 Mobile Platform - Using Ngrok URL: https://map-reversing-dude.ngrok-free.dev
🔄 [API Request] POST https://map-reversing-dude.ngrok-free.dev/api/scan/app
📨 [API Response] Status: 200 from https://map-reversing-dude.ngrok-free.dev/api/scan/app
✅ [API Success] Response received
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Failed to fetch" Error
**Cause**: Ngrok tunnel is not running
**Solution**:
```bash
# Make sure Ngrok is running
ngrok http 5001
```

### Issue 2: "Connection Refused" Error
**Cause**: Flask backend is not running on localhost:5001
**Solution**:
```bash
# Start Flask backend
cd backend
python server.py
```

### Issue 3: "HTTPS Certificate Error"
**Cause**: Ngrok uses self-signed certificates
**Solution**: Already handled! Headers include:
```javascript
"ngrok-skip-browser-warning": "true"
```

### Issue 4: CORS Issues
**Solution**: Your backend should have CORS enabled:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
```

### Issue 5: APK Upload Getting 413 Error
**Cause**: File size exceeds limit
**Solution**: Check Flask config for `MAX_CONTENT_LENGTH`:
```python
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
```

---

## 🔄 Request/Response Examples

### Example 1: Text Scan Request
```javascript
// Request
POST https://map-reversing-dude.ngrok-free.dev/api/scan/text
Content-Type: application/json

{
  "text": "Verify account now: https://example.com/verify",
  "source": "sms"
}

// Response
{
  "score": 0.75,
  "risk": "HIGH",
  "verdict": "Malicious",
  "inputType": "text",
  "xai": {
    "top_reasons": ["matched pattern: https://example.com/verify", "high-risk keyword: verify account"]
  }
}
```

### Example 2: APK Upload Request
```javascript
// Request
POST https://map-reversing-dude.ngrok-free.dev/api/scan/app
Content-Type: multipart/form-data

file: [APK binary data]

// Response
{
  "score": 0.45,
  "risk": "MEDIUM",
  "verdict": "Suspicious",
  "inputType": "apk",
  "fileInfo": {
    "filename": "app.apk",
    "sizeBytes": 5242880,
    "permissions": ["SEND_SMS", "READ_SMS"]
  }
}
```

---

## 📊 Verification Checklist

- [ ] Flask backend running on `localhost:5001`
- [ ] Ngrok tunnel active and showing `https://map-reversing-dude.ngrok-free.dev`
- [ ] Android app built and installed on device/emulator
- [ ] API requests shown in Ngrok terminal
- [ ] Flask backend logs show incoming requests
- [ ] Mobile app receives responses and displays results
- [ ] No SSL/HTTPS certificate errors
- [ ] File uploads complete successfully

---

## 🛠️ Code Configuration

**File**: `src/services/api.js`

```javascript
// Ngrok URL configured here
const NGROK_URL = "https://map-reversing-dude.ngrok-free.dev";

// Automatically used for mobile/native platform
function resolvedBase() {
  if (Capacitor.isNativePlatform()) {
    return NGROK_URL;  // ✅ Android app uses this
  }
  return "http://127.0.0.1:5001";  // Web uses local API
}
```

---

## 📱 Building & Running Android App

```bash
# Sync Capacitor
npx cap sync android

# Build debug APK
npx cap run android

# Or open in Android Studio
npx cap open android
```

---

## 💡 Pro Tips

1. **Keep Ngrok terminal visible** - You can see all requests in real-time
2. **Check Ngrok web interface** - Visit `http://localhost:4040` for detailed request/response inspection
3. **Monitor logs in parallel**:
   ```bash
   # Terminal 1: Flask
   python server.py
   
   # Terminal 2: Ngrok
   ngrok http 5001
   
   # Terminal 3: Mobile app console (in browser DevTools when debugging)
   ```

4. **Test endpoints independently**:
   ```bash
   curl -X POST https://map-reversing-dude.ngrok-free.dev/api/scan/text \
     -H "Content-Type: application/json" \
     -d '{"text":"test","source":"text"}'
   ```

---

## ✅ You're All Set!

Your app is now configured to:
- ✅ Use Ngrok for global backend access
- ✅ Route all mobile requests through the tunnel
- ✅ Connect to your local Flask server
- ✅ Handle HTTPS securely
- ✅ Log all requests for debugging

**Start testing and scanning!** 🚀

