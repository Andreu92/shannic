package com.andreu92.shannic.plugins.player;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.ResolvingDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.session.CommandButton;
import androidx.media3.session.DefaultMediaNotificationProvider;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import androidx.media3.session.SessionCommand;
import androidx.media3.session.SessionCommands;
import androidx.media3.session.SessionResult;

import java.io.IOException;
import java.util.Objects;
import java.util.concurrent.ExecutionException;

import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import com.andreu92.shannic.R;
import com.andreu92.shannic.innertube.InnerTubeClient;
import com.andreu92.shannic.plugins.youtube.YoutubeService;
import com.andreu92.shannic.plugins.youtube.AudioItem;

@UnstableApi
public class PlayerService extends MediaSessionService {
    private ExoPlayer player;
    private MediaSession mediaSession;
    private final YoutubeService youtubeService = YoutubeService.getInstance();
    private SessionCommand favoriteCommand;
    private SessionCommand repeatCommand;
    private SessionCommand skipToPreviousCommand;
    private SessionCommand skipToNextCommand;
    private MediaSession.ControllerInfo appControllerInfo;
    private final ResolvingDataSource.Resolver urlResolver = new ResolvingDataSource.Resolver() {
        @NonNull
        @OptIn(markerClass = UnstableApi.class)
        @Override
        public DataSpec resolveDataSpec(DataSpec dataSpec) throws IOException {
            Uri uri = dataSpec.uri;

            String expires_at_str = uri.getQueryParameter("expire");
            if (expires_at_str == null) return dataSpec;

            long expires_at = Long.parseLong(expires_at_str) * 1000;
            if ((expires_at - 10000) < System.currentTimeMillis()) {
                try {
                    AudioItem item = youtubeService.get(dataSpec.key);

                    Bundle extras = new Bundle();
                    extras.putString("id", item.id());
                    extras.putString("url", item.url());
                    extras.putLong("expires_at", item.expires_at());

                    mediaSession.sendCustomCommand(appControllerInfo,
                            new SessionCommand(PlayerActions.ACTION_URL_REFRESH, Bundle.EMPTY),
                            extras
                    );

                    return dataSpec.buildUpon()
                            .setUri(Uri.parse(item.url()))
                            .build();
                } catch (ExecutionException | InterruptedException ignored) {}
            }

            return dataSpec;
        }
    };

