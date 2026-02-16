package com.andreu92.shannic.plugins.youtube;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
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

@CapacitorPlugin(name = "YoutubeClientPlugin")
public class YoutubeClientPlugin extends Plugin {
    private YoutubeService youtubeService;
    private final JsonMapper mapper = JsonMapper.builder()
            .defaultPropertyInclusion(JsonInclude.Value.construct(JsonInclude.Include.NON_NULL, JsonInclude.Include.ALWAYS))
            .visibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY)
            .enable(SerializationFeature.INDENT_OUTPUT)
            .build();

    @Override
    public void load() {
        super.load();
        youtubeService = YoutubeService.getInstance();
    }

    @PluginMethod
    public void search(final PluginCall call) throws ExecutionException, InterruptedException, JsonProcessingException, JSONException {
        final String query = call.getString("query");
        final String nextToken = call.getString("next_token");

        SearchResponse searchResponse = youtubeService.search(query, nextToken);
        JSObject response = new JSObject();

        String jsonItems = mapper.writeValueAsString(searchResponse.items());

        response.put("items", new JSArray(jsonItems));
        response.put("next_token", searchResponse.continuationToken());

        call.resolve(response);
    }

    @PluginMethod
    public void get(final PluginCall call) throws ExecutionException, InterruptedException, IOException, JSONException {
        final String id = call.getString("id");

        AudioItem audioItem = youtubeService.get(id);
        String json = mapper.writeValueAsString(audioItem);

        call.resolve(new JSObject(json));
    }

    @PluginMethod
    public void getByQuery(final PluginCall call) throws ExecutionException, InterruptedException, IOException, JSONException {
        final String artist = call.getString("artist");
        final String title = call.getString("title");

        AudioItem audioItem = youtubeService.getByQuery(artist, title);
        String json = mapper.writeValueAsString(audioItem);

        call.resolve(new JSObject(json));
    }
}
