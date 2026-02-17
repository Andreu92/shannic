package com.andreu92.shannic.innertube;

import androidx.annotation.NonNull;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.annotation.JsonAutoDetect;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class InnerTubeClient {
    public static final String USER_AGENT = "com.google.android.apps.youtube.vr.oculus/1.71.26 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";
    private static final String YOUTUBE_CLIENT_VERSION = "1.71.26";
    private static final String YOUTUBE_CLIENT_NAME = "28";
    private static final String API_ORIGIN = "https://youtubei.googleapis.com";
    private static final String BASE_URL = "https://youtubei.googleapis.com/youtubei/v1/";
    private static final String VIDEO_ONLY_PARAMS = "EgIQAQ%3D%3D";
    private String apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private String visitorId = null;

    public static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private static final InnerTubeContext ANDROID_VR_CONTEXT = new InnerTubeContext(
            new ClientContext(
                    "ANDROID_VR",
                    YOUTUBE_CLIENT_VERSION,
                    "Oculus",
                    "Quest 3",
                    32,
                    USER_AGENT,
                    "Android",
                    "12L"),
            null);

    public InnerTubeClient() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .readTimeout(java.time.Duration.ofSeconds(10))
                .build();
        this.objectMapper = JsonMapper.builder()
                .defaultPropertyInclusion(JsonInclude.Value.construct(JsonInclude.Include.NON_NULL, JsonInclude.Include.ALWAYS))
                .visibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY)
                .enable(SerializationFeature.INDENT_OUTPUT)
                .build();
    }

    public CompletableFuture<Void> fetchApiKey() {
        Request request = new Request.Builder()
                .url("https://www.youtube.com")
                .header("User-Agent", USER_AGENT)
                .get()
                .build();

        CompletableFuture<Void> future = new CompletableFuture<>();
        httpClient.newCall(request).enqueue(new Callback() {
            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                    future.complete(null);
                    return;
                }
                assert response.body() != null;
                String html = response.body().string();
                Pattern keyPattern = Pattern.compile("\"INNERTUBE_API_KEY\":\"([^\"]+)\"");
                Matcher keyMatcher = keyPattern.matcher(html);
                if (keyMatcher.find()) {
                    apiKey = keyMatcher.group(1);
                    System.out.println("API Key: " + apiKey);
                }

                Pattern visitorPattern = Pattern.compile("\"VISITOR_DATA\":\"([^\"]+)\"");
                Matcher visitorMatcher = visitorPattern.matcher(html);
                if (visitorMatcher.find()) {
                    visitorId = visitorMatcher.group(1);
                    System.out.println("Visitor ID: " + visitorId);
                }
                future.complete(null);
            }

            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                future.completeExceptionally(e);
            }
        });
        return future;
    }

    public CompletableFuture<JsonNode> search(String query, String continuation) {
        try {
            String json = objectMapper
                    .writeValueAsString(new SearchRequest(ANDROID_VR_CONTEXT, query, VIDEO_ONLY_PARAMS, continuation));
            return sendPostRequest("search", json);
        } catch (Exception e) {
            CompletableFuture<JsonNode> future = new CompletableFuture<>();
            future.completeExceptionally(e);
            return future;
        }
    }

    public CompletableFuture<JsonNode> search(String query) {
        return search(query, null);
    }

    public CompletableFuture<JsonNode> player(String videoId) {
        try {
            PlaybackContext playbackContext = new PlaybackContext(new ContentCheck(true, true));
            String json = objectMapper
                    .writeValueAsString(new PlayerRequest(ANDROID_VR_CONTEXT, videoId, playbackContext));
            return sendPostRequest("player", json);
        } catch (Exception e) {
            CompletableFuture<JsonNode> future = new CompletableFuture<>();
            future.completeExceptionally(e);
            return future;
        }
    }

    private CompletableFuture<JsonNode> sendPostRequest(String endpoint, String jsonPayload) {
        Request.Builder requestBuilder = new Request.Builder()
                .url(BASE_URL + endpoint + "?key=" + apiKey)
                .post(RequestBody.create(jsonPayload, JSON))
                .header("Content-Type", "application/json")
                .header("X-YouTube-Client-Name", YOUTUBE_CLIENT_NAME)
                .header("X-YouTube-Client-Version", YOUTUBE_CLIENT_VERSION)
                .header("User-Agent", USER_AGENT)
                .header("Origin", API_ORIGIN)
                .header("X-Origin", API_ORIGIN);

        if (visitorId != null && !visitorId.isEmpty()) {
            requestBuilder.header("X-Goog-Visitor-Id", visitorId);
        }

        CompletableFuture<JsonNode> future = new CompletableFuture<>();
        httpClient.newCall(requestBuilder.build()).enqueue(new Callback() {
            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) {
                try {
                    assert response.body() != null;
                    String body = response.body().string();
                    if (!response.isSuccessful()) {
                        future.completeExceptionally(
                                new RuntimeException("Error de red (" + response.code() + "): " + body));
                        return;
                    }
                    JsonNode root = objectMapper.readTree(body);
                    JsonNode visitorData = root.path("responseContext").path("visitorData");
                    if (!visitorData.isMissingNode()) {
                        visitorId = visitorData.asText();
                    }
                    future.complete(root);
                } catch (Exception e) {
                    future.completeExceptionally(new RuntimeException("Error procesando respuesta", e));
                }
            }

            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                future.completeExceptionally(e);
            }
        });
        return future;
    }

}
