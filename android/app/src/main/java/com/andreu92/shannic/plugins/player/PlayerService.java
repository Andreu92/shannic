package com.andreu92.shannic.plugins.player;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.support.v4.media.session.PlaybackStateCompat.CustomAction;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;

import com.andreu92.shannic.R;
import com.bumptech.glide.Glide;
import com.bumptech.glide.request.target.CustomTarget;
import com.bumptech.glide.request.transition.Transition;
import com.getcapacitor.Bridge;
import com.getcapacitor.PluginHandle;

public class PlayerService extends Service {
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
    private static final int NOTIFICATION_ID = 1;
    private static final String LOG_TAG = "ShannicAudioPlayerService";
    private static final String ACTION_PLAY = "ACTION_PLAY";
    private static final String ACTION_PAUSE = "ACTION_PAUSE";
    private static final String ACTION_RESUME = "ACTION_RESUME";
    private static final String ACTION_SEEK_TO = "ACTION_SEEK_TO";
    private static final String ACTION_NOTIFICATION_DISMISSED = "ACTION_NOTIFICATION_DISMISSED";
    private static final String ACTION_TOGGLE_FAVORITE = "ACTION_TOGGLE_FAVORITE";
    private static final String ACTION_TOGGLE_REPEAT = "ACTION_TOGGLE_REPEAT";

