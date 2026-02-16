package com.andreu92.shannic.plugins.youtube;

public record AudioItem(
        String id,
        String title,
        String author,
        long duration,
        String duration_text,
        ThumbnailInfo thumbnail,
        String url,
        long expires_at
) {}
