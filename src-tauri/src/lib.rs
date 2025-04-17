use tauri::Manager;
use tauri::{command, Emitter, Window};
use tauri_plugin_oauth::start;

#[command]
async fn start_server(window: Window) -> Result<u16, String> {
    start(move |url| {
        // Because of the unprotected localhost port, you must verify the URL here.
        // Preferebly send back only the token, or nothing at all if you can handle everything else in Rust.
        let _ = window.emit("redirect_uri", url);
    })
    .map_err(|err| err.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
                window.close_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_oauth::init())
        .invoke_handler(tauri::generate_handler![start_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
