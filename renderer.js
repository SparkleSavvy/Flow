const UI = {
    urlInput: document.getElementById('url-input'),
    fetchBtn: document.getElementById('fetch-btn'),
    downloadBtn: document.getElementById('download-btn'),
    previewCard: document.getElementById('preview-card'),
    previewImg: document.getElementById('preview-img'),
    previewTitle: document.getElementById('preview-title'),
    previewDuration: document.getElementById('preview-duration'),
    progressContainer: document.getElementById('progress-container'),
    progressBar: document.getElementById('progress-bar'),
    statusText: document.getElementById('status-text'),
    percentText: document.getElementById('percent-text'),
    qualitySelect: document.getElementById('quality-select'),
    qualityWrapper: document.getElementById('quality-wrapper'),
    checkSubtitles: document.getElementById('check-subtitles'),
    checkPlaylist: document.getElementById('check-playlist'),
    
    // Модальные окна
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalContent: document.getElementById('modal-content'),
    closeModal: document.getElementById('close-modal'),
    historyBtn: document.getElementById('history-btn'),
    settingsBtn: document.getElementById('settings-btn')
};

let currentMetadata = null;

// Инициализация API
document.addEventListener('DOMContentLoaded', async () => {
    // Скрываем превью при запуске
    UI.previewCard.classList.add('hidden');

    try {
        const status = await window.api.checkDependencies();
        
        UI.fetchBtn.disabled = false;

        if (status.ytdlp) document.querySelector('#status-ytdlp .dot').classList.add('ready');
        if (status.ffmpeg) document.querySelector('#status-ffmpeg .dot').classList.add('ready');

        if (status.ytdlp && status.ffmpeg) {
            UI.downloadBtn.innerText = 'Вставьте ссылку для загрузки';
        } else {
            UI.downloadBtn.innerText = 'Ошибка: не удалось инициализировать компоненты';
        }
    } catch (e) {
        console.error("API error", e);
    }
});

// Переключение Форматов (Анимация затемнения качества)
document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isAudio = e.target.value === 'mp3';
        UI.qualityWrapper.style.opacity = isAudio ? '0.3' : '1';
        UI.qualityWrapper.style.pointerEvents = isAudio ? 'none' : 'auto';
        UI.qualitySelect.disabled = isAudio;
    });
});

// Получение превью
UI.fetchBtn.addEventListener('click', async () => {
    const url = UI.urlInput.value.trim();
    if (!url) return;

    UI.fetchBtn.style.opacity = '0.5';
    UI.downloadBtn.innerText = 'Поиск данных...';
    
    try {
        currentMetadata = await window.api.fetchMetadata(url);
        UI.previewImg.src = currentMetadata.thumbnail;
        UI.previewTitle.innerText = currentMetadata.title;
        UI.previewDuration.innerText = currentMetadata.duration || '--:--';
        
        UI.previewCard.classList.remove('hidden');
        UI.downloadBtn.innerText = 'Скачать медиа';
        UI.downloadBtn.disabled = false;
        if (window.api.expandWindow) window.api.expandWindow();
    } catch (err) {
        UI.downloadBtn.innerText = 'Видео не найдено';
        UI.previewCard.classList.add('hidden');
        currentMetadata = null;
    }
    UI.fetchBtn.style.opacity = '1';
});

// Скачивание
UI.downloadBtn.addEventListener('click', async () => {
    if (!currentMetadata) return;

    const format = document.querySelector('input[name="format"]:checked').value;
    const quality = UI.qualitySelect.value;
    const subtitles = UI.checkSubtitles.checked;
    const playlist = UI.checkPlaylist.checked;

    UI.progressContainer.classList.add('active');
    UI.downloadBtn.disabled = true;
    UI.progressBar.style.width = '0%';
    UI.percentText.innerText = '0%';
    UI.statusText.innerText = 'Подготовка потока...';

    try {
        const result = await window.api.downloadVideo({
            url: UI.urlInput.value.trim(),
            format, quality, subtitles, playlist,
            title: currentMetadata.title,
            thumbnail: currentMetadata.thumbnail
        });
        UI.statusText.innerText = result;
        UI.progressBar.style.width = '100%';
        UI.percentText.innerText = '100%';
    } catch (err) {
        UI.statusText.innerText = 'Ошибка загрузки';
        UI.progressBar.style.background = '#ff4d4d';
    } finally {
        setTimeout(() => {
            UI.downloadBtn.disabled = false;
            UI.progressContainer.classList.remove('active');
            UI.progressBar.style.background = 'linear-gradient(90deg, #00BFFF, var(--accent))';
        }, 4000);
    }
});

// Обновление прогресса
window.api.onProgress((percent) => {
    UI.progressBar.style.width = `${percent}%`;
    UI.percentText.innerText = `${Math.floor(percent)}%`;
    UI.statusText.innerText = percent > 99 ? 'Сборка файла (FFmpeg)...' : 'Загрузка...';
});

