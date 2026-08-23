use tauri::{
	menu::{MenuBuilder, MenuItemBuilder},
	AppHandle, Emitter, Manager, Runtime, WebviewWindow,
};

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
	app.get_webview_window("main")
}

pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
	if let Some(window) = main_window(app) {
		let _ = window.unminimize();
		let _ = window.show();
		let _ = window.set_focus();
	}
}

pub fn toggle_main<R: Runtime>(app: &AppHandle<R>) {
	if let Some(window) = main_window(app) {
		match window.is_visible() {
			Ok(true) => {
				let _ = window.hide();
			}
			_ => show_main(app),
		}
	}
}

pub fn emit_quit<R: Runtime>(app: &AppHandle<R>) {
	let _ = app.emit("tray-quit", ());
	let app = app.clone();
	std::thread::spawn(move || {
		std::thread::sleep(std::time::Duration::from_millis(2500));
		app.exit(0);
	});
}

pub fn attach_menu(app: &mut tauri::App) -> tauri::Result<()> {
	let show = MenuItemBuilder::with_id("tray-show", "Show").build(app)?;
	let quit = MenuItemBuilder::with_id("tray-quit", "Quit").build(app)?;
	let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

	if let Some(tray) = app.tray_by_id("main") {
		tray.set_menu(Some(menu))?;
		let _ = tray.set_show_menu_on_left_click(false);
	}

	Ok(())
}
