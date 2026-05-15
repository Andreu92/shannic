package com.andreu92.shannic.plugins.youtube.utils;

import java.text.Normalizer;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.andreu92.shannic.models.SearchItem;

public class SongMatcher {

    public static SearchItem getBestYoutubeMatch(String spotifyArtist, String spotifyTitle, List<SearchItem> youtubeResults) {
        Set<String> spotifyTitleTokens = normalizeText(spotifyTitle);
        Set<String> spotifyArtistTokens = normalizeText(spotifyArtist);

        Set<String> fullQueryTokens = new HashSet<>(spotifyTitleTokens);
        fullQueryTokens.addAll(spotifyArtistTokens);

        SearchItem bestMatch = null;
        double bestScore = -1.0;

        for (SearchItem yt : youtubeResults) {
            Set<String> ytTitleTokens = normalizeText(yt.title());
            Set<String> ytAuthorTokens = normalizeText(yt.author());

            double titleScore = calculateIntersectionScore(fullQueryTokens, ytTitleTokens);
            double authorScore = calculateIntersectionScore(spotifyArtistTokens, ytAuthorTokens);
            double finalScore = (titleScore * 0.6) + (authorScore * 0.4);

            if (ytTitleTokens.contains("remix") && !spotifyTitleTokens.contains("remix")) {
                finalScore *= 0.8;
            }

            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMatch = yt;
            }
        }
        return bestMatch;
    }

    private static Set<String> normalizeText(String text) {
        if (text == null || text.isEmpty())
            return Collections.emptySet();
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("[^\\p{ASCII}]", "");
        Set<String> tokens = new HashSet<>();
        Pattern pattern = Pattern.compile("\\w+");
        Matcher matcher = pattern.matcher(normalized.toLowerCase());
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        return tokens;
    }

    private static double calculateIntersectionScore(Set<String> queryTokens, Set<String> targetTokens) {
        if (queryTokens.isEmpty())
            return 0.0;
        Set<String> intersection = new HashSet<>(queryTokens);
        intersection.retainAll(targetTokens);
        return (double) intersection.size() / queryTokens.size();
    }
}
