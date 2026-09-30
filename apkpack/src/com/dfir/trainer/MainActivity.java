package com.dfir.trainer;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        TextView diag = new TextView(this);
        try {
            String[] files = getAssets().list("www");
            if (files == null || files.length == 0) {
                diag.setText("WARN: assets/www is EMPTY in this APK!");
                diag.setTextColor(Color.RED);
            } else {
                StringBuilder sb = new StringBuilder("assets/www OK: ");
                for (int i = 0; i < files.length; i++) sb.append(files[i]).append(" ");
                diag.setText(sb.toString());
                diag.setTextColor(Color.GRAY);
            }
        } catch (Exception e) {
            diag.setText("Asset check error: " + e);
            diag.setTextColor(Color.RED);
        }
        diag.setTextSize(9f);
        diag.setPadding(8, 4, 8, 4);
        root.addView(diag, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        webView = new WebView(this);
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setTextZoom(100);
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/www/index.html");
        root.addView(webView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}