
# 🍃 听风 (TingFeng)

> **连接，本该纯粹。**
> 基于 VPNGate 开源网络构建的现代、安全、免费的桌面加速客户端。

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Tauri](https://img.shields.io/badge/Powered%20by-Tauri-24C8DB)](https://tauri.app/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Backend-Rust-DEA584)](https://www.rust-lang.org/)

---

## ✨ 特性

-   **🚀 真实延迟测速**：拒绝云端虚假数据。听风直接在用户本机发起连接测试，所见即所得。
-   **📱 跨端无缝流转**：一键生成 OpenVPN 配置二维码。手机打开 Shadowrocket 扫码，秒速同步连接。
-   **🛡️ 安全透明**：完全开源 (MIT 协议)，无广告、无挖矿、无隐私追踪。基于成熟的 OpenVPN 协议。
-   **⚡️ 极致轻量**：基于 Tauri 构建，安装包仅约 5MB，内存占用极低。

## 📜 项目由来

**听风 (TingFeng)** 并非创造新的网络，而是为了改善用户体验而生的"桥梁"。

我们依托于日本筑波大学运营的 [VPNGate 公开项目](https://www.vpngate.net)。鉴于官方网页版交互简陋、缺乏移动端适配且部分地区访问受限，听风应运而生。

它旨在通过现代化的桌面 UI 和本地测速引擎，为普通用户提供一个更直观、更快速的网络接入入口。

## ⚙️ 工作原理

1.  **数据桥接**：听风不存储任何节点。它通过 API 实时抓取 VPNGate 的全球公开数据，过滤掉低质量节点。
2.  **本地测速**：摒弃云端虚假数据，听风在用户本机发起 TCP 握手测试，确保显示的延迟是真实的。
3.  **协议连接**：核心基于 **OpenVPN** 协议。客户端自动解密配置并建立加密隧道。

## 📦 构建指南

如果你希望自行编译，请按照以下步骤操作：

### 前置要求

-   **Node.js** (v16 或更高)
-   **Rust** (最新稳定版，通过 [rustup](https://rustup.rs/) 安装)
-   **Windows 10/11 SDK** (如果是 Windows 环境)

### 开始构建

```bash
# 1. 克隆仓库
git clone https://github.com/AgenBot11/tingfeng.git
cd tingfeng

# 2. 安装前端依赖
npm install

# 3. 运行开发模式
npm run tauri dev

# 4. 编译发布版本 (Release)
npm run tauri build
```

编译完成后，可执行文件将位于 `src-tauri/target/release` 目录下。

## 📱 手机如何使用？

听风 目前是一个 **Windows 桌面客户端**。要在手机上使用连接，请遵循以下步骤：

1. 在电脑上打开听风，找到你想连接的节点（如 日本）。
2. 点击该节点右侧的 **分享图标 (QR Code)**。
3. 在手机上打开 **Shadowrocket** (iOS) 或 **OpenVPN Client** (Android)。
4. 使用应用内的“扫描二维码”功能。
5. 扫描成功后，配置将自动导入，点击连接即可。

## 🤝 贡献与赞助

本项目是开源的。如果你想支持我们：

-   给本项目点一个 **Star** ⭐️
-   提交 Issue 或 Pull Request

> **赞助开发者**: [Buy me a coffee](#) | [爱发电](#)

## ⚠️ 免责声明

- 本项目仅作为技术交流和学习使用。
- 本工具依赖于第三方公开数据源 (VPNGate)。
- 请在您所在的地区法律法规允许的范围内使用本软件。

---

© 2026 听风 Project. Distributed under MIT License.

