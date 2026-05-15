package com.andreu92.shannic.plugins.youtube;

import java.io.IOException;

import static java.util.Collections.singletonList;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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

public class YoutubeService {
    private static YoutubeService instance;
    private static StreamingService youtube;

    private SearchExtractor searchExtractor;
    private Page nextPage = null;

    private StreamExtractor streamExtractor;

    public static YoutubeService init() {
        NewPipe.init(ShannicDownloader.getInstance());

        try {
            youtube = NewPipe.getService(YouTube.getServiceId());
            instance = new YoutubeService();
        } catch (ExtractionException ignored) {}

        return instance;
    }

    public static YoutubeService getInstance() {
        if (instance == null) instance = init();
        return instance;
    }

    public SearchResponse search(String query) {
        return search(query, singletonList(YoutubeSearchQueryHandlerFactory.VIDEOS));
    }

    public SearchResponse searchMusic(String query) {
        return search(query, singletonList(YoutubeSearchQueryHandlerFactory.MUSIC_SONGS));
    }

    public SearchResponse search(String query, List<String> filters) {
        try {
            searchExtractor = youtube.getSearchExtractor(query, filters, null);
            searchExtractor.fetchPage();
            return parseSearchResults(searchExtractor.getInitialPage());
        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
        }

        return null;
    }

    public SearchResponse searchContinuation() {
        if (searchExtractor == null) return null;

        try {
            return parseSearchResults(searchExtractor.getPage(nextPage));
        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
        }

        return null;
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
            ThumbnailInfo thumbnailInfo = new ThumbnailInfo(
                    thumbnail.getUrl(), ImageUtils.getBase64(thumbnail.getUrl())
            );

            String streamUrl = bestAudioStream.getContent();
            long expiresAt = Long.parseLong(streamUrl.split("expire=")[1].split("&")[0]);

            return new AudioItem(
                    streamExtractor.getId(),
                    streamExtractor.getName(),
                    uploader,
                    streamExtractor.getLength(),
                    thumbnailInfo,
                    streamUrl,
                    streamExtractor.getUrl(),
                    expiresAt
            );
        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
        }

        return null;
    }

    public AudioItem getNext() {
        if (streamExtractor == null) return null;

        try {
            InfoItemsCollector<? extends InfoItem, ? extends InfoItemExtractor> relatedItems = streamExtractor.getRelatedItems();
            List<? extends InfoItem> items = relatedItems.getItems();

            if (items.isEmpty()) return null;

            for (InfoItem nextItem : items) {
                if (nextItem instanceof StreamInfoItem streamInfoItem) {
                    // Greedy title matching to avoid repeated items
                    String oldTitle = streamExtractor.getName().toLowerCase().replaceAll("[^a-z0-9\\s]", "");
                    String newTitle = streamInfoItem.getName().toLowerCase().replaceAll("[^a-z0-9\\s]", "");

                    if (streamInfoItem.getUrl().equals(streamExtractor.getUrl())) continue;

                    String shorter = oldTitle.length() < newTitle.length() ? oldTitle : newTitle;
                    String longer = oldTitle.length() >= newTitle.length() ? oldTitle : newTitle;

                    String[] wordsToCheck = shorter.split("\\s+");
                    int matches = 0;
                    int significantWords = 0;

                    for (String word : wordsToCheck) {
                        if (word.length() < 3) continue;
                        significantWords++;
                        if (longer.contains(word)) {
                            matches++;
                        }
                    }

                    if (significantWords > 0 && (double) matches / significantWords > 0.8) {
                        continue;
                    }

                    return get(streamInfoItem.getUrl());
                }
            }

        } catch (ExtractionException | IOException e) {
            e.printStackTrace();
        }

        return null;
    }

    public AudioItem getByQuery(final String artist, final String title) {
        try {
            SearchResponse response = searchMusic(artist + " " + title);
            SearchItem bestMatch = SongMatcher.getBestYoutubeMatch(artist, title, response.items());
            return get(bestMatch.youtubeUrl());
        } catch (Exception e) {
            e.printStackTrace();
        }

        return null;
    }
}
