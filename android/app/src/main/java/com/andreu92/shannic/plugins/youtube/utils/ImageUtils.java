package com.andreu92.shannic.plugins.youtube.utils;

import java.io.IOException;
import java.util.Base64;

import okhttp3.Request;
import okhttp3.Response;

public class ImageUtils {
    public static String getBase64(String urlString) throws IOException {
        if (urlString == null || urlString.isEmpty()) return null;
        
        String mimeType = "image/jpeg";
        String lowerUrl = urlString.toLowerCase();

        if (lowerUrl.endsWith(".png")) mimeType = "image/png";
        else if (lowerUrl.endsWith(".webp")) mimeType = "image/webp";
        else if (lowerUrl.endsWith(".gif")) mimeType = "image/gif";

        byte[] imageBytes = getBytes(urlString);

        String base64Data = Base64.getEncoder().encodeToString(imageBytes);
        return "data:" + mimeType + ";base64," + base64Data;
    }

    private static byte[] getBytes(String urlString) throws IOException {
        okhttp3.OkHttpClient httpClient = new okhttp3.OkHttpClient();

        Request request = new Request.Builder()
                .url(urlString)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code " + response);
            }
            if (response.body() == null) {
                throw new IOException("Response body is null");
            }
            return response.body().bytes();
        }
    }
}
