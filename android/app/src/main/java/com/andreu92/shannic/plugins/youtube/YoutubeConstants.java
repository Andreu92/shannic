package com.andreu92.shannic.plugins.youtube;

public class YoutubeConstants {
    public static final String BASE_URL = "https://www.youtube.com";
    public static final String WATCH_ENDPOINT = "/watch?";
    public static final String VIDEO_QUERY_PARAM = "v=";
    public static final String EXPIRE_QUERY_PARAM = "expire";
    public static final String LIST_QUERY_PARAM = "list=";
    public static final String VIDEO_TO_RADIO_ID = "RD";
    public static final String LIST_QUERY_PARAM_FULL = LIST_QUERY_PARAM + VIDEO_TO_RADIO_ID;
    public static final String WATCH_FULL_URL = BASE_URL + WATCH_ENDPOINT + VIDEO_QUERY_PARAM;
    public static final String BROWSER_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64; rv:153.0) Gecko/20100101 Firefox/153.0";
}
