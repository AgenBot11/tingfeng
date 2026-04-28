
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::process::Child;
use std::sync::Mutex;
use std::fs;
use sha2::{Sha256, Digest};
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
    let config_data = base64::decode(&config_b64).map_err(|e| e.to_string())?;
    
    let temp_dir = std::env::temp_dir();
    let config_path = temp_dir.join("tfvpn_config.ovpn");
    fs::write(&config_path, config_data).map_err(|e| format!("Write config failed: {}", e))?;
    
    let auth_path = temp_dir.join("tfvpn_auth.txt");
    fs::write(&auth_path, "vpn\nvpn\n").map_err(|e| format!("Write auth failed: {}", e))?;
    
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

#[tauri::command]
fn verify_csv_hash(csv: String, hash: String) -> bool {
    if hash.is_empty() { return true; } // Skip if no hash provided
    let mut hasher = Sha256::new();
    hasher.update(csv.as_bytes());
    let result = hasher.finalize();
    let actual_hash = format!("{:x}", result);
    actual_hash == hash
}

#[tauri::command]
fn ping_host(host: String) -> Result<u64, String> {
    let is_windows = cfg!(windows);
    let count_arg = if is_windows { "-n" } else { "-c" };
    let timeout_arg = if is_windows { "-w" } else { "-W";
    
    let output = Command::new("ping")
        .arg(count_arg).arg("1")
        .arg(timeout_arg).arg("2")
        .arg(&host)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8(output.stdout).unwrap_or_default();
    
    // Parse Windows: "Average = 45ms" or "平均 = 45ms"
    // Parse Linux: "rtt min/avg/max/mdev = .../45.123/.../..."
    if is_windows {
        for line in stdout.lines() {
            if line.contains("Average") || line.contains("平均") {
                let nums: String = line.chars().filter(|c| c.is_ascii_digit()).collect();
                if let Ok(ms) = nums.parse::<u64>() {
                    return Ok(ms);
                }
            }
        }
    } else {
        // Linux ping output: rtt min/avg/max/mdev = 44.837/44.837/44.837/0.000 ms
        if let Some(line) = stdout.lines().find(|l| l.contains("rtt")) {
            let parts: Vec<&str> = line.split('/').collect();
            if parts.len() >= 5 {
                if let Ok(ms) = parts[4].parse::<f64>() {
                    return Ok(ms.round() as u64);
                }
            }
        }
    }
    
    Err("Ping failed".to_string())
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
            get_connection_status,
            verify_csv_hash,
            ping_host
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