    @Nullable
    @Override
    public MediaSession onGetSession(@NonNull MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @OptIn(markerClass = UnstableApi.class)
    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();
        createPlayer();
        createMediaSession();

        DefaultMediaNotificationProvider notificationProvider =
                new DefaultMediaNotificationProvider.Builder(this)
                        .setChannelId(String.valueOf(R.string.notification_channel_id))
                        .setChannelName(R.string.app_name)
                        .build();

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

    @OptIn(markerClass = UnstableApi.class)
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

    @OptIn(markerClass = UnstableApi.class)
    private void createPlayer() {
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent(InnerTubeClient.USER_AGENT)
                .setConnectTimeoutMs(DefaultHttpDataSource.DEFAULT_CONNECT_TIMEOUT_MILLIS)
                .setReadTimeoutMs(DefaultHttpDataSource.DEFAULT_READ_TIMEOUT_MILLIS)
                .setAllowCrossProtocolRedirects(true);

        ResolvingDataSource.Factory resolvingDataSourceFactory =
                new ResolvingDataSource.Factory(httpDataSourceFactory, urlResolver);

        DefaultMediaSourceFactory mediaSourceFactory =
                new DefaultMediaSourceFactory(this)
                        .setDataSourceFactory(resolvingDataSourceFactory);

        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, true)
                .setMediaSourceFactory(mediaSourceFactory)
                .build();

        player.addListener(new Player.Listener() {
            @Override
            public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
                syncNotificationButtons();
            }

            @Override
            public void onRepeatModeChanged(int repeatMode) {
                syncNotificationButtons();
            }
        });
    }

    private void createMediaSession() {
        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent sessionActivityPendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        favoriteCommand = new SessionCommand(PlayerActions.ACTION_TOGGLE_FAVORITE, Bundle.EMPTY);
        repeatCommand = new SessionCommand(PlayerActions.ACTION_TOGGLE_REPEAT, Bundle.EMPTY);
        skipToPreviousCommand = new SessionCommand(PlayerActions.ACTION_SKIP_TO_PREVIOUS, Bundle.EMPTY);
        skipToNextCommand = new SessionCommand(PlayerActions.ACTION_SKIP_TO_NEXT, Bundle.EMPTY);

        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(sessionActivityPendingIntent)
                .setCallback(new MediaSession.Callback() {
                    @OptIn(markerClass = UnstableApi.class)
                    @NonNull
                    @Override
                    public MediaSession.ConnectionResult onConnect(@NonNull MediaSession session, @NonNull MediaSession.ControllerInfo controller) {
                        if (controller.getPackageName().equals(getPackageName()) && !mediaSession.isMediaNotificationController(controller)) {
                            appControllerInfo = controller;
                        }

                        Player.Commands playerCommands =
                                MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS
                                        .buildUpon()
                                        .removeAll(Player.COMMAND_SEEK_TO_PREVIOUS,
                                                Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM,
                                                Player.COMMAND_SEEK_TO_NEXT,
                                                Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM
                                        ).build();

                        SessionCommands sessionCommands = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                                .add(repeatCommand)
                                .add(skipToPreviousCommand)
                                .add(skipToNextCommand)
                                .add(favoriteCommand)
                                .build();

                        return new MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                                .setAvailableSessionCommands(sessionCommands)
                                .setAvailablePlayerCommands(playerCommands)
                                .build();
                    }

                    @OptIn(markerClass = UnstableApi.class)
                    @NonNull
                    @Override
                    public ListenableFuture<SessionResult> onCustomCommand(
                            @NonNull MediaSession session,
                            @NonNull MediaSession.ControllerInfo controller,
                            @NonNull SessionCommand customCommand,
                            @NonNull Bundle args) {

                        switch (customCommand.customAction) {
                            case PlayerActions.ACTION_TOGGLE_REPEAT:
                                int repeatMode = player.getRepeatMode();
                                player.setRepeatMode(repeatMode == Player.REPEAT_MODE_ONE
                                        ? Player.REPEAT_MODE_OFF : Player.REPEAT_MODE_ONE);
                                break;
                            case PlayerActions.ACTION_SKIP_TO_PREVIOUS:
                                player.seekToPrevious();
                                break;
                            case PlayerActions.ACTION_SKIP_TO_NEXT:
                                player.seekToNext();
                                break;
                            case PlayerActions.ACTION_TOGGLE_FAVORITE:
                                int toggledIndex = player.getCurrentMediaItemIndex();
                                boolean favorite = !player.getCurrentMediaItem().mediaMetadata.extras
                                        .getBoolean("favorite", false);

                                if (!args.isEmpty()) {
                                    toggledIndex = args.getInt("index");
                                    favorite = args.getBoolean("favorite");
                                }

                                MediaItem item = player.getMediaItemAt(toggledIndex);
                                    Bundle extras = new Bundle();
                                    extras.putBoolean("favorite", favorite);

                                MediaMetadata newMetadata = item.mediaMetadata.buildUpon()
                                        .setExtras(extras)
                                        .build();

                                MediaItem updatedItem = item.buildUpon()
                                        .setMediaMetadata(newMetadata)
                                        .build();

                                player.replaceMediaItem(toggledIndex, updatedItem);

                                if (!controller.equals(appControllerInfo))
                                    mediaSession.sendCustomCommand(appControllerInfo, favoriteCommand, Bundle.EMPTY);

                                syncNotificationButtons();
                        }

                        return Futures.immediateFuture(new SessionResult(SessionResult.RESULT_SUCCESS));
                    }
                })
                .build();
    }

    @OptIn(markerClass = UnstableApi.class)
    private void syncNotificationButtons() {
        MediaItem currentItem = player.getCurrentMediaItem();
        if (currentItem == null) return;

        CommandButton prevBtn = new CommandButton.Builder(CommandButton.ICON_UNDEFINED)
                .setCustomIconResId(R.drawable.play_skip_back)
                .setSessionCommand(skipToPreviousCommand)
                .setDisplayName("Previous")
                .setSlots(CommandButton.SLOT_BACK)
                .build();

        CommandButton nextBtn = new CommandButton.Builder(CommandButton.ICON_UNDEFINED)
                .setCustomIconResId(R.drawable.play_skip_forward)
                .setSessionCommand(skipToNextCommand)
                .setSlots(CommandButton.SLOT_FORWARD)
                .setDisplayName("Next")
                .build();

        boolean isFavorite = false;
        if (currentItem.mediaMetadata.extras != null) {
            isFavorite = currentItem.mediaMetadata.extras.getBoolean("favorite", false);
        }

        CommandButton favoriteBtn = new CommandButton.Builder(CommandButton.ICON_UNDEFINED)
                .setCustomIconResId(isFavorite
                        ? R.drawable.heart : R.drawable.heart_outline)
                .setSessionCommand(favoriteCommand)
                .setDisplayName("Favorite")
                .build();

        int repeatMode = player.getRepeatMode();

        CommandButton repeatBtn = new CommandButton.Builder(CommandButton.ICON_UNDEFINED)
                .setCustomIconResId(repeatMode == Player.REPEAT_MODE_ONE
                        ? R.drawable.infinite : R.drawable.repeat)
                .setSessionCommand(repeatCommand)
                .setDisplayName("Repeat")
                .build();

        mediaSession.setMediaButtonPreferences(ImmutableList.of(repeatBtn, prevBtn, nextBtn, favoriteBtn));
    }

}
