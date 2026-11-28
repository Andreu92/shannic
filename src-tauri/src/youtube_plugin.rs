use serde_json::Value;
use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
use tauri::{AppHandle, Wry};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.andreu92.shannic.youtube";
#[cfg(target_os = "android")]
const PLUGIN_CLASS: &str = "YoutubePlugin";

#[cfg(target_os = "android")]
pub struct YoutubePlugin {
    handle: tauri::plugin::PluginHandle<Wry>,
}

#[cfg(target_os = "android")]
impl YoutubePlugin {
    async fn call(&self, method: &str, payload: Value) -> Result<Value, String> {
        self.handle
            .run_mobile_plugin_async(method, payload)
            .await
            .map_err(|e| e.to_string())
    }
}

pub fn init() -> TauriPlugin<Wry, Value> {
    let builder = PluginBuilder::<Wry, Value>::new("youtube");

    #[cfg(target_os = "android")]
    let builder = builder.setup(|app, api| {
        use tauri::Manager;
        let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, PLUGIN_CLASS)?;
        app.manage(YoutubePlugin { handle });
        Ok(())
    });

    builder.build()
}

async fn run(app: AppHandle, method: &str, payload: Value) -> Result<Value, String> {
    #[cfg(target_os = "android")]
    {
        use tauri::Manager;
        app.state::<YoutubePlugin>().call(method, payload).await
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, method, payload);
        Err("YouTube plugin not implemented on desktop yet".into())
    }
}

#[tauri::command]
pub async fn search(app: AppHandle, payload: Value) -> Result<Value, String> {
    run(app, "search", payload).await
}

#[tauri::command]
pub async fn fetch_next_page(app: AppHandle, payload: Value) -> Result<Value, String> {
    run(app, "fetchNextPage", payload).await
}

#[tauri::command]
pub async fn get(app: AppHandle, payload: Value) -> Result<Value, String> {
    run(app, "get", payload).await
}

#[tauri::command]
pub async fn get_by_query(app: AppHandle, payload: Value) -> Result<Value, String> {
    run(app, "getByQuery", payload).await
}