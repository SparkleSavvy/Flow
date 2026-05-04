const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec, execFile } = require('child_process');

// Пути для хранения данных настроек и истории
const userDataPath = app.getPath('userData');
const historyFile = path.join(userDataPath, 'history.json');
const settingsFile = path.join(userDataPath, 'settings.json');

// Базовые настройки (добавили cookiesPath)
let settings = { downloadFolder: app.getPath('downloads'), cookiesPath: null };
if (fs.existsSync(settingsFile)) settings = JSON.parse(fs.readFileSync(settingsFile));

function createWindow() {
    const win = new BrowserWindow({
        width: 1000, height: 750,
        backgroundColor: '#050608',
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

const checkSystemCommand = (command) => {
    return new Promise((resolve) => {
        exec(command, (error) => resolve(!error));
    });
};

ipcMain.handle('api-check', async () => {
    const ytdlpExists = await checkSystemCommand('yt-dlp --version');
    const ffmpegExists = await checkSystemCommand('ffmpeg -version');
    return { ytdlp: ytdlpExists, ffmpeg: ffmpegExists };
});

// === Безопасное получение превью (с поддержкой Cookies) ===
ipcMain.handle('fetch-metadata', async (event, url) => {
    return new Promise((resolve, reject) => {
        let args = ['--dump-json', url];
        
        // Добавляем куки, если они указаны и файл существует
        if (settings.cookiesPath && fs.existsSync(settings.cookiesPath)) {
            args.push('--cookies', settings.cookiesPath);
        }

        // execFile безопаснее, чем exec (не ломается от пробелов)
        execFile('yt-dlp', args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
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

// === Скачивание видео (с поддержкой Cookies) ===
ipcMain.handle('download-video', async (event, { url, format, quality, title, thumbnail }) => {
    return new Promise((resolve, reject) => {
        let args = ['--newline'];
        
        // Добавляем куки
        if (settings.cookiesPath && fs.existsSync(settings.cookiesPath)) {
            args.push('--cookies', settings.cookiesPath);
        }

        if (format === 'audio') {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
        } else {
            let formatStr = 'bestvideo+bestaudio';
            if (quality === '1080') formatStr = 'bestvideo[height<=1080]+bestaudio';
            if (quality === '720') formatStr = 'bestvideo[height<=720]+bestaudio';
            args.push('-f', formatStr, '--merge-output-format', 'mp4');
        }
        
        const outputPath = path.join(settings.downloadFolder, '%(title)s.%(ext)s');
        args.push('-o', outputPath, url);

        const ytdlp = spawn('yt-dlp', args);

        ytdlp.stdout.on('data', (data) => {
            const match = data.toString().match(/\[download\]\s+(\d+\.\d+)%/);
            if (match) event.sender.send('download-progress', parseFloat(match[1]));
        });

        ytdlp.on('close', (code) => {
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
