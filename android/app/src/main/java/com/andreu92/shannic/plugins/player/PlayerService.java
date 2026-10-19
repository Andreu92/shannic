package com.andreu92.shannic.plugins.player;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DataSourceException;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.ResolvingDataSource;
import androidx.media3.datasource.cache.CacheDataSink;
import androidx.media3.datasource.cache.CacheDataSource;
import androidx.media3.datasource.cache.SimpleCache;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.session.SessionCommand;
import androidx.media3.session.SessionCommands;

import com.andreu92.shannic.plugins.Constants;
import com.andreu92.shannic.plugins.youtube.YoutubeConstants;

import com.andreu92.shannic.R;
import com.andreu92.shannic.plugins.youtube.YoutubeService;
import com.andreu92.shannic.models.AudioItem;

@UnstableApi
public class PlayerService extends MediaSessionService {
    private ExoPlayer player;
    private MediaSession mediaSession;
    private YoutubeService youtubeService;
    private final ResolvingDataSource.Resolver urlResolver = new ResolvingDataSource.Resolver() {
        @NonNull
        @Override
        public DataSpec resolveDataSpec(DataSpec dataSpec) throws DataSourceException {
            boolean refresh = false;
            Uri audioSrc = dataSpec.uri;
            String srcString = audioSrc.toString();

            // Empty or fake url means refresh
            if (srcString.isBlank() || srcString.startsWith(Constants.FAKE_SRC)) refresh = true;
            else {
                String expires_at_str = audioSrc
                        .getQueryParameter(YoutubeConstants.EXPIRE_QUERY_PARAM);
                if (expires_at_str == null) refresh = true;
                else {
                    long expires_at = Long.parseLong(expires_at_str) * 1000;
                    if ((expires_at - 10000) < System.currentTimeMillis()) refresh = true;
                }

            }

            if (refresh) {
                String newSrc = refreshSrc(dataSpec.key);
                if (newSrc == null || newSrc.isBlank())
                    throw new DataSourceException(PlaybackException.ERROR_CODE_IO_NO_PERMISSION);

                return dataSpec.buildUpon().setUri(Uri.parse(newSrc)).build();
            }

            return dataSpec;
        }
    };

    @Nullable
    @Override
    public MediaSession onGetSession(@NonNull MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        youtubeService = YoutubeService.getInstance();
        createNotificationChannel();
        createPlayer();
        createMediaSession();

        DefaultMediaNotificationProvider notificationProvider =
                new DefaultMediaNotificationProvider.Builder(this)
                        .setChannelId(String.valueOf(R.string.notification_channel_id))
                        .setChannelName(R.string.app_name)
                        .build();

        notificationProvider.setSmallIcon(R.drawable.icon);
        setMediaNotificationProvider(notificationProvider);
    }

    @Override
    public void onDestroy() {
        if (player != null) {
            player.release();
            player = null;
        }
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        pauseAllPlayersAndStopSelf();
    }

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
                getString(R.string.notification_channel_id),
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
        );
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        notificationManager.createNotificationChannel(channel);
    }

    private void createPlayer() {
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent(YoutubeConstants.BROWSER_USER_AGENT)
                .setAllowCrossProtocolRedirects(true);

        DefaultDataSource.Factory baseDataSourceFactory =
                new DefaultDataSource.Factory(this, httpDataSourceFactory);

        ResolvingDataSource.Factory resolvingDataSourceFactory =
                new ResolvingDataSource.Factory(baseDataSourceFactory, urlResolver);

        SimpleCache simpleCache = PlayerCache.getInstance(this);

        DataSource.Factory cacheDataSourceFactory = new CacheDataSource.Factory()
                .setCache(simpleCache)
                .setUpstreamDataSourceFactory(resolvingDataSourceFactory)
                .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
                .setCacheWriteDataSinkFactory(new CacheDataSink.Factory().setCache(simpleCache));

        DefaultMediaSourceFactory mediaSourceFactory =
                new DefaultMediaSourceFactory(this)
                        .setDataSourceFactory(cacheDataSourceFactory);

        DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(this)
                .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON)
                .setEnableDecoderFallback(true);

        player = new ExoPlayer.Builder(this, renderersFactory)
                .setAudioAttributes(audioAttributes, true)
                .setMediaSourceFactory(mediaSourceFactory)
                .build();
    }

    private void createMediaSession() {
        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (intent != null)
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent sessionActivityPendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(sessionActivityPendingIntent)
                .setCallback(new MediaSession.Callback() {
                    @NonNull
                    @Override
                    public MediaSession.ConnectionResult onConnect(
                            @NonNull MediaSession session,
                            @NonNull MediaSession.ControllerInfo controller) {

                        SessionCommands sessionCommands = MediaSession
                                .ConnectionResult
                                .DEFAULT_SESSION_COMMANDS
                                .buildUpon()
                                .build();

                        return new MediaSession.ConnectionResult
                                .AcceptedResultBuilder(session, controller)
                                .setAvailableSessionCommands(sessionCommands)
                                .build();
                    }
                })
                .build();
    }

    private String refreshSrc(String id) {
        try {
            AudioItem item = youtubeService.get(id);

            if (item == null || item.src() == null || item.src().isBlank()) return null;

            Bundle extras = new Bundle();
            extras.putString("id", item.id());
            extras.putString("src", item.src());
            extras.putLong("expires_at", item.expiresAt());

            mediaSession.broadcastCustomCommand(
                    new SessionCommand(PlayerActions.ACTION_SRC_REFRESH, Bundle.EMPTY),
                    extras
            );

            return item.src();
        } catch (Exception e) {
            Log.e("PlayerService", "Error refreshing SRC: " + e.getMessage());
            return null;
        }
    }

}
