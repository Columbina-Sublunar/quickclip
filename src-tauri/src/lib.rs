use std::fs;
use std::path::Path;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
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

#[tauri::command]
async fn export_backup(path: String, data: String, files: Vec<(String, String)>) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let backup_dir = Path::new(&path).join(format!("quickclip_backup_{}", timestamp));
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    fs::write(backup_dir.join("data.json"), &data).map_err(|e| e.to_string())?;

    let files_dir = backup_dir.join("files");
    fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;

    for (source, dest_name) in &files {
        let dest = files_dir.join(dest_name);
        fs::copy(source, &dest).map_err(|e| format!("Failed to copy {}: {}", source, e))?;
    }

    Ok(backup_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn read_backup_json(path: String) -> Result<String, String> {
    let data_path = Path::new(&path).join("data.json");
    fs::read_to_string(&data_path).map_err(|e| e.to_string())
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
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .invoke_handler(tauri::generate_handler![
            copy_file_to_storage,
            export_backup,
            read_backup_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
