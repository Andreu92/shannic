package com.andreu92.shannic.plugins.youtube.utils;

import okhttp3.OkHttpClient;

public class HttpClient {
    private static OkHttpClient instance;
    public static OkHttpClient getInstance() {
        if (instance == null) {
            instance = new OkHttpClient.Builder().build();
        }
        return instance;
    }
}
