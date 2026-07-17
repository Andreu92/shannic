package com.andreu92.shannic.plugins.youtube.utils;

import org.schabi.newpipe.extractor.stream.StreamInfoItem;

public class AutoPlayStrategy {
    private static final double MAX_LOG_VIEWS = Math.log10(1_000_000_000.0);

    public double calculateScore(StreamInfoItem candidate) {
        double songFormatFactor = 0.0;
        double verificationFactor = 0.0;
        double popularityFactor = 0.0;

        // 1. Content length: max 10 min
        long duration = candidate.getDuration();
        if (duration > 0 && duration <= 600) songFormatFactor = 0.40;

        // 2. Views
        if (candidate.getViewCount() > 1) {
            final double MAX_SCORE = 0.40;
            double currentLog = Math.log10(candidate.getViewCount());
            double calculatedPopularity = (currentLog / MAX_LOG_VIEWS) * MAX_SCORE;
            popularityFactor = Math.clamp(calculatedPopularity, 0.0, MAX_SCORE);
        }

        // 3. Verified artist
        if (candidate.isUploaderVerified()) verificationFactor = 0.20;

        return songFormatFactor + verificationFactor + popularityFactor;
    }
}
