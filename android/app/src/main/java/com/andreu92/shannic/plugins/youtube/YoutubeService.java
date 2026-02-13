package com.andreu92.shannic.plugins.youtube;

import android.util.Base64;

import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import okhttp3.Request;
import okhttp3.Response;

public class YoutubeService {
    private static YoutubeService client;
    private final InnertubeClient innertubeClient = new InnertubeClient();
    private final ExecutorService executorService;

    public record SearchItem(String id, String title, String author, String thumbnail, String duration) {}
    public record SearchResponse(List<SearchItem> items, String continuationToken) {}
    public record ThumbnailInfo(String url, String base64) {}
    public record AudioItem(
            String id,
            String title,
            String author,
            long duration,
            String duration_text,
            ThumbnailInfo thumbnail,
            String url,
            long expires_at) {}

    private YoutubeService() {
        InnertubeClient innertubeClient = new InnertubeClient();
        executorService = Executors.newSingleThreadExecutor();
        executorService.execute(innertubeClient::fetchApiKey);
    }

    public static YoutubeService getInstance() {
        if (client == null)
            client = new YoutubeService();

        return client;
    }

    public SearchResponse search(final String query, final String nextToken) throws ExecutionException, InterruptedException {
        CompletableFuture<JsonNode> future = innertubeClient.search(query, nextToken);
        return processSearchResults(future.get());
    }

    public AudioItem get(final String id) throws ExecutionException, InterruptedException, IOException {
        CompletableFuture<JsonNode> future = innertubeClient.player(id);
        return processPlayerResponse(future.get());
    }

    public AudioItem getByQuery(final String artist, final String title) throws ExecutionException, InterruptedException, IOException {
        CompletableFuture<JsonNode> future = innertubeClient.search(artist + " " + title);
        SearchItem bestMatch = getBestYoutubeMatch(artist, title, processSearchResults(future.get()).items);
        return get(bestMatch.id());
    }

    public SearchResponse processSearchResults(JsonNode root) {
        List<SearchItem> items = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();

        List<JsonNode> searchNodes = root.findParents("videoId");
        for (JsonNode item : searchNodes) {
            String itemId = item.path("videoId").asText();
            if (itemId.isEmpty() || seenIds.contains(itemId))
                continue;

            String title = StreamSupport.stream(item.path("title").path("runs").spliterator(), false)
                    .map(r -> r.path("text").asText())
                    .collect(Collectors.joining());

            if (title.isEmpty())
                continue;

            JsonNode authorNode = item.has("longBylineText") ? item.path("longBylineText") : item.path("bylineText");
            String author = StreamSupport.stream(authorNode.path("runs").spliterator(), false)
                    .map(r -> r.path("text").asText())
                    .collect(Collectors.joining());

            JsonNode thumbnails = item.path("thumbnail").path("thumbnails");
            String thumbnail = "";
            if (thumbnails.isArray() && thumbnails.size() > 0) {
                thumbnail = thumbnails.get(thumbnails.size() - 1).path("url").asText();
            }

            JsonNode lengthText = item.path("lengthText");
            String duration = "-";
            if (lengthText.has("simpleText")) {
                duration = lengthText.get("simpleText").asText();
            } else if (lengthText.has("runs")) {
                duration = StreamSupport.stream(lengthText.get("runs").spliterator(), false)
                        .map(r -> r.path("text").asText())
                        .collect(Collectors.joining());
            }

            items.add(new SearchItem(itemId, title, author, thumbnail, duration));
            seenIds.add(itemId);
        }

        String continuationToken = "";
        List<JsonNode> continuationNodes = root.findValues("continuationCommand");
        if (!continuationNodes.isEmpty()) {
            continuationToken = continuationNodes.get(0).path("token").asText();
        } else {
            List<JsonNode> nextContinuationNodes = root.findValues("nextContinuationData");
            if (!nextContinuationNodes.isEmpty()) {
                continuationToken = nextContinuationNodes.get(0).path("continuation").asText();
            }
        }

        return new SearchResponse(items, continuationToken);
    }

