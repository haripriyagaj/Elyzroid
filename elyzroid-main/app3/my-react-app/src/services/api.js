import { Capacitor } from "@capacitor/core";

// ============================================
// BACKEND CONFIGURATION FOR GLOBAL ACCESS
// ============================================
// Ngrok public endpoint - Global access through tunnel to local Flask server
// This URL is stable and accessible from mobile devices, emulators, and browsers
const NGROK_URL = "https://map-reversing-dude.ngrok-free.dev";

// Local development URLs (only for web/browser)
const API_BASE = "http://127.0.0.1:5001";

// Default headers for Ngrok requests (includes Ngrok auth if needed)
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true", // Skip Ngrok's browser warning
};

function resolvedBase() {
  // Check if we're in Capacitor native mode
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
// 🔧 DEBUG: Log platform detection
  console.log("Platform Detection:", {
    isNative,
    platform: platform,
    isServer: Capacitor.isServer,
  });
  
  // Check for emulator environment - Android emulator uses 10.0.2.2 which won't reach Flask
  // On Android emulator, isNative might be true but network still needs Ngrok
  // ✅ ALWAYS use Ngrok for any non-web platform (android, ios, native)
  // This ensures emulator can reach Flask via Ngrok tunnel
  const isWeb = platform === 'web' || platform === 'localhost';
  
  if (!isWeb) {
    console.log("📱 Mobile/Emulator Platform - Using Ngrok URL:", NGROK_URL);
    return NGROK_URL;
  }
  
  // Use local API for web/browser development only
  // But allow override via localStorage for testing
  const forceNgrok = localStorage.getItem("FORCE_NGROK");
  if (forceNgrok === "true") {
    console.log("🔧 Force Ngrok Override - Using:", NGROK_URL);
    return NGROK_URL;
  }
  
  console.log("🌐 Web Platform - Using Local API:", API_BASE);
  return API_BASE;
}

/**
 * Enhanced fetch wrapper with better error handling and logging
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    console.log(`🔄 [API Request] ${options.method || "GET"} ${url}`);
    const res = await fetch(url, {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    });

    console.log(`📨 [API Response] Status: ${res.status} from ${url}`);

    if (!res.ok) {
      let errBody = {};
      try {
        errBody = await res.json();
      } catch (e) {
        // Response is not JSON, use raw text
        errBody = { error: await res.text() };
      }

      const msg = errBody.error || errBody.message || `Request failed (${res.status})`;
      console.error(`❌ [API Error] ${msg}`);
      throw new Error(msg);
    }

    const data = await res.json();
    console.log(`✅ [API Success] Response received`);
    return data;
  } catch (error) {
    console.error(`🚨 [API Exception] ${error.message}`);
    throw error;
  }
}

/** JSON scan: pass { type, value } e.g. url | package | hash | text */
export async function scanApp(payload) {
  return fetchWithErrorHandling(`${resolvedBase()}/api/scan/app`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Text scan (SMS / notification content) */
export async function scanText({ text, source = "text" }) {
  return fetchWithErrorHandling(`${resolvedBase()}/api/scan/text`, {
    method: "POST",
    body: JSON.stringify({ text, source }),
  });
}

/** APK upload (multipart) */
export async function scanAppUpload(file) {
  const form = new FormData();
  form.append("apk", file, file.name || "upload.apk");

  // For multipart, don't set Content-Type header (browser will set it with boundary)
  return fetchWithErrorHandling(`${resolvedBase()}/api/scan/app`, {
    method: "POST",
    body: form,
    headers: {
      "ngrok-skip-browser-warning": "true", // Still include Ngrok header
      // Don't include Content-Type for FormData
    },
  });
}
