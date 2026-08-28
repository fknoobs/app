use serde::Serialize;

const MAX_WIDTH: u32 = 1920;
const JPEG_QUALITY: u8 = 70;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameWindowCapture {
    pub jpeg_base64: String,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn capture_game_window() -> Result<GameWindowCapture, String> {
    #[cfg(not(windows))]
    {
        Err("Game window capture is only supported on Windows".into())
    }

    #[cfg(windows)]
    {
        tokio::task::spawn_blocking(capture_game_window_sync)
            .await
            .map_err(|e| e.to_string())?
    }
}

#[cfg(windows)]
fn capture_game_window_sync() -> Result<GameWindowCapture, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use image::codecs::jpeg::JpegEncoder;
    use image::{DynamicImage, ExtendedColorType};
    use xcap::Window;

    let windows = Window::all().map_err(|error| error.to_string())?;
    let coh_pid = relic_coh_pid();
    let window = windows
        .into_iter()
        .find(|window| is_coh_window(window, coh_pid))
        .ok_or_else(|| "Company of Heroes window not found".to_string())?;

    if window.is_minimized().unwrap_or(false) {
        return Err("Company of Heroes window is minimized".into());
    }

    let rgba = window.capture_image().map_err(|error| error.to_string())?;
    let mut image = DynamicImage::ImageRgba8(rgba);

    if image.width() > MAX_WIDTH {
        let height = ((image.height() as f32) * (MAX_WIDTH as f32) / (image.width() as f32))
            .round()
            .max(1.0) as u32;
        image = image.resize(MAX_WIDTH, height, image::imageops::FilterType::Triangle);
    }

    let rgb = image.to_rgb8();
    let mut jpeg = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut jpeg, JPEG_QUALITY);
    encoder
        .encode(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            ExtendedColorType::Rgb8,
        )
        .map_err(|error| error.to_string())?;

    Ok(GameWindowCapture {
        jpeg_base64: STANDARD.encode(jpeg),
        width: rgb.width(),
        height: rgb.height(),
    })
}

#[cfg(windows)]
fn relic_coh_pid() -> Option<u32> {
    use sysinfo::System;

    let mut system = System::new_all();
    system.refresh_processes();

    system.processes().iter().find_map(|(pid, process)| {
        let name = process.name().to_lowercase();
        if name == "reliccoh.exe" || name == "reliccoh" {
            Some(pid.as_u32())
        } else {
            None
        }
    })
}

#[cfg(windows)]
fn is_coh_window(window: &xcap::Window, coh_pid: Option<u32>) -> bool {
    if let Some(pid) = coh_pid {
        if window.pid().ok() == Some(pid) {
            return true;
        }
    }

    window
        .title()
        .map(|title| title.to_lowercase().contains("company of heroes"))
        .unwrap_or(false)
}