    public SearchItem getBestYoutubeMatch(String spotifyArtist, String spotifyTitle, List<SearchItem> youtubeResults) {
        Set<String> spotifyTitleTokens = normalizeText(spotifyTitle);
        Set<String> spotifyArtistTokens = normalizeText(spotifyArtist);

        Set<String> fullQueryTokens = new HashSet<>(spotifyTitleTokens);
        fullQueryTokens.addAll(spotifyArtistTokens);

        SearchItem bestMatch = null;
        double bestScore = -1.0;

        for (SearchItem yt : youtubeResults) {
            Set<String> ytTitleTokens = normalizeText(yt.title());
            Set<String> ytAuthorTokens = normalizeText(yt.author());

            double titleScore = calculateIntersectionScore(fullQueryTokens, ytTitleTokens);
            double authorScore = calculateIntersectionScore(spotifyArtistTokens, ytAuthorTokens);
            double finalScore = (titleScore * 0.6) + (authorScore * 0.4);

            if (ytTitleTokens.contains("remix") && !spotifyTitleTokens.contains("remix")) {
                finalScore *= 0.8;
            }

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMatch = yt;
            }
        }
        return bestMatch;
    }

    private Set<String> normalizeText(String text) {
        if (text == null || text.isEmpty())
            return Collections.emptySet();
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("[^\\p{ASCII}]", "");
        Set<String> tokens = new HashSet<>();
        Pattern pattern = Pattern.compile("\\w+");
        Matcher matcher = pattern.matcher(normalized.toLowerCase());
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        return tokens;
    }

    private double calculateIntersectionScore(Set<String> queryTokens, Set<String> targetTokens) {
        if (queryTokens.isEmpty())
            return 0.0;
        Set<String> intersection = new HashSet<>(queryTokens);
        intersection.retainAll(targetTokens);
        return (double) intersection.size() / queryTokens.size();
    }

    private AudioItem processPlayerResponse(JsonNode root) throws IOException {
        JsonNode videoDetails = root.path("videoDetails");
        String videoId = videoDetails.path("videoId").asText();
        String title = videoDetails.path("title").asText();
        String author = videoDetails.path("author").asText();
        long seconds = videoDetails.path("lengthSeconds").asLong(0);
        long durationMs = seconds * 1000;

        String durationText = String.format("%d:%02d", seconds / 60, seconds % 60);
        if (seconds >= 3600) {
            durationText = String.format("%d:%02d:%02d", seconds / 3600, (seconds % 3600) / 60, seconds % 60);
        }

        JsonNode thumbnails = videoDetails.path("thumbnail").path("thumbnails");
        String thumbnailUrl = "";
        if (thumbnails.isArray() && !thumbnails.isEmpty()) {
            thumbnailUrl = thumbnails.get(thumbnails.size() - 1).path("url").asText();
        }

        JsonNode streamingData = root.path("streamingData");
        List<JsonNode> allFormats = new ArrayList<>();
        if (streamingData.has("formats"))
            streamingData.path("formats").forEach(allFormats::add);
        if (streamingData.has("adaptiveFormats"))
            streamingData.path("adaptiveFormats").forEach(allFormats::add);

        String url = "";
        long expirationDate = 0;
        long maxAudioBitrate = -1;

        for (JsonNode format : allFormats) {
            String mimeType = format.path("mimeType").asText();
            long bitrate = format.path("bitrate").asLong(0);
            String formatUrl = format.path("url").asText();
            if (formatUrl.isEmpty())
                continue;
            if (mimeType.startsWith("audio/")) {
                if (bitrate > maxAudioBitrate) {
                    maxAudioBitrate = bitrate;
                    url = formatUrl;
                }
            }
        }

        if (url.isEmpty()) {
            for (JsonNode format : allFormats) {
                String formatUrl = format.path("url").asText();
                long bitrate = format.path("bitrate").asLong(0);
                if (!formatUrl.isEmpty() && bitrate > maxAudioBitrate) {
                    maxAudioBitrate = bitrate;
                    url = formatUrl;
                }
            }
        }

        if (!url.isEmpty()) {
            try {
                okhttp3.HttpUrl httpUrl = okhttp3.HttpUrl.parse(url);
                if (httpUrl != null) {
                    String expire = httpUrl.queryParameter("expire");
                    if (expire != null) {
                        expirationDate = Long.parseLong(expire) * 1000;
                    }
                }
            } catch (Exception ignored) {}
        }

        String base64 = getBase64ImageFromUrl(thumbnailUrl);

        return new AudioItem(videoId, title, author, durationMs, durationText, new ThumbnailInfo(thumbnailUrl, base64),
                url, expirationDate);
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

    private byte[] getBytes(String urlString) throws IOException {
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
