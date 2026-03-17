package com.andreu92.shannic.plugins.player;

import android.content.ComponentName;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.core.content.ContextCompat;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.cache.SimpleCache;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionCommand;
import androidx.media3.session.SessionResult;
import androidx.media3.session.SessionToken;

import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.ArrayList;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import com.andreu92.shannic.plugins.youtube.AudioItem;
import com.andreu92.shannic.plugins.youtube.YoutubeService;

@CapacitorPlugin(name = "PlayerPlugin")
public class PlayerPlugin extends Plugin {
    private final YoutubeService youtubeService = YoutubeService.getInstance();
    private MediaController mediaController;
    private ListenableFuture<MediaController> controllerFuture;
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    @OptIn(markerClass = UnstableApi.class)
    @Override
    public void load() {
        super.load();

        SessionToken sessionToken = new SessionToken(
                getContext(),
                new ComponentName(getContext(), PlayerService.class)
        );

        controllerFuture = new MediaController.Builder(getContext(), sessionToken)
                .setListener(new MediaController.Listener() {
                    @NonNull
                    @Override
                    public ListenableFuture<SessionResult> onCustomCommand(
                        @NonNull MediaController controller,
                        @NonNull SessionCommand command,
                        @NonNull Bundle args
                    ){
                        if (command.customAction.equals(PlayerActions.ACTION_TOGGLE_FAVORITE))
                            notifyListeners("onToggleFavorite", null);

                        if (command.customAction.equals(PlayerActions.ACTION_URL_REFRESH))
                            onUrlRefresh(args.getString("id"), args.getString("url"), args.getLong("expires_at"));

                        if (command.customAction.equals(PlayerActions.ACTION_AUDIO_UNPLAYABLE)) {
                            if (mediaController.hasNextMediaItem()) {
                                mediaController.seekToNext();
                            } else {
                                mediaController.stop();
                                mediaController.clearMediaItems();
                                notifyListeners("onAudioUnplayable", null);
                            }
                        }

                        return Futures.immediateFuture(new SessionResult(SessionResult.RESULT_SUCCESS));
                    }
                })
                .buildAsync();

        controllerFuture.addListener(() -> {
            try {
                mediaController = controllerFuture.get();

                mediaController.addListener(new Player.Listener() {
                    @Override
                    public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
                        if (mediaItem == null || reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) return;

                        JSObject data = new JSObject();
                        data.put("index", mediaController.getCurrentMediaItemIndex());
                        notifyListeners("onMediaItemChanged", data);

                        //Pre refresh if necessary
                        int nextMediaItemIndex = mediaController.getNextMediaItemIndex();
                        if (nextMediaItemIndex != C.INDEX_UNSET) {
                            MediaItem nextMediaItem = mediaController.getMediaItemAt(nextMediaItemIndex);
                            executorService.execute(() -> refreshAudioUrl(nextMediaItem, nextMediaItemIndex));
                        }

                        int previousMediaItemIndex = mediaController.getPreviousMediaItemIndex();
                        if (previousMediaItemIndex != C.INDEX_UNSET) {
                            MediaItem previousMediaItem = mediaController.getMediaItemAt(previousMediaItemIndex);
                            executorService.execute(() -> refreshAudioUrl(previousMediaItem, previousMediaItemIndex));
                        }
                    }

                    @Override
                    public void onIsPlayingChanged(boolean isPlaying) {
                        refreshPlaybackState(isPlaying);
                    }

                    @Override
                    public void onPlaybackStateChanged(int playbackState) {
                        switch (playbackState) {
                            case Player.STATE_BUFFERING:
                                notifyListeners("onBuffering", null);
                                break;
                            case Player.STATE_READY:
                                refreshPlaybackState(mediaController.isPlaying());
                                break;
                            case Player.STATE_ENDED:
                                if (mediaController.getRepeatMode() == Player.REPEAT_MODE_OFF) {
                                    mediaController.seekToDefaultPosition(0);
                                    mediaController.pause();
                                }
                        }
                    }

                    @Override
                    public void onRepeatModeChanged(int repeatMode) {
                        JSObject data = new JSObject();
                        data.put("repeating", repeatMode == Player.REPEAT_MODE_ONE);
                        notifyListeners("onToggleRepeat", data);
                    }

                    @Override
                    public void onPlayerError(@NonNull PlaybackException error) {
                        MediaItem item = mediaController.getCurrentMediaItem();
                        int index = mediaController.getCurrentMediaItemIndex();
                        long currentPos = mediaController.getCurrentPosition();

                        if (item == null) return;

                        Log.e("PlayerPlugin", "onPlayerError for audio: " + item.mediaId);
                        Log.e("PlayerPlugin", "Audio URL: " + item.localConfiguration.uri);
                        Log.e("PlayerPlugin", "Error Code: " + error.errorCode);
                        Log.e("PlayerPlugin", "Error Code name: " + error.getErrorCodeName());
                        Log.e("PlayerPlugin", "Error Cause: " + error.getCause());
                        Log.e("PlayerPlugin", "Error Message: " + error.getMessage());

                        // Decoder OPUS sometimes fails in older androids
                        if (error.errorCode == PlaybackException.ERROR_CODE_DECODING_FAILED) {
                            mediaController.prepare();
                            mediaController.seekTo(currentPos);
                            mediaController.play();
                            return;
                        }

                        // File not found (user manually or android deleted it?)
                        if (error.errorCode == PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND) {
                            refreshAudioUrl(item, index);
                            mediaController.prepare();
                            mediaController.play();
                            return;
                        }

                        // Dirty cache error
                        if (error.errorCode == PlaybackException.ERROR_CODE_IO_UNSPECIFIED
                                || error.errorCode == PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED) {
                            removeMediaItemFromCache(item);
                            refreshAudioUrl(item, index);
                            mediaController.prepare();
                            mediaController.seekTo(currentPos);
                            mediaController.play();
                            return;
                        }

                        JSObject data = new JSObject();
                        data.put("code", error.errorCode);
                        data.put("cause", error.getCause());
                        data.put("message", error.getMessage());
                        notifyListeners("onSourceError", data);
                    }
                });

            } catch (ExecutionException | InterruptedException ignored) {}
        }, ContextCompat.getMainExecutor(getContext()));
    }

    private void refreshPlaybackState(boolean isPlaying) {
        JSObject data = new JSObject();
        data.put("position", mediaController.getCurrentPosition());
        if (isPlaying) notifyListeners("onPlay", data);
        else notifyListeners("onPause", data);
    }

    private void refreshAudioUrl(MediaItem itemToRefresh, int index) {
        if (itemToRefresh.localConfiguration == null) return;

        String expires_at_str = itemToRefresh.localConfiguration.uri.getQueryParameter("expire");
        if (expires_at_str == null) return;

        long expires_at = Long.parseLong(expires_at_str) * 1000;
        if ((expires_at - 10000) < System.currentTimeMillis()) {
            executorService.execute(() -> {
                try {
                    AudioItem item = youtubeService.get(itemToRefresh.mediaId);
                    onUrlRefresh(item.id(), item.url(), item.expires_at());

                    getActivity().runOnUiThread(() -> {
                        if (item.url() == null) return;
                        MediaItem oldItem = mediaController.getMediaItemAt(index);
                        MediaItem newItem = oldItem.buildUpon().setUri(item.url()).build();
                        mediaController.replaceMediaItem(index, newItem);
                    });
                } catch (ExecutionException | IOException | InterruptedException e) {
                    Log.e("PlayerPlugin", "Error refreshing URL:", e);
                }
            });
        }
    }

    @OptIn(markerClass = UnstableApi.class)
    private void removeMediaItemFromCache(MediaItem item) {
        if (item == null || item.localConfiguration == null) return;
        String cacheKey = item.localConfiguration.customCacheKey;
        SimpleCache cache = PlayerCache.getInstance(getContext());
        cache.removeResource(cacheKey);
    }

    private void onUrlRefresh(String id, String url, Long expires_at) {
        JSObject data = new JSObject();
        data.put("id", id);
        data.put("url", url);
        data.put("expires_at", expires_at);
        notifyListeners("onUrlRefresh", data);
    }

    @OptIn(markerClass = UnstableApi.class)
    @PluginMethod()
    public void play(PluginCall call) throws JsonProcessingException {
        JSArray js_audio_items_array = call.getArray("audio_items");
        boolean shuffle = call.getBoolean("shuffle", false);

        JsonMapper mapper = JsonMapper.builder()
                .defaultPropertyInclusion(JsonInclude.Value.construct(JsonInclude.Include.NON_NULL, JsonInclude.Include.ALWAYS))
                .visibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY)
                .enable(SerializationFeature.INDENT_OUTPUT)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .build();

        ArrayList<PlayerAudioItem> audioItems = mapper.readValue(js_audio_items_array.toString(), new TypeReference<>() {});
        ArrayList<MediaItem> mediaItems = new ArrayList<>();

        for (PlayerAudioItem item : audioItems) {
            Bundle extras = new Bundle();
            extras.putBoolean("favorite", item.favorite());

            MediaItem mediaItem =
                    new MediaItem.Builder()
                            .setMediaId(item.id())
                            .setCustomCacheKey(item.id())
                            .setUri(item.url())
                            .setMediaMetadata(
                                    new MediaMetadata.Builder()
                                            .setArtist(item.author())
                                            .setTitle(item.title())
                                            .setArtworkUri(Uri.parse(item.thumbnail()))
                                            .setExtras(extras)
                                            .build())
                            .build();

            mediaItems.add(mediaItem);
        }

        getActivity().runOnUiThread(() -> {
            mediaController.stop();
            mediaController.setMediaItems(mediaItems);
            mediaController.setShuffleModeEnabled(shuffle);
            if (!mediaItems.isEmpty() && shuffle) {
                int randomIndex = (int) (Math.random() * mediaItems.size());
                mediaController.seekTo(randomIndex, 0);
            }
            mediaController.prepare();
            mediaController.play();
            call.resolve();
        });
    }

    @PluginMethod()
    public void resume(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            mediaController.play();
            call.resolve();
        });
    }

    @PluginMethod()
    public void pause(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            mediaController.pause();
            call.resolve();
        });
    }

    @PluginMethod()
    public void seekTo(PluginCall call) {
        long position = call.getDouble("position", 0D).longValue();
        getActivity().runOnUiThread(() -> {
            mediaController.seekTo(position);
            call.resolve();
        });
    }

    @PluginMethod()
    public void toggleRepeat(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Boolean repeating = call.getBoolean("repeating", false);
            mediaController.setRepeatMode(repeating ? Player.REPEAT_MODE_ONE : Player.REPEAT_MODE_OFF);
            call.resolve();
        });
    }

    @PluginMethod()
    public void skipPrevious(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            mediaController.seekToPrevious();
            call.resolve();
        });
    }

    @PluginMethod()
    public void skipNext(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            mediaController.seekToNext();
            call.resolve();
        });
    }

    @PluginMethod()
    public void toggleFavorite(PluginCall call) {
        int index = call.getInt("index");
        boolean favorite = call.getBoolean("favorite");

        getActivity().runOnUiThread(() -> {
            Bundle args = new Bundle();
            args.putBoolean("favorite", favorite);
            args.putInt("index", index);

            SessionCommand customCommand = new SessionCommand(PlayerActions.ACTION_TOGGLE_FAVORITE, Bundle.EMPTY);
            mediaController.sendCustomCommand(customCommand, args);

            call.resolve();
        });
    }

    @PluginMethod
    public void getCurrentPosition(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject data = new JSObject();
            data.put("position", mediaController.getCurrentPosition());
            call.resolve(data);
        });
    }

    @PluginMethod()
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (mediaController != null) {
                mediaController.stop();
                mediaController.release();
                mediaController = null;
                call.resolve();
            }
        });
    }
}