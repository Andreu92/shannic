package com.andreu92.shannic.plugins.youtube.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PlayerRequest {

    @JsonProperty("context")
    private Context context;

    @JsonProperty("videoId")
    private String videoId;

    @JsonProperty("playbackContext")
    private PlaybackContext playbackContext;

    @JsonProperty("contentCheckOk")
    private boolean contentCheckOk = true;

    @JsonProperty("racyCheckOk")
    private boolean racyCheckOk = true;

    public PlayerRequest(Context context, String videoId, PlaybackContext playbackContext) {
        this.context = context;
        this.videoId = videoId;
        this.playbackContext = playbackContext;
    }

    public Context getContext() {
        return context;
    }

    public void setContext(Context context) {
        this.context = context;
    }

    public String getVideoId() {
        return videoId;
    }

    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }

    public PlaybackContext getPlaybackContext() {
        return playbackContext;
    }

    public void setPlaybackContext(PlaybackContext playbackContext) {
        this.playbackContext = playbackContext;
    }

    public boolean isContentCheckOk() {
        return contentCheckOk;
    }

    public void setContentCheckOk(boolean contentCheckOk) {
        this.contentCheckOk = contentCheckOk;
    }

    public boolean isRacyCheckOk() {
        return racyCheckOk;
    }

    public void setRacyCheckOk(boolean racyCheckOk) {
        this.racyCheckOk = racyCheckOk;
    }
}
