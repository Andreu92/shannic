package com.andreu92.shannic.youtube;

import android.app.Activity;

import com.andreu92.shannic.Constants;
import com.andreu92.shannic.models.SearchResponse;

import org.schabi.newpipe.extractor.search.SearchExtractor;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import app.tauri.annotation.Command;
import app.tauri.annotation.TauriPlugin;
import app.tauri.plugin.Invoke;
import app.tauri.plugin.JSObject;
import app.tauri.plugin.Plugin;

@TauriPlugin
public class YoutubePlugin extends Plugin {
    private static final String NO_RESULTS = "NO_RESULTS";

    private final YoutubeService youtubeService = YoutubeService.getInstance();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public YoutubePlugin(Activity activity) {
        super(activity);
    }

    public static class SearchArgs {
        public String query;
        public Boolean only_music;
    }

    public static class GetArgs {
        public String id;
    }

    public static class GetByQueryArgs {
        public String artist;
        public String title;
    }

    private void respond(Invoke invoke, Object model) throws Exception {
        invoke.resolve(new JSObject(Constants.mapper.writeValueAsString(model)));
    }

    private void fail(Invoke invoke, Exception e) {
        String msg = e.getMessage();
        invoke.reject(msg != null ? msg : e.getClass().getSimpleName());
    }

    @Command
    public void search(final Invoke invoke) {
        executor.execute(() -> {
            try {
                SearchArgs args = invoke.parseArgs(SearchArgs.class);
                boolean onlyMusic = Boolean.TRUE.equals(args.only_music);

                SearchResponse response = onlyMusic
                        ? youtubeService.searchMusic(args.query)
                        : youtubeService.search(args.query);

                if (response.items().isEmpty()) {
                    invoke.reject(NO_RESULTS);
                    return;
                }
                respond(invoke, response);
            } catch (SearchExtractor.NothingFoundException e) {
                invoke.reject(NO_RESULTS);
            } catch (Exception e) {
                fail(invoke, e);
            }
        });
    }

    @Command
    public void fetchNextPage(final Invoke invoke) {
        executor.execute(() -> {
            try {
                respond(invoke, youtubeService.fetchNextPage());
            } catch (Exception e) {
                fail(invoke, e);
            }
        });
    }

    @Command
    public void get(final Invoke invoke) {
        executor.execute(() -> {
            try {
                GetArgs args = invoke.parseArgs(GetArgs.class);
                respond(invoke, youtubeService.get(args.id));
            } catch (Exception e) {
                fail(invoke, e);
            }
        });
    }

    @Command
    public void getByQuery(final Invoke invoke) {
        executor.execute(() -> {
            try {
                GetByQueryArgs args = invoke.parseArgs(GetByQueryArgs.class);
                respond(invoke, youtubeService.getByQuery(args.artist, args.title));
            } catch (Exception e) {
                fail(invoke, e);
            }
        });
    }
}