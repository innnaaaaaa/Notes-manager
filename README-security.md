## Безпека (практикум 15)

Аудит проєкту «Менеджер нотаток» (варіант 13: XSS через текст нотатки, зберігання паролів).

| Місце | Ризик | Стан |
|---|---|---|
| Заголовок і текст нотатки (форма, картки, сторінка нотатки, aside) | XSS | Безпечно: вивід через `{{ }}` (Vue екранує), `innerHTML`/`v-html` не використовуються |
| Параметр `:id` та шлях у адресі (`#/notes/…`, сторінка 404) | XSS | Безпечно: вивід через `{{ }}` |
| Дані з `/api/notes` | XSS | Безпечно: вивід через `{{ }}` |
| Перша версія практикуму 8 (панель перегляду через `innerHTML`) | XSS | Було вразливо, виправлено (`textContent`, далі Vue) |
| Нотатки в IndexedDB / localStorage | Витік даних | Сховища не шифруються: реальні паролі не зберігаються, лише вигадані тестові значення |
| Заголовки відповідей сервера | Sniffing, clickjacking | Додано `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` |
| Статичні файли сервера | Path traversal | Перевірка шляху в `serveStatic` (практикум 14) |
| Транспорт | Перехоплення трафіку | Локально `http://localhost` (безпечний контекст); для публікації потрібен HTTPS (GitHub Pages / Render) |

Обмеження: CSP без `unsafe-eval` не застосовано, бо Vue із CDN компілює шаблони в браузері.

Перевірка небезпечних API (PowerShell):

```powershell
Select-String -Path public\js\app.js,public\index.html -Pattern "innerHTML|v-html|eval\(|document.write|insertAdjacentHTML"
```

Результат: збігів немає.
