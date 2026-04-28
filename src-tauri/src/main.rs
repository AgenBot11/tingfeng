
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Child};
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use tauri::{State, Manager};

struct VpnState {
    pub child: Mutex<Option<Child>>,
    pub connected: Mutex<bool>,
}

#[tauri::command]
fn check_openvpn_installed() -> bool {
    Command::new("openvpn").arg("--version").output().is_ok()
}

#[tauri::command]
fn connect_vpn(config_b64: String, state: State<VpnState>) -> Result<String, String> {
    // 1. 解码 Base64 配置
    let config_data = base64::decode(&config_b64).map_err(|e| e.to_string())?;
    
    // 2. 写入临时目录
    let temp_dir = std::env::temp_dir();
    let config_path = temp_dir.join("tfvpn_config.ovpn");
    fs::write(&config_path, config_data).map_err(|e| format!("Write config failed: {}", e))?;
    
    // 3. 写入认证文件 (VPNGate 默认 vpn/vpn)
    let auth_path = temp_dir.join("tfvpn_auth.txt");
    fs::write(&auth_path, "vpn\nvpn\n").map_err(|e| format!("Write auth failed: {}", e))?;
    
    // 4. 启动 OpenVPN
    let mut child = Command::new("openvpn")
        .arg("--config")
        .arg(&config_path)
        .arg("--auth-user-pass")
        .arg(&auth_path)
        .spawn()
        .map_err(|e| format!("OpenVPN start failed: {}", e))?;
    
    *state.connected.lock().unwrap() = true;
    *state.child.lock().unwrap() = Some(child);
    Ok("Connecting...".to_string())
}

#[tauri::command]
fn disconnect_vpn(state: State<VpnState>) -> Result<String, String> {
    if let Some(mut child) = state.child.lock().unwrap().take() {
        child.kill().map_err(|e| e.to_string())?;
        child.wait().map_err(|e| e.to_string())?;
    }
    *state.connected.lock().unwrap() = false;
    Ok("Disconnected".to_string())
}

#[tauri::command]
fn get_connection_status(state: State<VpnState>) -> bool {
    *state.connected.lock().unwrap()
}

fn main() {
    tauri::Builder::default()
        .manage(VpnState {
            child: Mutex::new(None),
            connected: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            check_openvpn_installed,
            connect_vpn,
            disconnect_vpn,
            get_connection_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

