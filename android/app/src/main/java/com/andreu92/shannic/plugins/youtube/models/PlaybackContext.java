package com.andreu92.shannic.plugins.youtube.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PlaybackContext {

    @JsonProperty("contentPlaybackContext")
    private ContentPlaybackContext contentPlaybackContext;

    public PlaybackContext(ContentPlaybackContext contentPlaybackContext) {
        this.contentPlaybackContext = contentPlaybackContext;
    }

    public ContentPlaybackContext getContentPlaybackContext() {
        return contentPlaybackContext;
    }

    public void setContentPlaybackContext(ContentPlaybackContext contentPlaybackContext) {
        this.contentPlaybackContext = contentPlaybackContext;
    }
}
