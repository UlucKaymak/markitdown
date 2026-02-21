use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::{Emitter, Manager, AppHandle, WebviewUrl, WebviewWindowBuilder, State, RunEvent};
use std::sync::Mutex;

struct PendingFile(Mutex<Option<String>>);

#[tauri::command]
fn frontend_ready(handle: AppHandle, state: State<'_, PendingFile>) {
    let mut pending = state.0.lock().unwrap();
    if let Some(path) = pending.take() {
        println!("[Rust] Hazır sinyali. Bekleyen dosya iletiliyor: {}", path);
        let _ = handle.emit("open-file-path", path);
    }
}

fn handle_file_path(app: &AppHandle, path: String) {
    println!("[CRITICAL] Dosya Yakalandı: {}", path);
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.emit("open-file-path", &path);
        let _ = main_win.set_focus();
    } else {
        let state = app.state::<PendingFile>();
        *state.0.lock().unwrap() = Some(path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(PendingFile(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            println!("[SingleInstance] Olay tetiklendi! Argümanlar: {:?}", args);
            // Windows/Linux'ta uygulama açıkken yeni bir dosya açıldığında
            for arg in args.iter().skip(1) {
                if std::path::Path::new(arg).exists() && (arg.ends_with(".md") || arg.ends_with(".markdown") || arg.ends_with(".txt")) {
                    handle_file_path(app, arg.clone());
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![frontend_ready])
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Ana pencereyi oluştur
            let _main_win = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("markitdown")
                .inner_size(960.0, 540.0)
                .build()?;

            // İlk açılış argümanlarını kontrol et (Windows/Linux için)
            let args: Vec<String> = std::env::args().collect();
            for arg in args.iter().skip(1) {
                if std::path::Path::new(arg).exists() && (arg.ends_with(".md") || arg.ends_with(".markdown") || arg.ends_with(".txt")) {
                    handle_file_path(&handle, arg.clone());
                    break;
                }
            }

            // Menü Item'lar...
            let new_i = MenuItem::with_id(&handle, "new", "New", true, Some("CmdOrCtrl+N"))?;
            let open_i = MenuItem::with_id(&handle, "open", "Open...", true, Some("CmdOrCtrl+O"))?;
            let save_i = MenuItem::with_id(&handle, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let save_as_i = MenuItem::with_id(&handle, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?;
            let quit_i = MenuItem::with_id(&handle, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;
            let devtools_i = MenuItem::with_id(&handle, "devtools", "Toggle Developer Tools", true, Some("CmdOrCtrl+Option+I"))?;

            let app_menu = Submenu::with_items(&handle, "App", true, &[
                &PredefinedMenuItem::about(&handle, None, None)?,
                &PredefinedMenuItem::separator(&handle)?,
                &PredefinedMenuItem::services(&handle, None)?,
                &PredefinedMenuItem::separator(&handle)?,
                &PredefinedMenuItem::hide(&handle, None)?,
                &PredefinedMenuItem::hide_others(&handle, None)?,
                &PredefinedMenuItem::show_all(&handle, None)?,
                &PredefinedMenuItem::separator(&handle)?,
                &quit_i,
            ])?;

            let file_menu = Submenu::with_items(&handle, "File", true, &[&new_i, &open_i, &PredefinedMenuItem::separator(&handle)?, &save_i, &save_as_i])?;
            let edit_menu = Submenu::with_items(&handle, "Edit", true, &[&PredefinedMenuItem::undo(&handle, None)?, &PredefinedMenuItem::redo(&handle, None)?, &PredefinedMenuItem::separator(&handle)?, &PredefinedMenuItem::cut(&handle, None)?, &PredefinedMenuItem::copy(&handle, None)?, &PredefinedMenuItem::paste(&handle, None)?, &PredefinedMenuItem::select_all(&handle, None)?])?;
            let window_menu = Submenu::with_items(&handle, "Window", true, &[
                &PredefinedMenuItem::minimize(&handle, None)?,
                &PredefinedMenuItem::maximize(&handle, None)?,
                &PredefinedMenuItem::separator(&handle)?,
                &devtools_i,
                &PredefinedMenuItem::separator(&handle)?,
                &PredefinedMenuItem::close_window(&handle, None)?,
            ])?;

            let menu = Menu::with_items(&handle, &[&app_menu, &file_menu, &edit_menu, &window_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app: &AppHandle, event: tauri::menu::MenuEvent| {
                match event.id().as_ref() {
                    "new" => { let _ = app.emit("menu-new", ()); }
                    "open" => { let _ = app.emit("menu-open", ()); }
                    "save" => { let _ = app.emit("menu-save", ()); }
                    "save_as" => { let _ = app.emit("menu-save-as", ()); }
                    "quit" => { app.exit(0); }
                    "devtools" => {
                        for window in app.webview_windows().values() {
                            if window.is_focused().unwrap_or(false) {
                                let _ = window.open_devtools();
                            }
                        }
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|handle, event| {
        // macOS Apple Olayları
        if let RunEvent::Opened { urls } = event {
            for url in urls {
                if url.scheme() == "file" {
                    if let Ok(path) = url.to_file_path() {
                        handle_file_path(handle, path.to_string_lossy().to_string());
                    }
                }
            }
        }
    });
}
