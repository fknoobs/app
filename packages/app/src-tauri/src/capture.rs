use serde::Serialize;
use std::sync::mpsc;
use std::time::Duration;

const MAX_WIDTH: u32 = 1920;
const JPEG_QUALITY: u8 = 70;
const MIN_WINDOW_WIDTH: u32 = 400;
const MIN_WINDOW_HEIGHT: u32 = 300;
const CAPTURE_TIMEOUT: Duration = Duration::from_secs(4);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameWindowCapture {
    pub jpeg_base64: String,
    pub width: u32,
    pub height: u32,
}

/// Captures the Company of Heroes window via Windows Graphics Capture.
/// Never injects Print Screen and never captures the desktop monitor.
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

    let coh_pid = relic_coh_pid().ok_or_else(|| "Company of Heroes is not running".to_string())?;
    ensure_coh_foreground(coh_pid)?;

    let window = pick_coh_window(coh_pid)?;
    let rgba = capture_window_frame(window)?;
    if is_blank_frame(&rgba) {
        return Err("Company of Heroes capture was blank".into());
    }
    ensure_coh_foreground(coh_pid)?;

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
struct OneFrame {
    tx: Option<mpsc::Sender<Result<image::RgbaImage, String>>>,
}

#[cfg(windows)]
impl windows_capture::capture::GraphicsCaptureApiHandler for OneFrame {
    type Flags = mpsc::Sender<Result<image::RgbaImage, String>>;
    type Error = String;

    fn new(ctx: windows_capture::capture::Context<Self::Flags>) -> Result<Self, Self::Error> {
        Ok(Self {
            tx: Some(ctx.flags),
        })
    }

    fn on_frame_arrived(
        &mut self,
        frame: &mut windows_capture::frame::Frame,
        capture_control: windows_capture::graphics_capture_api::InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        let result = frame_to_rgba(frame);
        if let Some(tx) = self.tx.take() {
            let _ = tx.send(result);
        }
        capture_control.stop();
        Ok(())
    }
}

#[cfg(windows)]
fn frame_to_rgba(frame: &mut windows_capture::frame::Frame) -> Result<image::RgbaImage, String> {
    let buffer = frame.buffer().map_err(|error| error.to_string())?;
    let width = buffer.width();
    let height = buffer.height();
    let mut unpacked = Vec::new();
    let pixels = buffer.as_nopadding_buffer(&mut unpacked).to_vec();
    image::RgbaImage::from_raw(width, height, pixels)
        .ok_or_else(|| "Company of Heroes capture buffer was invalid".into())
}

#[cfg(windows)]
fn capture_window_frame(
    window: windows_capture::window::Window,
) -> Result<image::RgbaImage, String> {
    match capture_window_frame_with(window, windows_capture::settings::SecondaryWindowSettings::Exclude)
    {
        Ok(image) => Ok(image),
        Err(error) if error.to_ascii_lowercase().contains("secondary") => {
            capture_window_frame_with(
                window,
                windows_capture::settings::SecondaryWindowSettings::Default,
            )
        }
        Err(error) => Err(error),
    }
}

#[cfg(windows)]
fn capture_window_frame_with(
    window: windows_capture::window::Window,
    secondary: windows_capture::settings::SecondaryWindowSettings,
) -> Result<image::RgbaImage, String> {
    use windows_capture::capture::GraphicsCaptureApiHandler;
    use windows_capture::settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, Settings,
    };

    let (tx, rx) = mpsc::channel();
    let settings = Settings::new(
        window,
        CursorCaptureSettings::WithoutCursor,
        DrawBorderSettings::WithoutBorder,
        secondary,
        MinimumUpdateIntervalSettings::Default,
        DirtyRegionSettings::Default,
        ColorFormat::Rgba8,
        tx,
    );
    let control = OneFrame::start_free_threaded(settings).map_err(|error| error.to_string())?;
    match rx.recv_timeout(CAPTURE_TIMEOUT) {
        Ok(result) => {
            let _ = control.stop();
            result
        }
        Err(_) => {
            let _ = control.stop();
            Err("Game window capture timed out".into())
        }
    }
}

#[cfg(windows)]
fn pick_coh_window(coh_pid: u32) -> Result<windows_capture::window::Window, String> {
    use windows_capture::window::Window;

    let windows = Window::enumerate().map_err(|error| error.to_string())?;
    let mut best: Option<(u64, Window)> = None;
    for window in windows {
        if window.process_id().ok() != Some(coh_pid) {
            continue;
        }
        if !window.is_valid() {
            continue;
        }
        let width = window.width().unwrap_or(0).max(0) as u32;
        let height = window.height().unwrap_or(0).max(0) as u32;
        if width < MIN_WINDOW_WIDTH || height < MIN_WINDOW_HEIGHT {
            continue;
        }
        let area = u64::from(width) * u64::from(height);
        if best.as_ref().is_none_or(|(best_area, _)| area > *best_area) {
            best = Some((area, window));
        }
    }

    best.map(|(_, window)| window)
        .ok_or_else(|| "Company of Heroes window not found".to_string())
}

/// GDI/engine blank frames are uniformly black. Real CoH shots still have
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
fn foreground_pid() -> Option<u32> {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0 == 0 {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        (pid != 0).then_some(pid)
    }
}

#[cfg(windows)]
fn ensure_coh_foreground(coh_pid: u32) -> Result<(), String> {
    if foreground_pid() == Some(coh_pid) {
        Ok(())
    } else {
        Err("Company of Heroes is not in the foreground".into())
    }
}
