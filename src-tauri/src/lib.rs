mod youtube_plugin;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        );
    }

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(youtube_plugin::init())
        .invoke_handler(tauri::generate_handler![
            youtube_plugin::search,
            youtube_plugin::fetch_next_page,
            youtube_plugin::get,
            youtube_plugin::get_by_query,
        ])
        .setup(|app| {
            #[cfg(mobile)]
            app.handle().plugin(tauri_plugin_haptics::init())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}