use std::fs;
use std::path::Path;
use tauri::Manager;
use uuid::Uuid;

#[tauri::command]
async fn copy_file_to_storage(app: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let files_dir = app_data_dir.join("files");
    fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;

    let filename = Path::new(&source_path)
        .file_name()
        .ok_or("Invalid file path")?
        .to_str()
        .ok_or("Invalid filename")?;

    let uuid = Uuid::new_v4();
    let dest = files_dir.join(format!("{}_{}", uuid, filename));
    fs::copy(&source_path, &dest).map_err(|e| e.to_string())?;

    Ok(dest.to_str().ok_or("Invalid dest path")?.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![copy_file_to_storage])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