// --- Модальные окна ---
const openModal = (title, contentHTML) => {
    UI.modalTitle.innerText = title;
    UI.modalContent.innerHTML = contentHTML;
    UI.modalOverlay.classList.remove('hidden');
};
UI.closeModal.addEventListener('click', () => UI.modalOverlay.classList.add('hidden'));
// Закрытие по клику вне панели
UI.modalOverlay.addEventListener('click', (e) => {
    if(e.target === UI.modalOverlay) UI.modalOverlay.classList.add('hidden');
});

// Настройки
UI.settingsBtn.addEventListener('click', async () => {
    const settings = await window.api.getSettings();
    const version = await window.api.getVersion();
    const autoUpdate = settings.autoUpdate !== false;
    const cookiesText = settings.cookiesPath ? settings.cookiesPath : 'Не выбран';

    openModal('Настройки', `
        <div class="settings-group">
            <label>Папка для сохранения видео</label>
            <div class="path-selector">
                <span class="path-text" id="folder-path" title="${settings.downloadFolder}">${settings.downloadFolder}</span>
                <button class="path-btn" id="change-folder">Изменить</button>
            </div>
        </div>
        
        <div class="settings-group" style="margin-top: 15px;">
            <label>Файл авторизации (cookies.txt) — Обход 403 ошибки и видео 18+</label>
            <div class="path-selector">
                <span class="path-text" id="cookies-path" title="${cookiesText}">${cookiesText}</span>
                <button class="path-btn" id="change-cookies">Выбрать</button>
                <button class="path-btn" id="clear-cookies" style="background: rgba(255,50,50,0.15); color: #ff4d4d; border-color: rgba(255,50,50,0.2);">Удалить</button>
            </div>
        </div>
        
        <div class="settings-group" style="margin-top: 15px; border-top: 1px solid var(--glass-border); padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <label style="margin-bottom: 5px;">Обновления приложения</label>
                  <p style="font-size: 13px; color: #888; margin: 0;">Версия: v${version}</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label class="checkbox-wrapper" style="margin: 0;">
                        <input type="checkbox" id="auto-update-check" ${autoUpdate ? 'checked' : ''}>
                        <span class="checkbox-box"></span>
                        <span class="checkbox-label" style="font-size: 13px;">Авто-обновления</span>
                    </label>
                    <button class="path-btn" id="check-updates-btn">Проверить</button>
                </div>
            </div>
            <p id="update-status" style="font-size: 13px; color: var(--accent); margin-top: 5px; display: none;"></p>
        </div>
    `);
    
    // Слушатели кнопок внутри модального окна Настроек
    document.getElementById('change-folder').addEventListener('click', async () => {
        const newPath = await window.api.selectFolder();
        if (newPath) {
            const pathEl = document.getElementById('folder-path');
            pathEl.innerText = newPath;
            pathEl.title = newPath;
        }
    });

    document.getElementById('change-cookies').addEventListener('click', async () => {
        const newPath = await window.api.selectCookies();
        if (newPath) {
            const pathEl = document.getElementById('cookies-path');
            pathEl.innerText = newPath;
            pathEl.title = newPath;
        }
    });

    document.getElementById('clear-cookies').addEventListener('click', async () => {
        await window.api.clearCookies();
        const pathEl = document.getElementById('cookies-path');
        pathEl.innerText = 'Не выбран';
        pathEl.title = 'Не выбран';
    });
    
    document.getElementById('auto-update-check').addEventListener('change', async (e) => {
        await window.api.toggleAutoUpdate(e.target.checked);
    });

    document.getElementById('check-updates-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        const statusEl = document.getElementById('update-status');
        btn.disabled = true;
        btn.innerText = 'Поиск...';
        statusEl.style.display = 'none';

        const upVersion = await window.api.checkUpdates();
        btn.disabled = false;
        btn.innerText = 'Проверить';
        statusEl.style.display = 'block';
        if (upVersion === 'error') {
            statusEl.innerText = 'Ошибка при проверке обновлений.';
            statusEl.style.color = '#ff4d4d';
        } else if (upVersion) {
            statusEl.innerText = `Доступна новая версия: v${upVersion}. Она скачивается в фоне!`;
            statusEl.style.color = 'var(--accent)';
        } else {
            statusEl.innerText = 'У вас установлена последняя версия.';
            statusEl.style.color = '#888';
        }
    });
});

// История
UI.historyBtn.addEventListener('click', async () => {
    const history = await window.api.getHistory();
    if (history.length === 0) return openModal('История', '<p style="color:#888; text-align:center; padding:20px;">Вы еще ничего не скачивали.</p>');
    
    const html = history.map(item => `
        <div class="history-item">
            <img src="${item.thumbnail}" alt="Обложка">
            <div class="history-info">
                <h4>${item.title}</h4>
                <p>Формат: ${item.format.toUpperCase()} • ${item.date}</p>
            </div>
        </div>
    `).join('');
    openModal('История скачиваний', html);
});
