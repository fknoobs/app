use serde::Serialize;

const MAX_WIDTH: u32 = 1920;
const JPEG_QUALITY: u8 = 70;
const MIN_WINDOW_WIDTH: u32 = 400;
const MIN_WINDOW_HEIGHT: u32 = 300;

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

    let window = pick_coh_window()?;
    let mut rgba = window.capture_image().map_err(|error| error.to_string())?;

    // PrintWindow/GDI often returns a uniform black frame for DirectX games.
    // If the game is focused, capture the pixels actually on screen instead.
    if is_blank_frame(&rgba) && window.is_focused().unwrap_or(false) {
        if let Ok(visible) = capture_visible_window(&window) {
            rgba = visible;
        }
    }

    if is_blank_frame(&rgba) {
        return Err("Company of Heroes capture was blank".into());
    }

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
fn pick_coh_window() -> Result<xcap::Window, String> {
    let windows = xcap::Window::all().map_err(|error| error.to_string())?;
    let coh_pid = relic_coh_pid();
    let mut best: Option<(u64, xcap::Window)> = None;

    for window in windows {
        if !is_coh_window(&window, coh_pid) {
            continue;
        }
        if window.is_minimized().unwrap_or(true) {
            continue;
        }
        let width = window.width().unwrap_or(0);
        let height = window.height().unwrap_or(0);
        if width < MIN_WINDOW_WIDTH || height < MIN_WINDOW_HEIGHT {
            continue;
        }
        let focused = u64::from(window.is_focused().unwrap_or(false));
        let score = focused.saturating_mul(1_000_000_000) + u64::from(width) * u64::from(height);
        if best.as_ref().is_none_or(|(best_score, _)| score > *best_score) {
            best = Some((score, window));
        }
    }

    best.map(|(_, window)| window)
        .ok_or_else(|| "Company of Heroes window not found".to_string())
}

/// GDI/PrintWindow blank frames are uniformly black. Real CoH shots still have
/// HUD/minimap variance even when the map itself is dark.
#[cfg(windows)]
fn is_blank_frame(image: &image::RgbaImage) -> bool {
    const STEP: usize = 16;
    let mut count = 0u64;
    let mut dark = 0u64;
    let mut sum = 0u64;
    let mut sum_sq = 0u64;

    for (index, pixel) in image.pixels().enumerate() {
        if index % STEP != 0 {
            continue;
        }
        count += 1;
        let luma = u64::from(pixel.0[0]) + u64::from(pixel.0[1]) + u64::from(pixel.0[2]);
        sum += luma;
        sum_sq += luma * luma;
        if luma < 12 {
            dark += 1;
        }
    }

    if count == 0 {
        return true;
    }

    let mean = sum as f64 / count as f64;
    let variance = (sum_sq as f64 / count as f64) - mean * mean;
    dark * 100 / count >= 98 && variance < 80.0
}

#[cfg(windows)]
fn capture_visible_window(window: &xcap::Window) -> Result<image::RgbaImage, String> {
    use image::DynamicImage;

    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?;
    let screenshot = monitor.capture_image().map_err(|error| error.to_string())?;
    let mx = monitor.x().unwrap_or(0);
    let my = monitor.y().unwrap_or(0);
    let wx = window.x().map_err(|error| error.to_string())?;
    let wy = window.y().map_err(|error| error.to_string())?;
    let ww = window.width().map_err(|error| error.to_string())?;
    let wh = window.height().map_err(|error| error.to_string())?;
    let x = (wx - mx).max(0) as u32;
    let y = (wy - my).max(0) as u32;
    if x >= screenshot.width() || y >= screenshot.height() {
        return Err("Company of Heroes window is off-screen".into());
    }
    let width = ww.min(screenshot.width().saturating_sub(x));
    let height = wh.min(screenshot.height().saturating_sub(y));
    if width < MIN_WINDOW_WIDTH || height < MIN_WINDOW_HEIGHT {
        return Err("Company of Heroes window is too small to capture".into());
    }

    Ok(DynamicImage::ImageRgba8(screenshot)
        .crop(x, y, width, height)
        .to_rgba8())
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
