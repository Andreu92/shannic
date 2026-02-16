package com.andreu92.shannic.plugins.player;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

public record PlayerAudioItem(
        @JsonProperty("id") String id,
        @JsonProperty("title") String title,
        @JsonProperty("author") String author,
        @JsonProperty("duration") Long duration,
        @JsonProperty("thumbnail") String thumbnail,
        @JsonProperty("url") String url,
        @JsonProperty("expires_at") Long expires_at,
        @JsonProperty("favorite") Boolean favorite
) implements Serializable {}
