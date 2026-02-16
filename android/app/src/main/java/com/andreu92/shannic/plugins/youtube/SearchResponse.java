package com.andreu92.shannic.plugins.youtube;

import java.util.List;

public record SearchResponse(
        List<SearchItem> items,
        String continuationToken
) {}
