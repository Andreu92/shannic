package com.andreu92.shannic.innertube;

public record PlayerRequest(
        InnerTubeContext context,
        String videoId,
        PlaybackContext playbackContext
) {}
