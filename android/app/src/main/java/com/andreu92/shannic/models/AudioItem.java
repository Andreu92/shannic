package com.andreu92.shannic.models;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

public record AudioItem(
        @JsonProperty("id") String id,
        @JsonProperty("title") String title,
        @JsonProperty("author") String author,
        @JsonProperty("duration") long duration,
        @JsonProperty("thumbnail") String thumbnail,
        @JsonProperty("src") String src,
        @JsonProperty("expires_at") long expiresAt
) implements Serializable {}
