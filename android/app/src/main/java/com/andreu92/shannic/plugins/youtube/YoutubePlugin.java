package com.andreu92.shannic.plugins.youtube;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.schabi.newpipe.extractor.search.SearchExtractor;

import com.andreu92.shannic.models.*;

import java.io.IOException;

@CapacitorPlugin(name = "YoutubePlugin")
public class YoutubePlugin extends Plugin {
    private YoutubeService youtubeService;
    public static final JsonMapper mapper = JsonMapper.builder()
            .defaultPropertyInclusion(JsonInclude.Value.construct(JsonInclude.Include.NON_NULL, JsonInclude.Include.ALWAYS))
            .visibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY)
            .enable(SerializationFeature.INDENT_OUTPUT)
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .build();

    @Override
    public void load() {
        super.load();
        youtubeService = YoutubeService.getInstance();
    }

    @PluginMethod
    public void search(final PluginCall call) {
        final String NO_RESULTS = "NO_RESULTS";
        try {
            final String query = call.getString("query");
            final Boolean onlyMusic = call.getBoolean("only_music");

            SearchResponse searchResponse;
            if (onlyMusic != null && onlyMusic)
                searchResponse = youtubeService.searchMusic(query);
            else
                searchResponse = youtubeService.search(query);

            if (searchResponse.items().isEmpty())
                throw new SearchExtractor.NothingFoundException(NO_RESULTS);

            String json = mapper.writeValueAsString(searchResponse);
            call.resolve(new JSObject(json));
        } catch (SearchExtractor.NothingFoundException e) {
            call.reject(NO_RESULTS);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void fetchNextPage(final PluginCall call) {
        try {
            SearchResponse searchResponse = youtubeService.fetchNextPage();
            String json = mapper.writeValueAsString(searchResponse);
            call.resolve(new JSObject(json));
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void get(final PluginCall call) {
        try {
            final String url = call.getString("url");

            AudioItem audioItem = youtubeService.get(url);
            String json = mapper.writeValueAsString(audioItem);

            call.resolve(new JSObject(json));
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getByQuery(final PluginCall call) {
        try {
            final String artist = call.getString("artist");
            final String title = call.getString("title");

            AudioItem audioItem = youtubeService.getByQuery(artist, title);
            String json = mapper.writeValueAsString(audioItem);

            call.resolve(new JSObject(json));
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
