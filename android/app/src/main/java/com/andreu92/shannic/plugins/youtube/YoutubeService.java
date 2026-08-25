package com.andreu92.shannic.plugins.youtube;

import static com.andreu92.shannic.plugins.Constants.FAKE_SRC;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static java.util.Collections.singletonList;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.schabi.newpipe.extractor.Image;
import org.schabi.newpipe.extractor.InfoItem;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.Page;
import org.schabi.newpipe.extractor.StreamingService;
import org.schabi.newpipe.extractor.exceptions.ExtractionException;
import org.schabi.newpipe.extractor.ListExtractor.InfoItemsPage;
import org.schabi.newpipe.extractor.search.SearchExtractor;
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.Stream;
import org.schabi.newpipe.extractor.stream.StreamExtractor;
import org.schabi.newpipe.extractor.stream.StreamInfoItem;
import org.schabi.newpipe.extractor.playlist.PlaylistExtractor;

import static org.schabi.newpipe.extractor.ServiceList.YouTube;

import android.util.Log;

import com.andreu92.shannic.models.*;
import com.andreu92.shannic.plugins.Constants;
import com.andreu92.shannic.plugins.youtube.utils.*;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class YoutubeService {
    private static YoutubeService youtubeService;
    private StreamingService youtube;
    private SearchExtractor searchExtractor;
    private Page searchNextPage;
    private PlaylistExtractor playlistExtractor;
    private Page autoPlayNextPage;
    private String currentItemId;
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

    public void clearCurrentPlaylistExtractor() {
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

    public AudioItem get(String id) {
        try {
            StreamExtractor streamExtractor = youtube
                    .getStreamExtractor(YoutubeConstants.WATCH_FULL_URL + id);
            streamExtractor.fetchPage();

            List<AudioStream> audioStreams = streamExtractor.getAudioStreams();
            AudioStream bestAudioStream = audioStreams.stream()
                    .filter(Stream::isUrl)
                    .max(Comparator.comparingInt(AudioStream::getBitrate))
                    .orElse(null);

            List<Image> thumbnails = streamExtractor.getThumbnails();
            Image thumbnail = thumbnails.get(thumbnails.size() - 1);
            String thumbnailPath = storeThumbnail(id, thumbnail.getUrl());

            String streamUrl = bestAudioStream.getContent();
            long expiresAt = Long.parseLong(streamUrl
                            .split(YoutubeConstants.EXPIRE_QUERY_PARAM + "=")[1]
                            .split("&")[0]);

            return new AudioItem(
                    id,
                    streamExtractor.getName(),
                    streamExtractor.getUploaderName().replace(" - Topic", ""),
                    streamExtractor.getLength(),
                    thumbnailPath,
                    streamUrl,
                    expiresAt
            );
        } catch (ExtractionException | IOException e) {
            Log.e("YoutubeService", e.toString());
            return null;
        }
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

    public List<AudioItem> getNextItems() {
        if (currentItemId == null) return null;

        try {
            if (playlistExtractor != null && autoPlayNextPage != null)
                return buildNextItemsList(playlistExtractor.getPage(autoPlayNextPage));

            playlistExtractor = youtube.getPlaylistExtractor(
                    YoutubeConstants.WATCH_FULL_URL + currentItemId + "&"
                            + YoutubeConstants.LIST_QUERY_PARAM_FULL + currentItemId);
            playlistExtractor.fetchPage();

            List<AudioItem> nextItemsIdsList = buildNextItemsList(playlistExtractor.getInitialPage());
            if (nextItemsIdsList.isEmpty()) return null;
            return nextItemsIdsList.subList(1, nextItemsIdsList.size());
        } catch (Exception e) {
            Log.e("Shannic autoplay", e.toString());
            return null;
        }
    }

    private List<AudioItem> buildNextItemsList(InfoItemsPage<StreamInfoItem> page) {
        if (page.hasNextPage()) autoPlayNextPage = page.getNextPage();
        else autoPlayNextPage = null;
        List<AudioItem> nextItems = new ArrayList<>();
        for (StreamInfoItem item : page.getItems()) {
            String id = extractYoutubeId(item.getUrl());
            List<Image> thumbnails = item.getThumbnails();

            nextItems.add(new AudioItem(
                    id,
                    item.getName(),
                    item.getUploaderName(),
                    item.getDuration(),
                    thumbnails.get(thumbnails.size()-1).getUrl(),
                    FAKE_SRC + id,
                    0
            ));
        }

        return nextItems;
    }

    public AudioItem getByQuery(final String artist, final String title)
            throws ExtractionException, IOException {
        SearchResponse response = searchMusic(artist + " " + title);
        List<SearchItem> items = response.items();

        if (!items.isEmpty()) {
            SearchItem item = items.get(0);
            String thumbnailPath = storeThumbnail(item.id(), item.thumbnail());
            return new AudioItem(
                    item.id(),
                    item.title(),
                    item.author().replace(" - Topic", ""),
                    item.duration(),
                    thumbnailPath,
                    FAKE_SRC + item.id(),
                    0
            );
        }
        return null;
    }
}