    private Notification notification;
    private NotificationManager notificationManager;
    private static Bridge bridge = null;
    private PlayerPlugin plugin;
    private ExoPlayer player;
    private MediaSessionCompat mediaSession;
    private PendingIntent deletePendingIntent;
    private boolean isFavorite = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            if (player != null && player.isPlaying()) {
                plugin.onCurrentPositionChange(player.getCurrentPosition());
            }
            handler.postDelayed(this, 1000);
        }
    };

    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                if (player != null && player.isPlaying()) {
                    player.pause();
                    updatePlaybackState(PlaybackStateCompat.STATE_PAUSED);
                    plugin.onPause();
                }
            }
        }
    };

    public static void setBridge(Bridge b) {
        bridge = b;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // Dismiss notification intent (when the user swipes the notification to the right)
        Intent intent = new Intent(this, PlayerService.class);
        intent.setAction(ACTION_NOTIFICATION_DISMISSED);
        deletePendingIntent = PendingIntent.getService(this, 0, intent, PendingIntent.FLAG_IMMUTABLE);

        // Pause audio when remove headphones
        IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        registerReceiver(noisyReceiver, filter);

        createNotificationChannel();
        createPlayer();
        createMediaSession();
    }

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
                getString(R.string.notification_channel_id),
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
        );
        notificationManager = getSystemService(NotificationManager.class);
        notificationManager.createNotificationChannel(channel);
    }

    @OptIn(markerClass = UnstableApi.class)
    private void createPlayer() {
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent(USER_AGENT)
                .setConnectTimeoutMs(DefaultHttpDataSource.DEFAULT_CONNECT_TIMEOUT_MILLIS)
                .setReadTimeoutMs(DefaultHttpDataSource.DEFAULT_READ_TIMEOUT_MILLIS)
                .setAllowCrossProtocolRedirects(true);

        DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(this)
                .setDataSourceFactory(httpDataSourceFactory);

        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, true)
                .setMediaSourceFactory(mediaSourceFactory)
                .build();

        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (isPlaying) {
                    updatePlaybackState(PlaybackStateCompat.STATE_PLAYING);
                    plugin.onPlay();
                    handler.post(progressRunnable);
                } else {
                    updatePlaybackState(PlaybackStateCompat.STATE_PAUSED);
                    plugin.onPause();
                    handler.removeCallbacks(progressRunnable);
                }
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_BUFFERING) {
                    updatePlaybackState(PlaybackStateCompat.STATE_BUFFERING);
                    plugin.onBuffering();
                }
                if (playbackState == Player.STATE_READY) {
                    if (player.isPlaying()) {
                        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING);
                        plugin.onPlay();
                    } else {
                        updatePlaybackState(PlaybackStateCompat.STATE_PAUSED);
                        plugin.onPause();
                    }
                }
                if (playbackState == Player.STATE_ENDED) {
                    boolean repeating = player.getRepeatMode() != Player.REPEAT_MODE_OFF;
                    if (repeating) return;

                    player.pause();
                    player.seekToDefaultPosition();
                    updatePlaybackState(PlaybackStateCompat.STATE_PAUSED);
                    plugin.onPause();
                    plugin.onCurrentPositionChange(0);
                }
            }

            @Override
            public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
                if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) {
                    updatePlaybackState(PlaybackStateCompat.STATE_PLAYING);
                    plugin.onPlay();
                }
            }

            @Override
            public void onPlayerError(@NonNull PlaybackException error) {
                if (error.errorCode == PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS) {
                    Throwable cause = error.getCause();
                    if (cause instanceof HttpDataSource.InvalidResponseCodeException httpError) {
                        int responseCode = httpError.responseCode;
                        if (responseCode == 403) {
                            plugin.onSourceError();
                        }
                    }
                }

                Player.Listener.super.onPlayerError(error);
            }
        });
    }

    private void createMediaSession() {
        mediaSession = new MediaSessionCompat(this, LOG_TAG);

        Intent mediaButtonIntent = new Intent(Intent.ACTION_MEDIA_BUTTON, null, this, MediaButtonReceiver.class);
        PendingIntent mediaButtonPendingIntent = PendingIntent.getBroadcast(this, 0, mediaButtonIntent, PendingIntent.FLAG_MUTABLE);
        mediaSession.setMediaButtonReceiver(mediaButtonPendingIntent);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                player.play();
                updatePlaybackState(PlaybackStateCompat.STATE_PLAYING);
                plugin.onPlay();
            }

            @Override
            public void onPause() {
                player.pause();
                updatePlaybackState(PlaybackStateCompat.STATE_PAUSED);
                plugin.onPause();
            }

            @Override
            public void onStop() {
                stop();
            }

            @Override
            public void onSeekTo(long pos) {
                player.seekTo(pos);
                updatePlaybackState(player.isPlaying() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED, pos);
                plugin.onCurrentPositionChange(pos);
            }

            @Override
            public void onSkipToNext() {
                plugin.onSkipToNext();
            }

            @Override
            public void onSkipToPrevious() {
                if (player.getCurrentPosition() > 1000) {
                    player.seekTo(0);
                    plugin.onCurrentPositionChange(0);
                    player.play();
                    updatePlaybackState(PlaybackStateCompat.STATE_PLAYING);
                    plugin.onPlay();
                } else {
                    plugin.onSkipToPrevious();
                }
            }

            @Override
            public void onCustomAction(@NonNull String action, Bundle extras) {
                switch (action) {
                    case ACTION_TOGGLE_FAVORITE:
                        isFavorite = !isFavorite;
                        updatePlaybackState(player.isPlaying()
                                ? PlaybackStateCompat.STATE_PLAYING
                                : PlaybackStateCompat.STATE_PAUSED);
                        plugin.onToggleFavorite(isFavorite);
                        break;
                    case ACTION_TOGGLE_REPEAT:
                        onToggleRepeat();
                        plugin.onToggleRepeat(player.getRepeatMode() == Player.REPEAT_MODE_ONE);
                }
            }
        });

        String packageName = this.getPackageName();
        Intent launchIntent = this.getPackageManager().getLaunchIntentForPackage(packageName);

        if (launchIntent != null) {
            PendingIntent pi = PendingIntent.getActivity(
                    this,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            mediaSession.setSessionActivity(pi);
        }

        mediaSession.setActive(true);
    }

    public void stop() {
        if (player != null) player.stop();
        plugin.onStop();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        unregisterReceiver(noisyReceiver);
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
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);

        PluginHandle handle = bridge.getPlugin("PlayerPlugin");
        plugin = (PlayerPlugin) handle.getInstance();

        MediaButtonReceiver.handleIntent(mediaSession, intent);

        if (intent.getAction() != null) {
            switch (intent.getAction()) {
                case ACTION_PLAY:
                    String id = intent.getStringExtra("id");
                    String url = intent.getStringExtra("url");
                    String title = intent.getStringExtra("title");
                    String artist = intent.getStringExtra("artist");
                    isFavorite = intent.getBooleanExtra("favorite", false);
                    long duration = intent.getLongExtra("duration", 0);
                    String thumbnail = intent.getStringExtra("thumbnail");
                    play(id, url, title, artist, duration, thumbnail);
                    pushNotification(thumbnail);
                    break;
                case ACTION_RESUME:
                    if (player != null) player.play();
                    break;
                case ACTION_PAUSE:
                    if (player != null) player.pause();
                    break;
                case ACTION_SEEK_TO:
                    long position = intent.getLongExtra("position", 0L);
                    if (player != null) {
                        player.seekTo(position);
                        updatePlaybackState(player.isPlaying()
                                ? PlaybackStateCompat.STATE_PLAYING
                                : PlaybackStateCompat.STATE_PAUSED
                        , position);
                    }
                    break;
                case ACTION_TOGGLE_REPEAT:
                    onToggleRepeat();
                    break;
                case ACTION_TOGGLE_FAVORITE:
                    isFavorite = intent.getBooleanExtra("favorite", false);
                    updatePlaybackState(player.isPlaying()
                                    ? PlaybackStateCompat.STATE_PLAYING
                                    : PlaybackStateCompat.STATE_PAUSED);
                    break;
                case ACTION_NOTIFICATION_DISMISSED:
                    plugin.onStop();
                    stop();
            }
        }

        return START_STICKY;
    }

    private void pushNotification(String thumbnailUrl) {
        Glide.with(this)
                .asBitmap()
                .load(thumbnailUrl)
                .into(new CustomTarget<Bitmap>() {
                    @Override
                    public void onResourceReady(@NonNull Bitmap resource, @Nullable Transition<? super Bitmap> transition) {
                        notification = new NotificationCompat.Builder(getApplicationContext(), getString(R.string.notification_channel_id))
                                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                                .setSmallIcon(R.drawable.icon)
                                .setLargeIcon(resource)
                                .setStyle(new MediaStyle()
                                        .setMediaSession(mediaSession.getSessionToken()))
                                .setDeleteIntent(deletePendingIntent)
                                .build();

                        startForeground(NOTIFICATION_ID, notification);
                    }

                    @Override
                    public void onLoadCleared(@Nullable Drawable placeholder) {}
                });
    }

    private void updatePlaybackState(int state) {
        updatePlaybackState(state, player.getCurrentPosition());
    }

    private void updatePlaybackState(int state, long position) {
        PlaybackStateCompat.Builder playbackStateBuilder = new PlaybackStateCompat.Builder()
                .setActions(
                        PlaybackStateCompat.ACTION_PLAY |
                                PlaybackStateCompat.ACTION_PAUSE |
                                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                                PlaybackStateCompat.ACTION_STOP |
                                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                                PlaybackStateCompat.ACTION_SET_REPEAT_MODE |
                                PlaybackStateCompat.ACTION_SEEK_TO |
                                PlaybackStateCompat.ACTION_SET_PLAYBACK_SPEED
                );

        boolean repeating = player.getRepeatMode() != Player.REPEAT_MODE_OFF;

        CustomAction repeatAction = new CustomAction.Builder(
                ACTION_TOGGLE_REPEAT,
                "Repeat",
                repeating
                        ? R.drawable.infinite
                        : R.drawable.repeat
        ).build();

        CustomAction favoriteAction = new CustomAction.Builder(
                ACTION_TOGGLE_FAVORITE,
                "Repeat",
                isFavorite
                        ? R.drawable.favorite
                        : R.drawable.favorite_border
        ).build();

        playbackStateBuilder.addCustomAction(repeatAction);
        playbackStateBuilder.addCustomAction(favoriteAction);

        float playbackSpeed = (state == PlaybackStateCompat.STATE_PLAYING) ? 1f : 0f;
        playbackStateBuilder.setState(state, position, playbackSpeed, SystemClock.elapsedRealtime());

        mediaSession.setPlaybackState(playbackStateBuilder.build());

        if (notification != null)
            notificationManager.notify(NOTIFICATION_ID, notification);
    }

    private void play(String id, String url, String title, String artist, long duration, String thumbnailUrl) {
        MediaMetadataCompat mediaMetadata = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, id)
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ART_URI, thumbnailUrl)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration)
                .build();

        MediaItem mediaItem =
                new MediaItem.Builder()
                        .setMediaId(id)
                        .setUri(url)
                        .setMediaMetadata(
                                new MediaMetadata.Builder()
                                        .setArtist(artist)
                                        .setTitle(title)
                                        .setArtworkUri(Uri.parse(thumbnailUrl))
                                        .build())
                        .build();

        mediaSession.setMetadata(mediaMetadata);
        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();
    }

    private void onToggleRepeat() {
        boolean repeating = player.getRepeatMode() != Player.REPEAT_MODE_OFF;
        if (repeating) player.setRepeatMode(Player.REPEAT_MODE_OFF);
        else player.setRepeatMode(Player.REPEAT_MODE_ONE);

        updatePlaybackState(player.isPlaying()
                ? PlaybackStateCompat.STATE_PLAYING
                : PlaybackStateCompat.STATE_PAUSED);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
