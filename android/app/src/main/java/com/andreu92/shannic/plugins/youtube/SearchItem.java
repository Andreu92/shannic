package com.andreu92.shannic.plugins.youtube;

public record SearchItem(
        String id,
        String title,
        String author,
        String thumbnail,
        String duration
) {}