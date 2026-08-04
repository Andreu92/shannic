package com.andreu92.shannic.plugins.youtube;

import static com.andreu92.shannic.plugins.youtube.YoutubePlugin.mapper;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static java.util.Collections.singletonList;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.schabi.newpipe.extractor.InfoItem;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.Page;
import org.schabi.newpipe.extractor.StreamingService;
import org.schabi.newpipe.extractor.exceptions.ExtractionException;
import org.schabi.newpipe.extractor.ListExtractor.InfoItemsPage;
import org.schabi.newpipe.extractor.search.SearchExtractor;
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory;
import org.schabi.newpipe.extractor.stream.StreamInfoItem;
import org.schabi.newpipe.extractor.playlist.PlaylistExtractor;

import static org.schabi.newpipe.extractor.ServiceList.YouTube;

import android.util.Log;

import com.andreu92.shannic.models.*;
import com.andreu92.shannic.plugins.youtube.utils.*;
import com.fasterxml.jackson.databind.JsonNode;

import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class YoutubeService {
    private static YoutubeService youtubeService;
    private StreamingService youtube;
    private SearchExtractor searchExtractor;
    private Page searchNextPage;
    private PlaylistExtractor playlistExtractor;
    private Page autoPlayNextPage;
    private String currentItemId;
    private String visitorId;
    private int signatureTimestamp;
    private File appFolder;

    private YoutubeService() {
        NewPipe.init(ShannicDownloader.getInstance());

        try {
            youtube = NewPipe.getService(YouTube.getServiceId());
        } catch (ExtractionException ignored) {}
    }

    public static YoutubeService getInstance() {
        if (youtubeService == null) {
            youtubeService = new YoutubeService();
        }
        return youtubeService;
    }

    public void setCurrentItemId(String id) {
        this.currentItemId = id;
    }

    public void setAppFolder(File appFolder) {
        this.appFolder = appFolder;
    }

    public void resetAutoPlay() {
        playlistExtractor = null;
        autoPlayNextPage = null;
    }

    public SearchResponse search(String query) throws ExtractionException, IOException {
        return search(query, singletonList(YoutubeSearchQueryHandlerFactory.VIDEOS));
    }

    public SearchResponse searchMusic(String query) throws ExtractionException, IOException {
        return search(query, singletonList(YoutubeSearchQueryHandlerFactory.MUSIC_SONGS));
    }

    public SearchResponse search(String query, List<String> filters)
            throws ExtractionException, IOException {
        searchExtractor = youtube.getSearchExtractor(query, filters, null);
        searchExtractor.fetchPage();
        return parseSearchResults(searchExtractor.getInitialPage());
    }

    public SearchResponse fetchNextPage() throws ExtractionException, IOException {
        if (searchExtractor == null) return null;
        return parseSearchResults(searchExtractor.getPage(searchNextPage));
    }


    private SearchResponse parseSearchResults(InfoItemsPage<InfoItem> page) {
        List<SearchItem> results = new ArrayList<>();
        List<InfoItem> searchResults = page.getItems();
        for (InfoItem infoItem : searchResults) {
            StreamInfoItem searchResult = (StreamInfoItem) infoItem;
            results.add(new SearchItem(
                    extractYoutubeId(searchResult.getUrl()),
                    searchResult.getName(),
                    searchResult.getUploaderName(),
                    searchResult.getThumbnails()
                            .get(searchResult.getThumbnails().size() - 1)
                            .getUrl(),
                    searchResult.getDuration()
            ));
        }

        if (page.hasNextPage()) {
            searchNextPage = page.getNextPage();
        }

        return new SearchResponse(page.hasNextPage(), results);
    }

    public String extractYoutubeId(String url) {
        if (url == null || !url.contains(YoutubeConstants.VIDEO_QUERY_PARAM)) return null;
        String id = url.split(YoutubeConstants.VIDEO_QUERY_PARAM)[1];
        int ampersandIndex = id.indexOf("&");
        if (ampersandIndex != -1) {
            id = id.substring(0, ampersandIndex);
        }
        return id;
    }

    // NEWPIPE EXTRACTOR WAY (SLOWER BUT MAY BE NECESSARY IN THE FUTURE)
    /*public AudioItem get(String id) {
        try {
            streamExtractor = youtube.getStreamExtractor(YoutubeConstants.WATCH_FULL_URL + id);
            streamExtractor.fetchPage();

            String uploader = streamExtractor.getUploaderName();
            uploader = uploader.replace(" - Topic", "");

            List<AudioStream> audioStreams = streamExtractor.getAudioStreams();
            AudioStream bestAudioStream = audioStreams.stream()
                    .max(Comparator.comparingInt(AudioStream::getBitrate))
                    .orElse(null);

            List<Image> thumbnails = streamExtractor.getThumbnails();
            Image thumbnail = thumbnails.get(thumbnails.size() - 1);
            String thumbnailPath = storeThumbnail(id, thumbnail.getUrl());

            String streamUrl = bestAudioStream.getContent();
            long expiresAt = Long.parseLong(streamUrl
                            .split(YoutubeConstants.EXPIRE_QUERY_PARAM)[1]
                            .split("&")[0]);

            return new AudioItem(
                    id,
                    streamExtractor.getName(),
                    uploader,
                    streamExtractor.getLength(),
                    thumbnailPath,
                    streamUrl,
                    expiresAt
            );
        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
            return null;
        }
    }*/

    public AudioItem get(String id) {
        OkHttpClient httpClient = HttpClient.getInstance();

        if (visitorId == null) {
            Request request = new Request.Builder()
                    .url(YoutubeConstants.BASE_URL)
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful() || response.body() == null) return null;
                String html = response.body().string();
                visitorId = extract(html, "\"VISITOR_DATA\":\"([^\"]+)\"");

                String sts = extract(html, "STS\":(\\d+)");
                if (sts == null) sts = extract(html, "\"signatureTimestamp\":(\\d+)");
                if (sts != null) signatureTimestamp = Integer.parseInt(sts);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }

        Headers headers = new Headers.Builder()
            .add("Content-Type", "application/json")
            .add("X-YouTube-Client-Name", "28")
            .add("User-Agent", YoutubeConstants.VR_USER_AGENT)
            .add("X-YouTube-Client-Version", YoutubeConstants.VR_CLIENT_VERSION)
            .add("X-Goog-Visitor-Id", visitorId)
            .add("Origin", YoutubeConstants.BASE_URL)
            .build();

        String jsonPayload = String.format(Locale.ROOT, """
            {
              "context": {
                "client": {
                  "clientName": "ANDROID_VR",
                  "clientVersion": "%s",
                  "userAgent": "%s",
                  "osName": "Android",
                  "osVersion": "12L",
                  "hl": "en",
                  "timeZone": "UTC",
                  "utcOffsetMinutes": 0,
                  "deviceMake": "Oculus",
                  "deviceModel": "Quest 3",
                  "androidSdkVersion": 32
                }
              },
              "videoId": "%s",
              "playbackContext": {
                "contentPlaybackContext": {
                  "html5Preference": "HTML5_PREF_WANTS",
                  "signatureTimestamp": %d
                }
              },
              "contentCheckOk": true,
              "racyCheckOk": true
            }
            """,
                YoutubeConstants.VR_CLIENT_VERSION,
                YoutubeConstants.VR_USER_AGENT,
                id,
                signatureTimestamp);

        RequestBody requestBody = RequestBody.create(
                jsonPayload, MediaType.get("application/json; charset=utf-8"));

        Request request = new Request.Builder()
                .method("POST", requestBody)
                .url(YoutubeConstants.PLAYER_FULL_URL)
                .headers(headers)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code " + response);
            }
            if (response.body() == null) {
                throw new IOException("Response body is null");
            }

            String body = response.body().string();
            JsonNode root = mapper.readTree(body);
            return parsePlayerResponse(root);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String extract(String html, String patternStr) {
        Pattern pattern = Pattern.compile(patternStr);
        Matcher matcher = pattern.matcher(html);
        return matcher.find() ? matcher.group(1) : null;
    }

    public AudioItem parsePlayerResponse(JsonNode root) {
        JsonNode videoDetails = root.path("videoDetails");
        String videoId = videoDetails.path("videoId").asText();
        String title = videoDetails.path("title").asText();
        String uploader = videoDetails.path("author").asText()
                .replace(" - Topic", "");;
        long duration = videoDetails.path("lengthSeconds").asLong(0);

        JsonNode streamingData = root.path("streamingData");
        List<JsonNode> allFormats = new ArrayList<>();
        if (streamingData.has("formats"))
            streamingData.path("formats").forEach(allFormats::add);
        if (streamingData.has("adaptiveFormats"))
            streamingData.path("adaptiveFormats").forEach(allFormats::add);

        String src = "";
        long expiresAt = 0;
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
                    src = formatUrl;
                }
            }
        }

        if (src.isEmpty()) {
            for (JsonNode format : allFormats) {
                String formatUrl = format.path("url").asText();
                long bitrate = format.path("bitrate").asLong(0);
                if (!formatUrl.isEmpty() && bitrate > maxAudioBitrate) {
                    maxAudioBitrate = bitrate;
                    src = formatUrl;
                }
            }
        }

        if (!src.isEmpty()) {
            try {
                okhttp3.HttpUrl httpUrl = okhttp3.HttpUrl.parse(src);
                if (httpUrl != null) {
                    String expire = httpUrl.queryParameter("expire");
                    if (expire != null) {
                        expiresAt = Long.parseLong(expire);
                    }
                }
            } catch (Exception ignored) {}
        }

        JsonNode thumbnails = videoDetails.path("thumbnail").path("thumbnails");
        String thumbnailPath = "";
        if (thumbnails.isArray() && !thumbnails.isEmpty()) {
            thumbnailPath = storeThumbnail(videoId,
                    thumbnails.get(thumbnails.size() - 1).path("url").asText());
        }

        return new AudioItem(
                videoId,
                title,
                uploader,
                duration,
                thumbnailPath,
                src,
                expiresAt
        );
    }

    private String storeThumbnail(String id, String url) {
        OkHttpClient httpClient = HttpClient.getInstance();

        Request request = new Request.Builder()
                .url(url)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code " + response);
            }
            if (response.body() == null) {
                throw new IOException("Response body is null");
            }

            File imgFolder = new File(appFolder, "img");
            if (!imgFolder.exists()) imgFolder.mkdirs();

            File targetFile = new File(imgFolder, id);

            try (InputStream inputStream = response.body().byteStream();
                 FileOutputStream outputStream = new FileOutputStream(targetFile)) {

                byte[] buffer = new byte[4096];
                int bytesRead;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }

                outputStream.flush();
                return targetFile.getAbsolutePath();
            } catch (IOException e) {
                return null;
            }
        } catch (IOException e) {
            return null;
        }
    }

    public List<String> getNextItems() {
        if (currentItemId == null) return null;

        try {
            if (playlistExtractor != null && autoPlayNextPage != null)
                return buildItemPageIdsList(playlistExtractor.getPage(autoPlayNextPage));

            playlistExtractor = youtube.getPlaylistExtractor(
                    YoutubeConstants.WATCH_FULL_URL + currentItemId + "&"
                            + YoutubeConstants.LIST_QUERY_PARAM_FULL + currentItemId);
            playlistExtractor.fetchPage();
            return buildItemPageIdsList(playlistExtractor.getInitialPage());
        } catch (Exception e) {
            Log.e("Shannic autoplay", e.toString());
            return null;
        }
    }

    private List<String> buildItemPageIdsList(InfoItemsPage<StreamInfoItem> page) {
        if (page.hasNextPage()) autoPlayNextPage = page.getNextPage();
        else autoPlayNextPage = null;
        List<String> ids = new ArrayList<>();
        for (InfoItem item : page.getItems()) ids.add(extractYoutubeId(item.getUrl()));
        return ids;
    }

    public AudioItem getByQuery(final String artist, final String title)
            throws ExtractionException, IOException {
        SearchResponse response = searchMusic(artist + " " + title);
        SearchItem bestMatch = SongMatcher.getBestYoutubeMatch(artist, title, response.items());
        return get(bestMatch.id());
    }
}
