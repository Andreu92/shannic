package com.andreu92.shannic.plugins.youtube;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.concurrent.ExecutionException;

import org.json.JSONException;

import com.andreu92.shannic.models.*;

@CapacitorPlugin(name = "YoutubeClientPlugin")
public class YoutubeClientPlugin extends Plugin {
    private YoutubeService youtubeService;
    private final JsonMapper mapper = JsonMapper.builder()
            .defaultPropertyInclusion(JsonInclude.Value.construct(JsonInclude.Include.NON_NULL, JsonInclude.Include.ALWAYS))
            .visibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY)
            .enable(SerializationFeature.INDENT_OUTPUT)
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .build();

    @Override
    public void load() {
        super.load();
        youtubeService = new YoutubeService(getContext());
    }

    @PluginMethod
    public void search(final PluginCall call) throws JsonProcessingException, JSONException {
        final String query = call.getString("query");
        final Boolean onlyMusic = call.getBoolean("only_music");

        SearchResponse searchResponse;
        if (onlyMusic != null && onlyMusic)
            searchResponse = youtubeService.searchMusic(query);
        else
            searchResponse = youtubeService.search(query);

        String json = mapper.writeValueAsString(searchResponse);
        call.resolve(new JSObject(json));
    }

    @PluginMethod
    public void fetchNextPage(final PluginCall call) throws JsonProcessingException, JSONException {
        SearchResponse searchResponse = youtubeService.fetchNextPage();
        String json = mapper.writeValueAsString(searchResponse);
        call.resolve(new JSObject(json));
    }

    @PluginMethod
    public void get(final PluginCall call) throws IOException, JSONException {
        final String url = call.getString("url");

        AudioItem audioItem = youtubeService.get(url);
        String json = mapper.writeValueAsString(audioItem);

        call.resolve(new JSObject(json));
    }

    @PluginMethod
    public void getByQuery(final PluginCall call) throws IOException, JSONException {
        final String artist = call.getString("artist");
        final String title = call.getString("title");

        AudioItem audioItem = youtubeService.getByQuery(artist, title);
        String json = mapper.writeValueAsString(audioItem);

        call.resolve(new JSObject(json));
    }
}
