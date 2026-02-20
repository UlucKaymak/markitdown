use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let handle = app.handle();
            
            let new_i = MenuItem::with_id(handle, "new", "New", true, Some("CmdOrCtrl+N"))?;
            let open_i = MenuItem::with_id(handle, "open", "Open...", true, Some("CmdOrCtrl+O"))?;
            let save_i = MenuItem::with_id(handle, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let save_as_i = MenuItem::with_id(handle, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?;
            let quit_i = MenuItem::with_id(handle, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

            // On macOS, the first menu is the "App Menu" (labeled with the App Name)
            let app_menu = Submenu::with_items(
                handle,
                "App",
                true,
                &[
                    &PredefinedMenuItem::about(handle, None, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::services(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::hide(handle, None)?,
                    &PredefinedMenuItem::hide_others(handle, None)?,
                    &PredefinedMenuItem::show_all(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &quit_i,
                ],
            )?;

            let file_menu = Submenu::with_items(
                handle,
                "File",
                true,
                &[
                    &new_i,
                    &open_i,
                    &PredefinedMenuItem::separator(handle)?,
                    &save_i,
                    &save_as_i,
                ],
            )?;

            let edit_menu = Submenu::with_items(
                handle,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(handle, None)?,
                    &PredefinedMenuItem::redo(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::cut(handle, None)?,
                    &PredefinedMenuItem::copy(handle, None)?,
                    &PredefinedMenuItem::paste(handle, None)?,
                    &PredefinedMenuItem::select_all(handle, None)?,
                ],
            )?;

            let window_menu = Submenu::with_items(
                handle,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(handle, None)?,
                    &PredefinedMenuItem::maximize(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::close_window(handle, None)?,
                ],
            )?;

            let menu = Menu::with_items(handle, &[&app_menu, &file_menu, &edit_menu, &window_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app, event| {
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
