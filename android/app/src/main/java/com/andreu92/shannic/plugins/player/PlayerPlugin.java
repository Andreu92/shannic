package com.andreu92.shannic.plugins.player;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.concurrent.ExecutionException;

@CapacitorPlugin(name = "PlayerPlugin")
public class PlayerPlugin extends Plugin {
    private static final String ACTION_PLAY = "ACTION_PLAY";
    private static final String ACTION_PAUSE = "ACTION_PAUSE";
    private static final String ACTION_RESUME = "ACTION_RESUME";
    private static final String ACTION_TOGGLE_REPEAT = "ACTION_TOGGLE_REPEAT";
    private static final String ACTION_TOGGLE_FAVORITE = "ACTION_TOGGLE_FAVORITE";
    private static final String ACTION_STOP = "ACTION_STOP";
    private static final String ACTION_SEEK_TO = "ACTION_SEEK_TO";

    @PluginMethod()
    public void play(PluginCall call) throws JsonProcessingException, ExecutionException, InterruptedException {
        String id = call.getString("id");
        String title = call.getString("title");
        String artist = call.getString("artist");
        String author = call.getString("author");
        String url = call.getString("url");
        String thumbnail = call.getString("thumbnail");
        Long duration = call.getDouble("duration", 0D).longValue();
        Boolean isFavorite = call.getBoolean("favorite", false);

        Intent intent = new Intent(getContext(), PlayerService.class);
        intent.setAction(ACTION_PLAY);
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("author", author);
        intent.putExtra("url", url);
        intent.putExtra("duration", duration);
        intent.putExtra("favorite", isFavorite);
        intent.putExtra("thumbnail", thumbnail);

        getContext().startForegroundService(intent);

        call.resolve();
    }

    @PluginMethod()
    public void resume(PluginCall call) {
        Intent intent = new Intent(getContext(), PlayerService.class);
        intent.setAction(ACTION_RESUME);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    @PluginMethod()
    public void pause(PluginCall call) {
        Intent intent = new Intent(getContext(), PlayerService.class);
        intent.setAction(ACTION_PAUSE);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    @PluginMethod()
    public void seekTo(PluginCall call) {
        Long position = call.getDouble("position", 0D).longValue();
        Intent intent = new Intent(getContext(), PlayerService.class);
        intent.setAction(ACTION_SEEK_TO);
        intent.putExtra("position", position);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    @PluginMethod()
    public void toggleRepeat(PluginCall call) {
        Boolean repeating = call.getBoolean("repeating", false);
        Intent intent = new Intent(getContext(), PlayerService.class);
        intent.setAction(ACTION_TOGGLE_REPEAT);
        intent.putExtra("repeating", repeating);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    @PluginMethod()
    public void toggleFavorite(PluginCall call) {
        Boolean isFavorite = call.getBoolean("favorite", false);
        Intent intent = new Intent(getContext(), PlayerService.class);
        intent.setAction(ACTION_TOGGLE_FAVORITE);
        intent.putExtra("favorite", isFavorite);
        getContext().startForegroundService(intent);
        call.resolve();
    }

    @PluginMethod()
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), PlayerService.class);
        getContext().stopService(intent);
        call.resolve();
    }

    public void onPlay() {
        notifyListeners("onPlay", null);
    }

    public void onPause() {
        notifyListeners("onPause", null);
    }

    public void onStop() {
        notifyListeners("onStop", null);
    }

    public void onBuffering() {
        notifyListeners("onBuffering", null);
    }

    public void onCurrentPositionChange(long position) {
        JSObject data = new JSObject();
        data.put("position", position);
        notifyListeners("onCurrentPositionChange", data);
    }

    public void onSkipToNext() {
        notifyListeners("onSkipNext", null);
    }

    public void onSkipToPrevious() {
        notifyListeners("onSkipPrevious", null);
    }

    public void onToggleRepeat(boolean repeating) {
        JSObject data = new JSObject();
        data.put("repeating", repeating);
        notifyListeners("onToggleRepeat", data);
    }

    public void onToggleFavorite(boolean isFavorite) {
        JSObject data = new JSObject();
        data.put("favorite", isFavorite);
        notifyListeners("onToggleFavorite", data);
    }

    public void onSourceError() {
        notifyListeners("onSourceError", null);
    }
}