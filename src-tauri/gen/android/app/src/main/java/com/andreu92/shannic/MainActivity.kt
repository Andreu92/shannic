package com.andreu92.shannic

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView

import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  @Volatile private var keepSplash = true
  private val handler = Handler(Looper.getMainLooper())

  inner class SplashBridge {
    @JavascriptInterface
    fun hide() { keepSplash = false }
  }
  
  override fun onCreate(savedInstanceState: Bundle?) {
    val splash = installSplashScreen()
    splash.setKeepOnScreenCondition { keepSplash }

    handler.postDelayed({ keepSplash = false }, 5000)

    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)

    if (hasFocus) {
      val controller = WindowCompat.getInsetsController(window, window.decorView)
      controller.systemBarsBehavior = 
        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      controller.hide(WindowInsetsCompat.Type.systemBars())
    }
  }

  override fun onWebViewCreate(webView: WebView) {
    webView.addJavascriptInterface(SplashBridge(), "SplashBridge")
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    super.onDestroy()
  }
}
