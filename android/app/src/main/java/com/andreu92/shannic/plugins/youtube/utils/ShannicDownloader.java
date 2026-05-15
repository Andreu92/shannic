package com.andreu92.shannic.plugins.youtube.utils;

import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import okhttp3.OkHttpClient;
import okhttp3.RequestBody;
import okhttp3.ResponseBody;

public final class ShannicDownloader extends Downloader {
    public static final String USER_AGENT =
        "Mozilla/5.0 (X11; Linux x86_64; rv:148.0) Gecko/20100101 Firefox/148.0";
    private static ShannicDownloader instance;
    private static OkHttpClient client;

    public static ShannicDownloader init() {
        client = new OkHttpClient.Builder().build();
        instance = new ShannicDownloader();
        return instance;
    }

    public static ShannicDownloader getInstance() {
        if (instance == null) {
            init();
        }
        return instance;
    }

    @Override
    public Response execute(final Request request)
            throws IOException, ReCaptchaException {
        final String httpMethod = request.httpMethod();
        final String url = request.url();
        final Map<String, List<String>> headers = request.headers();
        final byte[] dataToSend = request.dataToSend();

        RequestBody requestBody = null;
        if (dataToSend != null) {
            requestBody = RequestBody.create(dataToSend);
        }

        final okhttp3.Request.Builder requestBuilder = new okhttp3.Request.Builder()
            .method(httpMethod, requestBody)
            .url(url)
            .addHeader("User-Agent", USER_AGENT);

        headers.forEach((headerName, headerValueList) -> {
            requestBuilder.removeHeader(headerName);
            headerValueList.forEach(headerValue ->
                requestBuilder.addHeader(headerName, headerValue));
        });

        try (okhttp3.Response response =
                 client.newCall(requestBuilder.build()).execute()
        ) {
            String responseBodyToReturn = null;
            try (ResponseBody body = response.body()) {
                if (body != null) {
                    responseBodyToReturn = body.string();
                }
            }

            return new Response(
                response.code(),
                response.message(),
                response.headers().toMultimap(),
                responseBodyToReturn,
                response.request().url().toString());
        }
    }
}
