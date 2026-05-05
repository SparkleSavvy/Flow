<p align="center">
  <img src="logo.svg" alt="Flow Logo" width="120" height="120">
</p>

<h1 align="center">Flow</h1>

<p align="center">
  <strong>The most elegant, fluid, and powerful YouTube downloader.</strong><br>
  Built with Electron, <code>yt-dlp</code>, and <code>FFmpeg</code>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-050608?style=flat-square&logo=appveyor&color=87CEEB" alt="Platform">
  <img src="https://img.shields.io/badge/Engine-Electron%20%2B%20Node.js-050608?style=flat-square&color=87CEEB" alt="Engine">
  <img src="https://img.shields.io/badge/UI-Glassmorphism-050608?style=flat-square&color=87CEEB" alt="UI">
  <img src="https://img.shields.io/badge/License-MIT-050608?style=flat-square&color=87CEEB" alt="License">
</p>

<hr>

## ✨ The Aesthetic

Flow is not just a utility; it's a visual experience. Designed with a **Dark Glassmorphism** UI, ambient fluid background animations, and striking **Sky Blue (`#87CEEB`)** accents. Every interaction features butter-smooth transitions, rounded pill-shaped elements, and a clean, clutter-free layout.

> *a screenshot of beautiful app here!*  

---

## 🚀 Key Features

*   💧 **Fluid UI:** Semi-transparent panels, animated gradients, and native-feeling modal windows.
*   ⚡ **Maximum Speed:** Acts as a lightweight GUI that directly commands your OS's native `yt-dlp` and `FFmpeg` binaries. No bloat, no artificial limits.
*   🎬 **Instant Preview:** Automatically fetches and displays the video thumbnail, exact title, and duration before downloading.
*   🎵 **Format Control:** Seamlessly choose between MP4 Video (Auto Best, 1080p, 720p) or MP3 Audio.
*   🛡️ **Bypass Restrictions (Cookies):** Built-in support for `cookies.txt`. Download age-restricted (18+), members-only, or strictly protected videos without `403 Forbidden` errors.
*   🕒 **Visual History:** A beautifully designed history panel keeps track of your past downloads with their cover art.
*   ⚙️ **Easy Settings:** Change your default download directory and manage authentication files on the fly.

---

## 🛠️ Prerequisites

Because Flow runs natively and lightly, it relies on your system's environment variables. You **must** have the following installed and added to your system's `PATH`:

1.  **[Node.js](https://nodejs.org/)** (v16 or higher)
2.  **[yt-dlp](https://github.com/yt-dlp/yt-dlp/releases)** (The core downloading engine)
3.  **[FFmpeg](https://ffmpeg.org/download.html)** (Required for merging video/audio and converting to MP3)

*To verify your setup, open your terminal/command prompt and type `yt-dlp --version` and `ffmpeg -version`. If both return a version number, you are ready to Flow.*

---

## 📦 Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SparkleSavvy/flow.git
   cd flow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

---

## 🍪 How to bypass YouTube Blocks (403 Errors)

YouTube frequently blocks bots. To download restricted videos:
1. Open your standard web browser and log into YouTube.
2. Use an extension like **"Get cookies.txt LOCALLY"** to export your current session cookies as a `.txt` file.
3. Open **Flow** -> Click the **Settings (⚙️)** icon -> Under *Authentication File*, click **Select** and choose your `cookies.txt`.
4. Flow will now act as your authenticated browser.

---

## 🏗️ Tech Stack

*   **Frontend:** Vanilla HTML, CSS (Custom Fluid Glassmorphism Design), JavaScript.
*   **Backend:** Electron, Node.js (`child_process`, `fs`, `path`).
*   **Core Logic:** Zero heavy C++ wrappers. Relies on the asynchronous speed of the V8 Engine and native OS execution for optimal performance without bugs.

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details. 

<br>
<p align="center">
  <i>Let the media flow seamlessly.</i>
</p>
