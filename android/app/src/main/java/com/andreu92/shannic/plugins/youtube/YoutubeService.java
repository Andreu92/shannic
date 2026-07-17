package com.andreu92.shannic.plugins.youtube;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static java.util.Collections.singletonList;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.schabi.newpipe.extractor.Image;
import org.schabi.newpipe.extractor.InfoItem;
import org.schabi.newpipe.extractor.InfoItemExtractor;
import org.schabi.newpipe.extractor.InfoItemsCollector;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.Page;
import org.schabi.newpipe.extractor.StreamingService;
import org.schabi.newpipe.extractor.exceptions.ExtractionException;
import org.schabi.newpipe.extractor.ListExtractor.InfoItemsPage;
import org.schabi.newpipe.extractor.search.SearchExtractor;
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamExtractor;
import org.schabi.newpipe.extractor.stream.StreamInfoItem;

import static org.schabi.newpipe.extractor.ServiceList.YouTube;

import com.andreu92.shannic.models.*;
import com.andreu92.shannic.plugins.youtube.utils.*;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class YoutubeService {
    private static YoutubeService youtubeService = null;
    private StreamingService youtube;
    private SearchExtractor searchExtractor;
    private Page nextPage = null;
    private StreamExtractor streamExtractor;
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

    public void setAppFolder(File appFolder) {
        this.appFolder = appFolder;
    }

    public SearchResponse search(String query) throws ExtractionException, IOException {
        return search(query, singletonList(YoutubeSearchQueryHandlerFactory.VIDEOS));
    }

    public SearchResponse searchMusic(String query) throws ExtractionException, IOException {
        return search(query, singletonList(YoutubeSearchQueryHandlerFactory.MUSIC_SONGS));
    }

    public SearchResponse search(String query, List<String> filters) throws ExtractionException, IOException {
        searchExtractor = youtube.getSearchExtractor(query, filters, null);
        searchExtractor.fetchPage();
        return parseSearchResults(searchExtractor.getInitialPage());
    }

    public SearchResponse fetchNextPage() throws ExtractionException, IOException {
        if (searchExtractor == null) return null;
        return parseSearchResults(searchExtractor.getPage(nextPage));
    }


    private SearchResponse parseSearchResults(InfoItemsPage<InfoItem> page) {
        List<SearchItem> results = new ArrayList<>();
        List<InfoItem> searchResults = page.getItems();
        for (InfoItem infoItem : searchResults) {
            StreamInfoItem searchResult = (StreamInfoItem) infoItem;
            String url = searchResult.getUrl();
            results.add(new SearchItem(
                    url.split("v=")[1],
                    searchResult.getName(),
                    searchResult.getUploaderName(),
                    searchResult.getThumbnails()
                            .get(searchResult.getThumbnails().size() - 1)
                            .getUrl(),
                    searchResult.getDuration(),
                    url
            ));
        }

        if (page.hasNextPage()) {
            nextPage = page.getNextPage();
        }

        return new SearchResponse(page.hasNextPage(), results);
    }

    public AudioItem get(String url) {
        try {
            streamExtractor = youtube.getStreamExtractor(url);
            streamExtractor.fetchPage();

            String uploader = streamExtractor.getUploaderName();
            if (uploader != null) uploader = uploader.replace(" - Topic", "");

            List<AudioStream> audioStreams = streamExtractor.getAudioStreams();
            AudioStream bestAudioStream = audioStreams.stream()
                    .max(Comparator.comparingInt(AudioStream::getBitrate))
                    .orElse(null);

            List<Image> thumbnails = streamExtractor.getThumbnails();
            Image thumbnail = thumbnails.get(thumbnails.size() - 1);
            String thumbnailPath = storeThumbnail(url.split("v=")[1], thumbnail.getUrl());

            String streamUrl = bestAudioStream.getContent();
            long expiresAt = Long.parseLong(streamUrl.split("expire=")[1].split("&")[0]);

            return new AudioItem(
                    streamExtractor.getId(),
                    streamExtractor.getName(),
                    uploader,
                    streamExtractor.getLength(),
                    thumbnailPath,
                    streamExtractor.getUrl(),
                    streamUrl,
                    expiresAt
            );
        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
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
        if (streamExtractor == null) return null;

        AutoPlayStrategy strategy = new AutoPlayStrategy();
        try {
            String current = streamExtractor.getUrl();
            InfoItemsCollector<? extends InfoItem, ? extends InfoItemExtractor> relatedItems = streamExtractor.getRelatedItems();
            if (relatedItems == null) return null;

            List<StreamInfoItem> candidates = relatedItems.getItems().stream()
                    .filter(StreamInfoItem.class::isInstance)
                    .map(StreamInfoItem.class::cast)
                    .toList();

            List<StreamInfoItem> nextItems = candidates.stream()
                    .filter(candidate -> !candidate.getUrl().equals(current))
                    .sorted((c1, c2) -> Double.compare(
                            strategy.calculateScore(c2),
                            strategy.calculateScore(c1)
                    ))
                    .limit(5)
                    .toList();

            List<AudioItem> items = new ArrayList<>();
            for (StreamInfoItem item : nextItems) items.add(get(item.getUrl()));

            return items;
        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    public AudioItem getByQuery(final String artist, final String title) throws ExtractionException, IOException {
        SearchResponse response = searchMusic(artist + " " + title);
        SearchItem bestMatch = SongMatcher.getBestYoutubeMatch(artist, title, response.items());
        return get(bestMatch.url());
    }
}
