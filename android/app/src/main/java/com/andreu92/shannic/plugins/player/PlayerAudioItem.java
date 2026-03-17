package com.andreu92.shannic.plugins.player;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

public record PlayerAudioItem(
        @JsonProperty("id") String id,
        @JsonProperty("title") String title,
        @JsonProperty("author") String author,
        @JsonProperty("thumbnail") String thumbnail,
        @JsonProperty("url") String url,
        @JsonProperty("favorite") Boolean favorite
) implements Serializable {}
