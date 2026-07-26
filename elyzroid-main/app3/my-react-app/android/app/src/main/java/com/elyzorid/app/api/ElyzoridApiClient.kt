package com.elyzorid.app.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.GET
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Retrofit-based API client for Elyzorid backend.
 * Connects to Ngrok tunnel: https://map-reversing-dude.ngrok-free.dev
 * 
 * Add dependencies in build.gradle:
 * implementation "com.squareup.retrofit2:retrofit:2.9.0"
 * implementation "com.squareup.retrofit2:converter-gson:2.9.0"
 * implementation "com.squareup.okhttp3:logging-interceptor:4.12.0"
 */

// ===== API Interface =====
interface ElyzoridApi {
    
    @POST("/api/scan/app")
    fun scanApp(@Body request: ScanRequest): Call<ScanResponse>
    
    @POST("/api/scan/text")
    fun scanText(@Body request: TextScanRequest): Call<ScanResponse>
    
    @GET("/health")
    fun health(): Call<HealthResponse>
}

// ===== Request/Response Data Classes =====
data class ScanRequest(
    val type: String,
    val value: String
)

data class TextScanRequest(
    val text: String,
    val source: String = "text"
)

data class ScanResponse(
    val score: Double,
    val risk: String,
    val verdict: String,
    val inputType: String,
    val explanation: String? = null,
    val recommendations: List<String>? = null
)

data class HealthResponse(
    val ok: Boolean,
    val port: Int,
    val tensorflowAvailable: Boolean? = null
)

// ===== Retrofit Client with Logging =====
object ElyzoridApiClient {
    
    // ✅ Ngrok URL - accessible from phone via tunnel
    private const val BASE_URL = "https://map-reversing-dude.ngrok-free.dev"
    
    // Logging interceptor for debugging - shows request/response in Logcat
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }
    
    // OkHttpClient with logging enabled
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()
    
    val api: ElyzoridApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ElyzoridApi::class.java)
    }
    
    // ===== Convenience Methods =====
    
    /**
     * Scan app (URL, package name, or hash)
     * Usage in Activity:
     *   val call = ElyzoridApiClient.scanApp("url", "https://example.com")
     *   call.enqueue(object : Callback<ScanResponse> {
     *       override fun onResponse(call: Call<ScanResponse>, response: Response<ScanResponse>) {
     *           Log.d("Elyzorid", "Score: ${response.body()?.score}, Risk: ${response.body()?.risk}")
     *       }
     *       override fun onFailure(call: Call<ScanResponse>, t: Throwable) {
     *           Log.e("Elyzorid", "Failed: ${t.message}")
     *       }
     *   })
     */
    fun scanApp(type: String, value: String): Call<ScanResponse> {
        val request = ScanRequest(type, value)
        return api.scanApp(request)
    }
    
    /**
     * Scan text (SMS or notification content)
     * Usage:
     *   val call = ElyzoridApiClient.scanText("Your account has been compromised!", "sms")
     */
    fun scanText(text: String, source: String = "text"): Call<ScanResponse> {
        val request = TextScanRequest(text, source)
        return api.scanText(request)
    }
    
    /**
     * Check backend health
     * Usage:
     *   val call = ElyzoridApiClient.health()
     */
    fun health(): Call<HealthResponse> {
        return api.health()
    }
}
