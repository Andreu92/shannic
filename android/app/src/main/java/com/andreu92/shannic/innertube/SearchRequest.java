package com.andreu92.shannic.innertube;

public record SearchRequest(
        InnerTubeContext context,
        String query,
        String params,
        String continuation
) {}
