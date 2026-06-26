package com.andreu92.shannic.models;

public record AudioItem(
        String id,
        String title,
        String author,
        long duration,
        String thumbnail,
        String url,
        String src,
        long expiresAt
) {}
