const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Локальні дані
const notes = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'notes.json'), 'utf8'));

// Типи вмісту для статичних файлів
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// Обробляє запити до API
function handleApi(req, res, pathname) {
    // API доступне лише для читання
    if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Метод не дозволено' }, { Allow: 'GET' });
        return;
    }

    // GET /api/notes - весь список
    if (pathname === '/api/notes') {
        sendJson(res, 200, notes);
        return;
    }

    // GET /api/notes/:id - одна нотатка або 404
    const match = pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (match) {
        const note = notes.find(n => String(n.id) === match[1]);
        if (!note) {
            sendJson(res, 404, { error: 'Нотатку не знайдено' });
            return;
        }
        sendJson(res, 200, note);
        return;
    }

    sendJson(res, 404, { error: 'Невідомий ендпоінт' });
}

// Роздає статичний файл із папки public
function serveStatic(req, res, pathname) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendJson(res, 405, { error: 'Метод не дозволено' }, { Allow: 'GET, HEAD' });
        return;
    }

    const relativePath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

    // захист від виходу за межі папки public (наприклад, /../server.js)
    if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
        sendJson(res, 404, { error: 'Не знайдено' });
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // немає файлу, або це тека
            if (err.code === 'ENOENT' || err.code === 'EISDIR') {
                sendJson(res, 404, { error: 'Не знайдено' });
            } else {
                console.error('Помилка читання файлу:', err);
                sendJson(res, 500, { error: 'Внутрішня помилка сервера' });
            }
            return;
        }

        const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
        res.end(req.method === 'HEAD' ? undefined : data);
    });
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    try {
        const { pathname } = new URL(req.url, 'http://localhost');
        const decodedPath = decodeURIComponent(pathname);

        if (decodedPath.startsWith('/api/')) {
            handleApi(req, res, decodedPath);
        } else {
            serveStatic(req, res, decodedPath);
        }
    } catch (err) {
        sendJson(res, 400, { error: 'Некоректний запит' });
    }
});

// Запускаємо сервер, лише якщо файл запущено напряму, а не підключено як модуль
if (require.main === module) {
    server.listen(PORT, () => console.log(`Сервер запущено на http://localhost:${PORT}`));
}

module.exports = server;