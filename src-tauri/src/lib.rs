use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::{Emitter, Manager, App, AppHandle, WebviewUrl, WebviewWindowBuilder, Listener};
use std::sync::atomic::{AtomicUsize, Ordering};

static WINDOW_COUNT: AtomicUsize = AtomicUsize::new(0);

fn open_file_window(handle: &AppHandle, path: String) {
    let id = WINDOW_COUNT.fetch_add(1, Ordering::Relaxed);
    let label = format!("win-{}", id);
    let url_path = format!("index.html?file={}", urlencoding::encode(&path));
    
    let _ = WebviewWindowBuilder::new(handle, label, WebviewUrl::App(url_path.into()))
        .title("markitdown")
        .inner_size(960.0, 540.0)
        .build();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app: &mut App| {
            let handle = app.handle().clone();

            // Handle CLI arguments (Windows/Linux/macOS startup)
            let args: Vec<String> = std::env::args().collect();
            let mut opened_any = false;

            if args.len() > 1 {
                for arg in args.iter().skip(1) {
                    if std::path::Path::new(arg).exists() && (arg.ends_with(".md") || arg.ends_with(".markdown") || arg.ends_with(".txt")) {
                        if !opened_any {
                            // Use the main window for the first file
                            if let Some(main_win) = app.get_webview_window("main") {
                                let url_path = format!("index.html?file={}", urlencoding::encode(arg));
                                if let Ok(url) = tauri::Url::parse(&format!("tauri://localhost/{}", url_path)) {
                                    let _ = main_win.navigate(url);
                                }
                                opened_any = true;
                            }
                        } else {
                            // Open subsequent files in new windows
                            open_file_window(&handle, arg.clone());
                        }
                    }
                }
            }

            // For macOS, we listen to the system event for opening URLs while running
            let handle_for_url = handle.clone();
            app.listen("tauri://open-url", move |event: tauri::Event| {
                if let Ok(payload) = serde_json::from_str::<Vec<String>>(event.payload()) {
                    for url_str in payload {
                        if let Ok(url) = tauri::Url::parse(&url_str) {
                            if url.scheme() == "file" {
                                if let Ok(path) = url.to_file_path() {
                                    open_file_window(&handle_for_url, path.to_string_lossy().to_string());
                                }
                            }
                        }
                    }
                }
            });

            let new_i = MenuItem::with_id(&handle, "new", "New", true, Some("CmdOrCtrl+N"))?;
            let open_i = MenuItem::with_id(&handle, "open", "Open...", true, Some("CmdOrCtrl+O"))?;
            let save_i = MenuItem::with_id(&handle, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let save_as_i = MenuItem::with_id(&handle, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?;
            let quit_i = MenuItem::with_id(&handle, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

            let app_menu = Submenu::with_items(
                &handle,
                "App",
                true,
                &[
                    &PredefinedMenuItem::about(&handle, None, None)?,
                    &PredefinedMenuItem::separator(&handle)?,
                    &PredefinedMenuItem::services(&handle, None)?,
                    &PredefinedMenuItem::separator(&handle)?,
                    &PredefinedMenuItem::hide(&handle, None)?,
                    &PredefinedMenuItem::hide_others(&handle, None)?,
                    &PredefinedMenuItem::show_all(&handle, None)?,
                    &PredefinedMenuItem::separator(&handle)?,
                    &quit_i,
                ],
            )?;

            let file_menu = Submenu::with_items(
                &handle,
                "File",
                true,
                &[
                    &new_i,
                    &open_i,
                    &PredefinedMenuItem::separator(&handle)?,
                    &save_i,
                    &save_as_i,
                ],
            )?;

            let edit_menu = Submenu::with_items(
                &handle,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(&handle, None)?,
                    &PredefinedMenuItem::redo(&handle, None)?,
                    &PredefinedMenuItem::separator(&handle)?,
                    &PredefinedMenuItem::cut(&handle, None)?,
                    &PredefinedMenuItem::copy(&handle, None)?,
                    &PredefinedMenuItem::paste(&handle, None)?,
                    &PredefinedMenuItem::select_all(&handle, None)?,
                ],
            )?;

            let window_menu = Submenu::with_items(
                &handle,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(&handle, None)?,
                    &PredefinedMenuItem::maximize(&handle, None)?,
                    &PredefinedMenuItem::separator(&handle)?,
                    &PredefinedMenuItem::close_window(&handle, None)?,
                ],
            )?;

            let menu = Menu::with_items(&handle, &[&app_menu, &file_menu, &edit_menu, &window_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app: &AppHandle, event: tauri::menu::MenuEvent| {
                match event.id().as_ref() {
                    "new" => { let _ = app.emit("menu-new", ()); }
                    "open" => { let _ = app.emit("menu-open", ()); }
                    "save" => { let _ = app.emit("menu-save", ()); }
                    "save_as" => { let _ = app.emit("menu-save-as", ()); }
                    "quit" => { app.exit(0); }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
