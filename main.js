const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { spawn, exec, execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Пути для хранения данных
const userDataPath = app.getPath('userData');
const historyFile = path.join(userDataPath, 'history.json');
const settingsFile = path.join(userDataPath, 'settings.json');
const binDir = path.join(userDataPath, 'bin');
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

// Базовые настройки
let settings = { downloadFolder: app.getPath('downloads'), cookiesPath: null };
if (fs.existsSync(settingsFile)) settings = JSON.parse(fs.readFileSync(settingsFile));

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1050, height: 750,
        backgroundColor: '#030406',
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

let ytdlpBin = 'yt-dlp';
let ffmpegBin = 'ffmpeg';

const checkSystemCommand = (command) => {
    return new Promise((resolve) => exec(command, (error) => resolve(!error)));
};

function downloadBinary(url, destPath, name) {
    return new Promise((resolve) => {
        if (fs.existsSync(destPath)) return resolve(true);
        if (mainWindow) mainWindow.webContents.send('install-progress', `Загрузка ${name}... Пожалуйста, подождите.`);
        
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return resolve(downloadBinary(response.headers.location, destPath, name));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                fs.chmodSync(destPath, 0o755);
                resolve(true);
            });
        }).on('error', () => {
            fs.unlink(destPath, () => {});
            resolve(false);
        });
    });
}

ipcMain.handle('api-check', async () => {
    const platform = os.platform();
    let ytdlpExists = await checkSystemCommand('yt-dlp --version');
    let ffmpegExists = await checkSystemCommand('ffmpeg -version');

    const ytdlpExt = platform === 'win32' ? '.exe' : '';
    const ffmpegExt = platform === 'win32' ? '.exe' : '';
    const localYtdlp = path.join(binDir, 'yt-dlp' + ytdlpExt);
    const localFfmpeg = path.join(binDir, 'ffmpeg' + ffmpegExt);

    if (!ytdlpExists) {
        let ytUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
        if (platform === 'win32') ytUrl += '.exe';
        else if (platform === 'darwin') ytUrl += '_macos';
        
        ytdlpExists = await downloadBinary(ytUrl, localYtdlp, 'yt-dlp');
        if (ytdlpExists) ytdlpBin = localYtdlp;
    }

    if (!ffmpegExists) {
        let ffUrl = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4/linux-x64';
        if (platform === 'win32') ffUrl = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4/win32-x64';
        else if (platform === 'darwin') ffUrl = os.arch() === 'arm64' ? 'https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4/darwin-arm64' : 'https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4/darwin-x64';
        
        ffmpegExists = await downloadBinary(ffUrl, localFfmpeg, 'FFmpeg');
        if (ffmpegExists) ffmpegBin = localFfmpeg;
    }

    if (mainWindow) mainWindow.webContents.send('install-progress', 'Готово!');
    return { ytdlp: ytdlpExists, ffmpeg: ffmpegExists };
});

// === Безопасное получение превью (с поддержкой Cookies) ===
ipcMain.handle('fetch-metadata', async (event, url) => {
    return new Promise((resolve, reject) => {
        let args = ['--dump-json', url, '--no-playlist'];
        
        if (settings.cookiesPath && fs.existsSync(settings.cookiesPath)) {
            args.push('--cookies', settings.cookiesPath);
        }

        execFile(ytdlpBin, args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error("yt-dlp error:", stderr || error.message);
                reject('Блок от YouTube (403). Добавьте файл Cookies в настройках.');
                return;
            }
            try {
                const data = JSON.parse(stdout);
                resolve({ title: data.title, thumbnail: data.thumbnail, duration: data.duration_string });
            } catch (e) {
                reject('Ошибка чтения данных от yt-dlp.');
            }
        });
    });
});

// === Скачивание видео ===
ipcMain.handle('download-video', async (event, { url, format, quality, subtitles, playlist, title, thumbnail }) => {
    return new Promise((resolve, reject) => {
        let args = ['--newline'];
        
        if (settings.cookiesPath && fs.existsSync(settings.cookiesPath)) {
            args.push('--cookies', settings.cookiesPath);
        }

        if (ffmpegBin !== 'ffmpeg') {
            args.push('--ffmpeg-location', ffmpegBin);
        }

        if (playlist) args.push('--yes-playlist');
        else args.push('--no-playlist');

        if (subtitles) args.push('--write-subs', '--write-auto-subs', '--sub-langs', 'all');

        if (format === 'mp3') {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
        } else {
            let formatStr = 'bestvideo+bestaudio/best';
            if (quality === '2160') formatStr = 'bestvideo[height<=2160]+bestaudio/best';
            else if (quality === '1440') formatStr = 'bestvideo[height<=1440]+bestaudio/best';
            else if (quality === '1080') formatStr = 'bestvideo[height<=1080]+bestaudio/best';
            else if (quality === '720') formatStr = 'bestvideo[height<=720]+bestaudio/best';
            
            args.push('-f', formatStr, '--merge-output-format', format); // mp4 или mkv
        }
        
        const outputPath = path.join(settings.downloadFolder, '%(title)s.%(ext)s');
        args.push('-o', outputPath, url);

        const ytdlProcess = spawn(ytdlpBin, args);

        ytdlProcess.stdout.on('data', (data) => {
            const match = data.toString().match(/\[download\]\s+(\d+\.\d+)%/);
            if (match) event.sender.send('download-progress', parseFloat(match[1]));
        });

        ytdlProcess.on('close', (code) => {
            if (code === 0) {
                let history = [];
                if (fs.existsSync(historyFile)) history = JSON.parse(fs.readFileSync(historyFile));
                history.unshift({ title, url, format, date: new Date().toLocaleString(), thumbnail });
                fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, 50))); 
                resolve('Скачано успешно!');
            } else reject(`Ошибка скачивания (Код ${code})`);
        });
    });
});

// === Настройки (Выбор папки и файла Cookies) ===
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!result.canceled) {
        settings.downloadFolder = result.filePaths[0];
        fs.writeFileSync(settingsFile, JSON.stringify(settings));
        return settings.downloadFolder;
    }
    return null;
});

// Выбор файла Cookies (.txt)
ipcMain.handle('select-cookies', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (!result.canceled) {
        settings.cookiesPath = result.filePaths[0];
        fs.writeFileSync(settingsFile, JSON.stringify(settings));
        return settings.cookiesPath;
    }
    return null;
});

// Удаление куки
ipcMain.handle('clear-cookies', () => {
    settings.cookiesPath = null;
    fs.writeFileSync(settingsFile, JSON.stringify(settings));
    return true;
});

ipcMain.handle('get-settings', () => settings);
ipcMain.handle('get-history', () => {
    if (fs.existsSync(historyFile)) return JSON.parse(fs.readFileSync(historyFile));
    return [];
});
