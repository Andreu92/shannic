package com.andreu92.shannic.plugins;

import android.util.Log;
import android.util.Base64;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "YoutubeClient")
public class YoutubeClient extends Plugin {
    private ExecutorService executorService;
    private PyObject pythonModule;
    private boolean pythonInitialized = false;

    @Override
    public void load() {
        super.load();
        executorService = Executors.newCachedThreadPool();
        initializePython();
    }

    private void initializePython() {
        if (!pythonInitialized) {
            try {
                if (!Python.isStarted()) {
                    Python.start(new AndroidPlatform(getContext()));
                    Python python = Python.getInstance();
                    pythonModule = python.getModule("main");
                }
                pythonInitialized = true;
            } catch (Exception e) {
                Log.e("AudioClientPlugin", "Failed to initialize Python", e);
            }
        }
    }

    @PluginMethod
    public void search(final PluginCall call) {
        final String query = call.getString("query");
        final String nextToken = call.getString("next_token");

        if (query == null || query.isEmpty()) {
            call.reject("Missing query");
            return;
        }

        if (!pythonInitialized) {
            call.reject("Python not initialized");
            return;
        }

        executorService.execute(() -> {
            try {
                PyObject result = pythonModule.callAttr("search", query, nextToken);
                JSONObject search = new JSONObject(result.toString());
                JSObject response = JSObject.fromJSONObject(search);
                call.resolve(response);
            } catch (Exception e) {
                Log.e("AudioClientPlugin", "Error searching", e);
                call.reject("Error searching");
            }
        });

    }

    @PluginMethod
    public void get(final PluginCall call) {
        String id = call.getString("id");

        if (id == null || id.isEmpty()) {
            call.reject("ID is required");
            return;
        }

        if (!pythonInitialized) {
            call.reject("Python not initialized");
            return;
        }

        executorService.execute(() -> {
            try {
                PyObject result = pythonModule.callAttr("get", id);
                JSONObject audio = new JSONObject(result.toString());

                JSONObject thumbnail = audio.getJSONObject("thumbnail");
                String url = thumbnail.getString("url");
                String base64 = getBase64ImageFromUrl(url);
                thumbnail.put("base64", base64);

                JSObject response = JSObject.fromJSONObject(audio);
                call.resolve(response);
            } catch (Exception e) {
                Log.e("AudioClientPlugin", "Error extracting", e);
                call.reject("Error extracting audio URL");
            }
        });
    }

    private String getBase64ImageFromUrl(String urlString) throws IOException {
        String mimeType = "image/jpeg";
        String lowerUrl = urlString.toLowerCase();

        if (lowerUrl.endsWith(".png")) {
            mimeType = "image/png";
        } else if (lowerUrl.endsWith(".webp")) {
            mimeType = "image/webp";
        } else if (lowerUrl.endsWith(".gif")) {
            mimeType = "image/gif";
        }

        byte[] imageBytes = getBytes(urlString);

        String base64Data = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
        return "data:" + mimeType + ";base64," + base64Data;
    }

    private static byte[] getBytes(String urlString) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(5000);
        connection.connect();

        InputStream is = connection.getInputStream();
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[4096];
        int nRead;

        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }

        return buffer.toByteArray();
    }
}
