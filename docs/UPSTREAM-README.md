# Tetris Battle

<!-- Version Badges -->
![Frontend](https://img.shields.io/badge/Frontend-v3.16.0-00DC82?logo=nuxt.js&logoColor=white)
![Android Server](https://img.shields.io/badge/Android_Server-v1.3.0-3DDC84?logo=android&logoColor=white)

<!-- Tech Stack Badges -->
![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Go](https://img.shields.io/badge/Go-1.21-00ADD8?logo=go&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa)

**🚧 Status: Migrating to TypeScript/Web Client 🚧**

This project is currently being migrated from a C++/Raylib desktop application to a modern **Nuxt.js Web Application (PWA)** for better accessibility and cross-platform support.

## 🌟 New Nuxt.js Client (Recommended)

Please proceed to the `client-nuxt` directory for the latest version.

- **Directory:** [`/client-nuxt`](./client-nuxt)
- **Tech Stack:** Nuxt.js, TypeScript, HTML5 Canvas
- **Setup:**
  ```bash
  cd client-nuxt
  npm install
  npm run dev
  ```

## 📱 Android Server App

A native Android application that hosts the game server for local multiplayer matches.

- **Directory:** [`/android-server`](./android-server)
- **Tech Stack:** Kotlin, Android SDK, Java-WebSocket
- **Features:** 
  - Portable Game Server
  - Real-time IP Display
  - Connection Logging
  - One-tap Start/Stop
- **Setup:** Open `android-server` in Android Studio and run.

### 🍎 Mac Simulation (Local Dev)
If you want to test the full stack (Go Server + Nuxt Client) locally without an Android device:
```bash
make dev
```
This script rebuilds the frontend, copies assets, and starts a local Go server simulating the Android environment on `http://localhost:8080`.

**Run Server Only (Manual):**
If you only want to run the Go server (without rebuilding the frontend):
```bash
go run cmd/mac-sim/main.go
```

### Features

| Mode | Description |
|------|-------------|
| 🎯 **Solo** | Classic Tetris gameplay |
| ✨ **Special** | Cascade gravity with chain reactions + visual effects |
| 🎮 **Duo** | Local 2-player mode |
| 📡 **LAN** | Local Network Multiplayer (Android Server / Mac Sim) |
| 🌐 **Online** | *Waiting for Server Deployment* 🚧 |

### Special Mode Features
- **Cascade Gravity** - Blocks fall individually (Puyo-style)
- **Chain Reactions** - Combos give bonus points
- **5 Visual Effects** - Explosion, Sparkle, Wave, Shatter, Classic
- **Hold Piece** - Press `C` to swap (Special mode only)

### Controls
| Key | Action |
|-----|--------|
| ← → | Move |
| ↑ | Rotate |
| ↓ | Soft Drop |
| Space | Hard Drop |
| C | Hold (Special) |
| P | Pause |
| 👻 Button | Toggle Ghost |
| 🏠 Exit | Back to Menu |

### Mobile Controls
- **Swipe Left/Right** - Move
- **Swipe Down** - Hard Drop
- **Swipe Up** - Hold
- **Tap** - Rotate
- **Long Press** - Soft Drop

---

## 📡 LAN Mode Guide (Multiplayer)

LAN Mode ช่วยให้คุณเล่นกับเพื่อนผ่านเครือข่าย Local โดยใช้ **Android Server App** หรือ **Mac/PC Simulation** เป็น Server กลาง

### 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    GAME SERVER                          │
│  (Android App / Mac Simulation / Go Server)             │
│                  IP: 192.168.x.x:8080                   │
└─────────────────────────────────────────────────────────┘
                    ▲               ▲
          WebSocket │               │ WebSocket
                    │               │
             ┌──────┴───┐     ┌─────┴─────┐
             │ Player 1 │     │ Player 2  │
             │  (HOST)  │     │  (GUEST)  │
             └──────────┘     └───────────┘
```

### 🔧 Prerequisites

1. **Server** - หนึ่งในตัวเลือกต่อไปนี้:
   - 📱 **Android Server App** - ติดตั้งจาก `/android-server`
   - 💻 **Mac Simulation** - รัน `make dev` หรือ `go run cmd/mac-sim/main.go`

2. **Clients** - เปิด Web Browser (Chrome/Safari/Edge) แล้วไปที่ `http://<SERVER_IP>:8080`

---

### 🔗 Connection Scenarios

#### 📌 Scenario 1: PC ↔ PC (Same WiFi)

เหมาะสำหรับการทดสอบบน LAN เดียวกัน

```
[PC - Server]                    [PC - Client]
     │                                 │
     └───── Same WiFi Network ─────────┘
           (192.168.1.x)
```

**ขั้นตอน:**
1. **PC1 (Server):** รัน `make dev` → Server จะแสดง IP (เช่น `192.168.1.100:8080`)
2. **PC2 (Client):** เปิด Browser → `http://192.168.1.100:8080`
3. ทั้งคู่เลือก **LAN Mode** → ใส่ชื่อ → **Join Game**

---

#### 📌 Scenario 2: PC → Mobile (PC เป็น Server)

PC รัน Server, Mobile เชื่อมต่อเข้ามา

```
[PC - Server (Host)]
   192.168.1.100:8080
          │
          ▼
[Mobile - Client via WiFi]
```

**ขั้นตอน:**
1. **PC:** รัน `make dev` หรือ `go run cmd/mac-sim/main.go`
2. **PC:** ตรวจสอบ IP ของ PC (ใช้ `ipconfig` บน Windows หรือ `ifconfig` บน Mac)
3. **Mobile:** เชื่อมต่อ **WiFi เดียวกัน** กับ PC
4. **Mobile:** เปิด Browser → `http://<PC_IP>:8080` (เช่น `http://192.168.1.100:8080`)
5. ทั้งคู่เลือก **LAN Mode** → **Join Game**

---

#### 📌 Scenario 3: Mobile → PC (Mobile เป็น Server ผ่าน Android App)

Android เปิด Server, PC เชื่อมต่อเข้ามา

```
[Android - Server App]
   192.168.1.50:8080
          │
          ▼
[PC - Client via WiFi]
```

**ขั้นตอน:**
1. **Android:** เปิด **Tetris Battle Server** app → กด **Start**
2. **Android:** App จะแสดง IP Address (เช่น `192.168.1.50`)
3. **PC:** เปิด Browser → `http://192.168.1.50:8080`
4. ทั้งคู่เลือก **LAN Mode** → **Join Game**

---

#### 📌 Scenario 4: Mobile ↔ Mobile (Same WiFi)

เล่น 2 มือถือบน WiFi เดียวกัน

```
[Mobile 1 - Server (Android App)]
        192.168.1.50:8080
               │
               ▼
[Mobile 2 - Client (Browser)]
```

**ขั้นตอน:**
1. **Mobile 1 (Android):** เปิด Server App → กด **Start** → ดู IP
2. **Mobile 2:** เชื่อมต่อ **WiFi เดียวกัน**
3. **Mobile 2:** เปิด Browser → `http://<Mobile1_IP>:8080`
4. ทั้งคู่เลือก **LAN Mode** → **Join Game**

---

#### 📌 Scenario 5: Mobile Hotspot (ไม่มี WiFi Router)

ใช้ Hotspot ของมือถือเครื่องหนึ่งแทน Router

```
┌───────────────────────────────────┐
│  [Mobile 1 - Hotspot + Server]    │
│  ┌────────────────────────────┐   │
│  │ Hotspot: "MyHotspot"       │   │
│  │ Server IP: 192.168.43.1    │   │
│  └────────────────────────────┘   │
└───────────────────────────────────┘
               │
               ▼
[Mobile 2 / PC - Connects to Hotspot]
```

**ขั้นตอน:**
1. **Mobile 1:** เปิด **Hotspot** (ปกติจะได้ IP `192.168.43.1`)
2. **Mobile 1:** เปิด **Tetris Battle Server** app → กด **Start**
3. **Mobile 2 / PC:** เชื่อมต่อ WiFi ไปที่ Hotspot ของ Mobile 1
4. **Mobile 2 / PC:** เปิด Browser → `http://192.168.43.1:8080`
5. ทั้งคู่เลือก **LAN Mode** → **Join Game**

> 💡 **Tip:** IP ของ Hotspot มักจะเป็น `192.168.43.1` บน Android หรือ `172.20.10.1` บน iPhone

---

### 🎮 Host vs Guest

| Role | คำอธิบาย |
|------|----------|
| 👑 **Host** | ผู้เล่นคนแรกที่ Join → ตั้งค่า Game Settings ได้ (Attack, Ghost, Cascade, **Hold Piece**) |
| 👤 **Guest** | ผู้เล่นคนที่สอง → Settings จะ Sync มาจาก Host |

---

### ⚠️ Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|--------|
| เชื่อมต่อไม่ได้ | ตรวจสอบว่าอยู่ในเครือข่ายเดียวกัน (Same WiFi/Hotspot) |
| หน้าจอขาวหรือ Error | ตรวจสอบว่า Server กำลังรันอยู่ ลอง Refresh หน้า |
| IP ไม่ถูกต้อง | ใช้ปุ่ม **Use Browser URL** ใน Join Game popup |
| Firewall บล็อก | ปิด Firewall ชั่วคราว หรืออนุญาต Port 8080 |

---

# Legacy C++ Version (Raylib)

*The documentation below applies to the original C++ implementation.*

A modern Tetris game built with Raylib, featuring single-player, local two-player, and online two-player modes. Compete against friends locally or online to see who can clear lines faster and survive longer!

## Features

*   **Single-Player Mode:** Enjoy the classic Tetris experience, focusing on high scores and endless play.
*   **Local Two-Player Mode:** Challenge a friend on the same machine in a head-to-head battle.
    *   Player 1 uses Arrow Keys, Player 2 uses WASD.
    *   Separate boards, scores, and next piece previews.
    *   First player to reach Game Over loses; the other player wins.
*   **Online Two-Player Mode (Network):** Play against friends over a local network or the internet.
    *   **Host Game:** Start a server and share your IP address with an opponent.
    *   **Join Game:** Connect to a host's IP address to challenge them.
    *   Real-time synchronization of game state (board, score, next piece) and player actions.
    *   Automatic winner detection and game-over handling.
*   **Player Name Customization:**
    *   Enter your name on the title screen, which is saved for future sessions.
    *   Change your name anytime from the in-game UI.
*   **Enhanced Controls:**
    *   **Delayed Auto Shift (DAS):** Smooth and responsive horizontal movement for a competitive edge.
    *   **Soft Drop Safety:** Prevents accidental soft dropping of a newly spawned piece if the 'down' key is held.
    *   **On-Screen Keyboard (OSK):** Convenient for name and IP address input, especially on touch devices or Web builds.
*   **Intuitive UI/UX:**
    *   Clear mode selection and network setup screens.
    *   Pause functionality.
    *   Comprehensive Game Over screen displaying winner and scores for all modes.
    *   Dynamic UI elements for two-player layouts.
*   **Cross-Platform:** Powered by Raylib, allowing for easy compilation and execution on various platforms (Windows, Linux, macOS, WebAssembly).

## How to Play

### Getting Started

1.  **Launch the Game:** Upon launching, you'll be prompted to enter your player name. This name will be saved for future sessions.
2.  **Mode Selection:** After entering your name, choose your desired game mode:
    *   `1 Player`: Classic single-player Tetris.
    *   `2 Player (Local)`: Two players on the same computer.
    *   `2 Player (Online)`: Network multiplayer (Host or Join).

### Controls

#### Player 1 (Keyboard & Touch)

*   **Move Left:** `Left Arrow` / On-screen `<` button
*   **Move Right:** `Right Arrow` / On-screen `>` button
*   **Rotate Piece:** `Up Arrow` or `Spacebar` / On-screen `^` button
*   **Soft Drop (continuous):** `Down Arrow` / On-screen `v` button
*   **Restart Game / Disconnect (Network):** `R` key / On-screen "Restart" button
*   **Pause / Unpause Game:** `P` key / On-screen "Pause" button
*   **Change Name (Return to Title Screen):** `N` key / On-screen "Change Name" button

#### Player 2 (Keyboard - Local Multiplayer Only)

*   **Move Left:** `A` key
*   **Move Right:** `D` key
*   **Rotate Piece:** `W` key
*   **Soft Drop (continuous):** `S` key

### Online Multiplayer Instructions

To play online, one player must **Host** the game, and the other must **Join**.

#### Hosting a Game

1.  From the "Mode Selection" screen, choose "2 Player (Online)".
2.  Select "Host Game".
3.  The game will display your local IP address (e.g., `192.168.1.100:12345`). **You need to share this IP address with your friend.**
    *   _Note:_ The displayed IP might initially be `127.0.0.1` (loopback). For actual network play, your friend will need your local network IP (e.g., `192.168.x.x`) or external IP if playing over the internet.
4.  Once your friend successfully connects, the "Start Online" button will become active. Click it to begin the game!

#### Joining a Game

1.  From the "Mode Selection" screen, choose "2 Player (Online)".
2.  Select "Join Game".
3.  Enter the host's IP address (e.g., `192.168.1.100`) into the input field. The default port (`:12345` for desktop, `:12346` for Web) will be appended automatically.
    *   Use the on-screen keyboard or your physical keyboard for input.
4.  Click "Connect" (or press `Enter`).
5.  Wait for the host to start the game.

#### Important Network Notes

*   **Firewall/Port Forwarding:** If playing over the internet, the host might need to configure their router for port forwarding. The default port is `12345` for desktop applications and `12346` for Web/WebSocket builds.
*   **IP Address:** For local network play, ensure you're using the host's actual local network IP (e.g., `192.168.x.x`). For internet play, a public IP or a service like Hamachi/ZeroTier might be needed.
*   **Connection Errors:** If a connection fails or is lost, an error message will be displayed, and you'll be prompted to retry.

## Building and Running

This project uses Raylib and CMake.

### Dependencies

*   **Raylib:** A simple and easy-to-use library to enjoy videogames programming.
    *   Ensure Raylib is installed on your system or configured for your build environment.

### Build Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/oatrice/Tetris-Battle.git
    cd Tetris-Battle
    ```
2.  **Create a Build Directory:**
    ```bash
    mkdir build
    cd build
    ```
3.  **Configure CMake:**
    ```bash
    cmake ..
    ```
    _For Emscripten (WebAssembly) builds, you might use:_
    ```bash
    emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_WEB=ON
    ```
4.  **Build the Project:**
    ```bash
    cmake --build .
    ```
    _For Emscripten builds:_
    ```bash
    emmake make
    ```
5.  **Run the Game:**
    ```bash
    ./client/tetris_battle_client
    ```
    _For Emscripten, you'll get `tetris_battle_client.html`, `tetris_battle_client.js`, `tetris_battle_client.wasm` in the `client` directory. You can serve them with a simple web server (e.g., `python3 -m http.server`)._

---