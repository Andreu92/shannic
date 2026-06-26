package com.andreu92.shannic.models;
public record SearchItem(
        String id,
        String title,
        String author,
        String thumbnail,
        long duration,
        String url
) {}