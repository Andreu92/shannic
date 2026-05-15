package com.andreu92.shannic.models;

public record AudioItem(
        String id,
        String title,
        String author,
        long duration,
        ThumbnailInfo thumbnail,
        String streamUrl,
        String youtubeUrl,
        long expiresAt
) {}
