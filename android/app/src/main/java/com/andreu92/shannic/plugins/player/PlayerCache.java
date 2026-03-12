package com.andreu92.shannic.plugins.player;

import android.content.Context;

import androidx.media3.common.util.UnstableApi;
import androidx.media3.database.StandaloneDatabaseProvider;
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor;
import androidx.media3.datasource.cache.SimpleCache;
import java.io.File;

@UnstableApi
public class PlayerCache {
    private static SimpleCache simpleCache;
    private static final long MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500 MB

    public static synchronized SimpleCache getInstance(Context context) {
        if (simpleCache == null) {
            Context appContext = context.getApplicationContext();

            File cacheDir = new File(appContext.getCacheDir(), "shannic_media_cache");
            StandaloneDatabaseProvider dbProvider = new StandaloneDatabaseProvider(appContext);

            simpleCache = new SimpleCache(
                    cacheDir,
                    new LeastRecentlyUsedCacheEvictor(MAX_CACHE_SIZE),
                    dbProvider
            );
        }
        return simpleCache;
    }
}
