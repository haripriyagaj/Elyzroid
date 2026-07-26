# 🚀 Quick Start - Running Your App with Ngrok Backend

## Step-by-Step Setup

### Step 1: Start Flask Backend (Terminal 1)
```bash
cd D:\app4\app3\my-react-app\backend
python server.py
```
✅ Wait for: `Running on http://127.0.0.1:5001`

---

### Step 2: Start Ngrok Tunnel (Terminal 2)
```bash
ngrok http 5001
```
✅ You should see: `Forwarding https://map-reversing-dude.ngrok-free.dev -> http://localhost:5001`

Keep this terminal open and watch the requests!

---

### Step 3: Build Android App (Terminal 3)
```bash
cd D:\app4\app3\my-react-app
npx cap sync android
npx cap run android
```

Or open directly in Android Studio:
```bash
npx cap open android
```

---

## 🎯 What Your App Does Now

When you upload an APK or scan text:

1. **App Request**
   ```
   Mobile App → POST https://map-reversing-dude.ngrok-free.dev/api/scan/app
   ```

2. **Ngrok Receives**
   - Shows in Ngrok terminal: ✅ `POST /api/scan/app 200 OK`
   - Can inspect headers, body, response

3. **Flask Processes**
   - Shows in Flask terminal: `127.0.0.1 - - [30/Apr/2026...] "POST /api/scan/app HTTP/1.1" 200`
   - Analyzes the APK/text using ElyzoridScanEngine

4. **App Receives Response**
   - Displays risk level, permissions, recommendations
   - Shows alerts for suspicious content

---

## 🔍 Monitoring All 3 Terminals

```
┌─────────────────────────────────────────────────────────┐
│ Terminal 1: Flask Backend                               │
│ $ python server.py                                      │
│ * Running on http://127.0.0.1:5001                      │
│ 127.0.0.1 - - [30/Apr/2026...] POST /api/scan/app 200  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Terminal 2: Ngrok Tunnel                                │
│ $ ngrok http 5001                                       │
│ Forwarding: https://map-reversing-dude.ngrok-free.dev  │
│ POST /api/scan/app                        200 OK   5.2s │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Terminal 3: Android App                                 │
│ $ npx cap run android                                   │
│ 📱 Mobile Platform - Using Ngrok URL                   │
│ 🔄 [API Request] POST /api/scan/app                     │
│ ✅ [API Success] Response received                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Test Scenarios

### Test 1: Upload an APK
1. App Home → File Scanner
2. Click "Choose File" 
3. Select any .apk file
4. Watch all 3 terminals light up
5. See scan results in app

### Test 2: Scan Text
1. App Home → Quick Scan
2. Enter: `https://malicious-site.com`
3. Click "Scan this app"
4. Should show HIGH risk

### Test 3: Scan Package Name
1. App Home → Quick Scan
2. Enter: `com.android.chrome`
3. Click "Scan this app"
4. Should show LOW risk

### Test 4: Direct Backend Test
```bash
# Open new terminal
curl -X POST https://map-reversing-dude.ngrok-free.dev/api/scan/text \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"text":"Click here: https://bit.ly/scam","source":"sms"}'
```

Expected response:
```json
{
  "score": 0.65,
  "risk": "HIGH",
  "verdict": "Malicious",
  "explanation": "...",
  "recommendations": [...]
}
```

---

## ✅ Configuration Verified

Your app is configured to:

✅ **API Endpoint**: `https://map-reversing-dude.ngrok-free.dev`
✅ **Auto-detected**: Uses Ngrok for mobile, local for web
✅ **Error Handling**: Detailed logging of all requests
✅ **HTTPS Support**: Ngrok headers configured
✅ **File Upload**: Multipart form-data ready
✅ **Text Scanning**: JSON POST ready
✅ **Notifications**: Link detection enabled (https:// and http://)

---

## 🐛 Debugging Tips

### If app says "Scan failed":
1. Check Flask terminal - any errors?
2. Check Ngrok terminal - did request arrive?
3. Look at mobile app console logs
4. Verify Ngrok URL in nativeBridge.js

### If no response:
1. Is Ngrok running? Check Terminal 2
2. Is Flask running? Check Terminal 1
3. Is APK/text empty? App requires input
4. Check your internet connection

### To see detailed Ngrok logs:
Open browser: `http://localhost:4040`
- Shows all requests in GUI
- Can replay requests
- Shows full headers/body

---

## 📦 APK Location

After build, APK is at:
```
D:\app4\app3\my-react-app\android\app\build\outputs\apk\debug\app-debug.apk
```

Push to device:
```bash
adb install -r D:\app4\app3\my-react-app\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🔐 Security Note

The Ngrok URL is **PUBLIC** but:
- Ngrok provides unique URL for your session
- Can add authentication if needed
- Data passes through Ngrok tunnel
- All HTTPS encrypted

For production, use your own domain + SSL certificate.

---

## 💡 Troubleshooting Checklist

- [ ] Flask backend started (`python server.py`)
- [ ] Ngrok tunnel active (`ngrok http 5001`)
- [ ] Ngrok shows: `https://map-reversing-dude.ngrok-free.dev`
- [ ] Android app built and installed
- [ ] App uses Ngrok URL (check console logs)
- [ ] Can see requests in Ngrok terminal
- [ ] Can see requests in Flask terminal
- [ ] App displays scan results
- [ ] No certificate/SSL errors
- [ ] File uploads work correctly

---

## 🎉 You're Ready!

Everything is set up. Just:
1. Run Flask (`python server.py`)
2. Run Ngrok (`ngrok http 5001`)
3. Run App (`npx cap run android`)
4. Upload APK or scan text
5. Watch the magic happen! ✨

Questions? Check `BACKEND_NGROK_SETUP.md` for detailed info.

