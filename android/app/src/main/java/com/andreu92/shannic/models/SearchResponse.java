package com.andreu92.shannic.models;

import java.util.List;

public record SearchResponse(
        boolean hasNextPage,
        List<SearchItem> items
) {}
