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

import com.andreu92.shannic.plugins.Constants;
import com.andreu92.shannic.plugins.youtube.YoutubeConstants;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.EOFException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import com.andreu92.shannic.models.AudioItem;
import com.andreu92.shannic.plugins.youtube.YoutubeService;

import org.json.JSONException;

@CapacitorPlugin(name = "PlayerPlugin")
public class PlayerPlugin extends Plugin {
    private YoutubeService youtubeService;
    private MediaController mediaController;
    private ListenableFuture<MediaController> controllerFuture;
    private Future<?> autoPlayTask;
    private final AtomicInteger autoPlaySession = new AtomicInteger(0);
    private int autoPlaySessionId = 0;
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    @OptIn(markerClass = UnstableApi.class)
    @Override
    public void load() {
        super.load();

        youtubeService = YoutubeService.getInstance();

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
                        if (command.customAction.equals(PlayerActions.ACTION_TOGGLE_FAVORITE)) {
                            JSObject data = new JSObject();
                            data.put("id", mediaController.getCurrentMediaItem().mediaId);
                            notifyListeners("onToggleFavorite", data);
                        }

                        if (command.customAction.equals(PlayerActions.ACTION_SRC_REFRESH))
                            onSrcRefresh(
                                    args.getString("id"),
                                    args.getString("src"),
                                    args.getLong("expires_at")
                            );

                        if (command.customAction.equals(PlayerActions.ACTION_AUDIO_UNPLAYABLE)) {
                            if (mediaController.hasNextMediaItem()) {
                                mediaController.seekToNext();
                            } else {
                                mediaController.stop();
                                mediaController.clearMediaItems();
                                notifyListeners("onAudioUnplayable", null);
                            }
                        }

                        return Futures.immediateFuture(
                                new SessionResult(SessionResult.RESULT_SUCCESS)
                        );
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
                        data.put("id", mediaController.getCurrentMediaItem().mediaId);
                        data.put("index", mediaController.getCurrentMediaItemIndex());
                        notifyListeners("onMediaItemChanged", data);

                        int nextMediaItemIndex = mediaController.getNextMediaItemIndex();
                        if (autoPlayTask != null && autoPlayTask.isDone()
                                && nextMediaItemIndex >= mediaController.getMediaItemCount() - 2) {
                            runAutoPlay();
                        }

                        if (nextMediaItemIndex != C.INDEX_UNSET) {
                            MediaItem nextMediaItem = mediaController.getMediaItemAt(nextMediaItemIndex);
                            refreshAudioSrc(nextMediaItem, nextMediaItemIndex);
                        }

                        int previousMediaItemIndex = mediaController.getPreviousMediaItemIndex();
                        if (previousMediaItemIndex != C.INDEX_UNSET) {
                            MediaItem previousMediaItem = mediaController.getMediaItemAt(previousMediaItemIndex);
                            refreshAudioSrc(previousMediaItem, previousMediaItemIndex);
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
                        if (item == null) return;
                        int index = mediaController.getCurrentMediaItemIndex();
                        long currentPos = mediaController.getCurrentPosition();

                        // Decoder OPUS sometimes fails in older androids
                        if (error.errorCode == PlaybackException.ERROR_CODE_DECODING_FAILED) {
                            mediaController.prepare();
                            mediaController.seekTo(currentPos);
                            mediaController.play();
                            return;
                        }

                        // File not found (user manually or android deleted it?)
                        if (error.errorCode == PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND) {
                            refreshAudioSrc(item, index);
                            mediaController.prepare();
                            mediaController.play();
                            return;
                        }

                        // Dirty cache error
                        if (error.errorCode == PlaybackException.ERROR_CODE_IO_UNSPECIFIED
                                && error.getCause() instanceof EOFException) {
                            removeMediaItemFromCache(item);
                            refreshAudioSrc(item, index);
                            mediaController.prepare();
                            mediaController.seekTo(currentPos);
                            mediaController.play();
                            return;
                        }

                        Log.e("PlayerPlugin", "onPlayerError for audio: " + item.mediaId);
                        Log.e("PlayerPlugin", "Audio SRC: " + item.localConfiguration.uri);
                        Log.e("PlayerPlugin", "Error Code: " + error.errorCode);
                        Log.e("PlayerPlugin", "Error Code name: " + error.getErrorCodeName());
                        Log.e("PlayerPlugin", "Error Cause: " + error.getCause());
                        Log.e("PlayerPlugin", "Error Message: " + error.getMessage());

                        JSObject data = new JSObject();
                        data.put("code", error.errorCode);
                        data.put("name", error.getErrorCodeName());
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

    private void refreshAudioSrc(MediaItem itemToRefresh, int index) {
        MediaItem.LocalConfiguration localConfig = itemToRefresh.localConfiguration;
        if (localConfig == null) return;

        String uriStr = localConfig.uri.toString();
        if (uriStr.isBlank() || uriStr.startsWith(Constants.FAKE_SRC)) {
            refresh(itemToRefresh, index); return;
        }

        String expires_at_str = localConfig.uri
                .getQueryParameter(YoutubeConstants.EXPIRE_QUERY_PARAM);
        if (expires_at_str == null) return;

        long expires_at = Long.parseLong(expires_at_str) * 1000;
        if ((expires_at - 10000) < System.currentTimeMillis())
            refresh(itemToRefresh, index);
    }

    private void refresh(MediaItem itemToRefresh, int index) {
        executorService.execute(() -> {
            try {
                AudioItem item = youtubeService.get(itemToRefresh.mediaId);
                if (item == null) return;
                onSrcRefresh(item.id(), item.src(), item.expiresAt());

                getActivity().runOnUiThread(() -> {
                    MediaItem oldItem = mediaController.getMediaItemAt(index);
                    MediaItem newItem = oldItem.buildUpon().setUri(item.src()).build();
                    mediaController.replaceMediaItem(index, newItem);
                });
            } catch (Exception e) {
                Log.e("PlayerPlugin", "Error refreshing SRC:", e);
            }
        });
    }

    private void runAutoPlay() {
        autoPlayTask = executorService.submit(() -> {
            try {
                pushAutoPlayItems(autoPlaySessionId);
            } catch (RuntimeException e) {
                Log.d("AutoPlay", e.toString());
            } catch (Exception e) {
                JSObject error = new JSObject();
                error.put("msg", e.getMessage());
                notifyListeners("onAutoPlayError", error);
                Log.e("AutoPlay", e.toString());
            }
        });
    }

    @OptIn(markerClass = UnstableApi.class)
    private void pushAutoPlayItems(int sessionId)
            throws JSONException, JsonProcessingException, ExecutionException, InterruptedException {
        List<AudioItem> nextItems = youtubeService.getNextItems();
        if (nextItems == null || nextItems.isEmpty()) return;

        for (AudioItem item : nextItems) {
            if (isInQueue(item.id()).get()) continue;

            MediaItem nextMediaItem =
                    new MediaItem.Builder()
                            .setMediaId(item.id())
                            .setCustomCacheKey(item.id())
                            .setUri(item.src())
                            .setMediaMetadata(
                                    new MediaMetadata.Builder()
                                            .setArtist(item.author())
                                            .setTitle(item.title())
                                            .setArtworkUri(Uri.parse(item.thumbnail()))
                                            .build())
                            .build();

            if (sessionId == autoPlaySession.get()) {
                getActivity().runOnUiThread(() -> mediaController.addMediaItem(nextMediaItem));
                String json = Constants.mapper.writeValueAsString(item);
                notifyListeners("onSetNextItem", new JSObject(json));
            }
        }
    }

    @OptIn(markerClass = UnstableApi.class)
    private void removeMediaItemFromCache(MediaItem item) {
        if (item == null || item.localConfiguration == null) return;
        String cacheKey = item.localConfiguration.customCacheKey;
        SimpleCache cache = PlayerCache.getInstance(getContext());
        if (cacheKey != null) cache.removeResource(cacheKey);
    }

    private void onSrcRefresh(String id, String src, Long expires_at) {
        JSObject data = new JSObject();
        data.put("id", id);
        data.put("src", src);
        data.put("expires_at", expires_at);
        notifyListeners("onSrcRefresh", data);
    }

    @OptIn(markerClass = UnstableApi.class)
    @PluginMethod()
    public void play(PluginCall call) throws JsonProcessingException {
        if (autoPlayTask != null && !autoPlayTask.isDone()) {
            autoPlayTask.cancel(true);
        }
        youtubeService.clearCurrentPlaylistExtractor();

        JSArray js_audio_items_array = call.getArray("audio_items");
        boolean shuffle = call.getBoolean("shuffle", false);

        ArrayList<PlayerAudioItem> audioItems = Constants.mapper
                .readValue(js_audio_items_array.toString(), new TypeReference<>() {});
        ArrayList<MediaItem> mediaItems = new ArrayList<>();

        // Enable autoplay if is not a playlist
        if (audioItems.size() == 1) {
            autoPlaySessionId = autoPlaySession.incrementAndGet();
            youtubeService.setCurrentItemId(audioItems.get(0).id());
            runAutoPlay();
        }
        else youtubeService.setCurrentItemId(null);

        for (PlayerAudioItem item : audioItems) {
            MediaItem mediaItem =
                    new MediaItem.Builder()
                            .setMediaId(item.id())
                            .setCustomCacheKey(item.id())
                            .setUri(item.src())
                            .setMediaMetadata(
                                    new MediaMetadata.Builder()
                                            .setArtist(item.author())
                                            .setTitle(item.title())
                                            .setArtworkUri(Uri.parse(item.thumbnail()))
                                            .build())
                            .build();

            mediaItems.add(mediaItem);
        }

        getActivity().runOnUiThread(() -> {
            mediaController.stop();
            mediaController.setShuffleModeEnabled(shuffle);
            mediaController.setMediaItems(mediaItems);
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
    public void setRepeat(PluginCall call) {
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
    public void setFavorite(PluginCall call) {
        boolean favorite = call.getBoolean("favorite");
        getActivity().runOnUiThread(() -> {
            Bundle args = new Bundle();
            args.putBoolean("favorite", favorite);

            SessionCommand customCommand = new SessionCommand(
                    PlayerActions.ACTION_TOGGLE_FAVORITE, Bundle.EMPTY);
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

    private CompletableFuture<Boolean> isInQueue(String id) {
        CompletableFuture<Boolean> isInQueue = new CompletableFuture<>();

        getActivity().runOnUiThread(() -> {
            for (int i = 0; i < mediaController.getMediaItemCount(); i++) {
                MediaItem item = mediaController.getMediaItemAt(i);
                if (id.equals(item.mediaId)) {
                    isInQueue.complete(true);
                }
            }
            isInQueue.complete(false);
        });

        return isInQueue;
    }

    @PluginMethod
    public void isInQueue(PluginCall call) throws ExecutionException, InterruptedException {
        String id = call.getString("id");
        JSObject data = new JSObject();
        boolean isIn = isInQueue(id).get();
        data.put("is_in_queue", isIn);
        call.resolve(data);
    }

    @PluginMethod
    public void hasNext(PluginCall call) {
        JSObject data = new JSObject();
        getActivity().runOnUiThread(() -> {
            data.put("has_next", mediaController.hasNextMediaItem());
            call.resolve(data);
        });
    }

    @OptIn(markerClass = UnstableApi.class)
    @PluginMethod
    public void clearCache(PluginCall call) {
        PlayerCache.clear();
        call.resolve();
    }

    @PluginMethod()
    public void stop(PluginCall call) {
        if (autoPlayTask != null && !autoPlayTask.isDone()) {
            autoPlayTask.cancel(true);
        }

        getActivity().runOnUiThread(() -> {
            mediaController.stop();
            mediaController.clearMediaItems();
            call.resolve();
        });
    }
}