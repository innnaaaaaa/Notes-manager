console.log('app.js підключено');

const STORAGE_KEY = 'notes';

// API: JSONPlaceholder (https://jsonplaceholder.typicode.com), без ключа
const API_URL = 'https://jsonplaceholder.typicode.com/posts?userId=1';

// Початкові тестові нотатки (вигадані дані: реальні паролі не зберігаємо)
const defaultNotes = [
    { id: 1, title: 'Нотатки з лекції', category: 'Навчання', text: 'Бази даних, PostgreSQL: таблиці, первинні та зовнішні ключі, базові запити SELECT/INSERT.' },
    { id: 2, title: 'Пароль від Wifi', category: 'Безпека', text: '12345678' },
    { id: 3, title: 'Список покупок', category: 'Побут', text: 'Молоко, хліб, яйця, сир, яблука, кава, мило.' },
    { id: 4, title: 'Ідеї для проєкту', category: 'Навчання', text: 'Додаток для нотаток із категоріями, пошуком і синхронізацією через API.' },
    { id: 5, title: 'Пароль від пошти', category: 'Безпека', text: 'qwerty2026!' },
];

// localStorage

// Зберігає масив нотаток у localStorage (об'єкти перетворюються в рядок JSON)
function saveToLocalStorage(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Читає нотатки з localStorage; при пошкоджених даних повертає порожній масив
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Пошкоджені дані в localStorage:', error);
        return [];
    }
}

// IndexedDB

const DB_NAME = 'NotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';
let dbPromise = null;

// Відкриває базу і кешує з'єднання
function openDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            // викликається лише при створенні бази або підвищенні версії
            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

// Додає нотатку або оновлює наявну з тим самим id
async function addItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Оновлення нотатки: put із тим самим id замінює запис, дубліката не створюється
async function updateItem(item) {
    return addItem(item);
}

// Повертає всі нотатки зі сховища
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Видаляє нотатки за списком id в одній транзакції
async function deleteItems(ids) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// Видаляє одну нотатку
async function deleteItem(id) {
    return deleteItems([id]);
}

// Одноразова міграція: переносить нотатки з localStorage в порожнє сховище IndexedDB
async function migrateFromLocalStorage() {
    if (localStorage.getItem('migrated') === 'true') {
        return;
    }

    const existing = await getAllItems();
    const oldItems = loadFromLocalStorage();

    if (existing.length === 0 && oldItems.length > 0) {
        for (const item of oldItems) {
            await addItem(item);
        }
        console.log(`Мігровано нотаток із localStorage в IndexedDB: ${oldItems.length}`);
    }

    // прапорець, щоб міграція не повторювалась при наступних запусках
    localStorage.setItem('migrated', 'true');
}

// Компонент однієї нотатки. Дані отримує через props, а про дії повідомляє подіями.
const NoteCard = {
    props: ['title', 'text', 'category'],
    emits: ['select', 'edit', 'delete'],

    // Локальні реактивні дані: розгорнуто чи згорнуто текст, висота розгорнутого тексту,
    // чи є що розгортати (текст довший за згорнуту висоту)
    data() {
        return { expanded: false, expandedHeight: 0, canExpand: false };
    },

    computed: {
        // інлайн-висота лише для розгорнутого стану; для згорнутого діє max-height із CSS
        bodyStyle() {
            return this.expanded ? { maxHeight: this.expandedHeight + 'px' } : {};
        },
        categoryClass() {
            const map = {
                'Безпека': 'note-category--security',
                'Навчання': 'note-category--general',
                'Побут': 'note-category--household',
            };
            return map[this.category] || 'note-category--other';
        },
        isPassword() {
            return this.category === 'Безпека';
        }
    },

    watch: {
        // текст змінився (редагування): перерахувати висоту
        text() {
            this.$nextTick(() => this.measure());
        }
    },

    methods: {
        onClick() {
            this.expanded = !this.expanded;
            if (this.expanded) {
                // реальна висота повного тексту, до якої анімується max-height
                this.expandedHeight = this.$refs.body.scrollHeight;
            }
            this.$emit('select');
        },

        // Вимірює висоту тексту й визначає, чи обрізано його у згорнутому стані
        measure() {
            const el = this.$refs.body;
            if (!el) {
                return;
            }
            if (this.expanded) {
                this.expandedHeight = el.scrollHeight;
            } else {
                this.canExpand = el.scrollHeight > el.clientHeight + 1;
            }
        }
    },

    mounted() {
        this.measure();
        window.addEventListener('resize', this.measure);
    },

    beforeUnmount() {
        window.removeEventListener('resize', this.measure);
    },

    template: `
        <article class="note-card" :class="{ expanded: expanded }" @click="onClick">
            <span class="note-category" :class="categoryClass">
                <svg v-if="isPassword" class="note-category-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/></svg>
                {{ category }}
            </span>
            <h3>{{ title }}</h3>
            <div class="note-card--body" :class="{ 'note-card--body--clipped': !expanded && canExpand }" ref="body" :style="bodyStyle">
                <p :class="{ 'note-content--password': isPassword }">{{ text }}</p>
            </div>
            <div class="note-card--actions">
                <button class="btn btn--small btn--outline" type="button" @click.stop="$emit('edit')">Редагувати</button>
                <button class="btn btn--small" type="button" @click.stop="$emit('delete')">Видалити</button>
            </div>
        </article>
    `
};

// Таблиця маршрутів: патерн - view (компонент «сторінки»). Параметри позначаються :name
const routes = [
    { path: '/', view: 'notes-list', title: 'Список нотаток' },
    { path: '/notes/:id', view: 'note-detail', title: 'Нотатка' },
    { path: '/new', view: 'note-new', title: 'Нова нотатка' },
];

// Поточний шлях із hash без символу # (порожній hash - головна сторінка)
function currentPath() {
    const path = location.hash.slice(1).split('?')[0];
    return path || '/';
}

// Зіставляє шлях із таблицею маршрутів і витягує параметри; null - маршрут не знайдено
function matchRoute(path) {
    const pathParts = path.split('/').filter(Boolean);

    for (const route of routes) {
        const routeParts = route.path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) {
            continue;
        }

        const params = {};
        const isMatch = routeParts.every((part, i) => {
            if (part.startsWith(':')) {
                try {
                    params[part.slice(1)] = decodeURIComponent(pathParts[i]);
                } catch (error) {
                    params[part.slice(1)] = pathParts[i];
                }
                return true;
            }
            return part === pathParts[i];
        });

        if (isMatch) {
            return { view: route.view, title: route.title, params };
        }
    }

    return null;
}

// Визначає поточний маршрут; для невідомого шляху повертає сторінку «Не знайдено»
function resolveRoute() {
    const path = currentPath();
    const matched = matchRoute(path);
    return matched
        ? { ...matched, path }
        : { view: 'not-found', title: 'Не знайдено', params: {}, path };
}

// Клієнтська навігація: зміна hash не перезавантажує сторінку, а викликає подію hashchange
function navigate(path) {
    location.hash = '#' + path;
}

// Адреса сторінки нотатки за її id
function notePath(id) {
    return '/notes/' + encodeURIComponent(id);
}

// Форма нотатки: використовується і для створення (/new), і для редагування (/notes/:id)
const NoteForm = {
    props: {
        note: { type: Object, default: null },
        submitLabel: { type: String, default: 'Зберегти' }
    },
    emits: ['save', 'cancel'],

    data() {
        return {
            maxLength: 300,
            title: this.note ? this.note.title : '',
            text: this.note ? this.note.text : ''
        };
    },

    computed: {
        charsCount() {
            return this.text.length;
        },
        // відсоток заповнення поля (ширина індикатора)
        fillPercent() {
            return Math.min(100, Math.round(this.charsCount / this.maxLength * 100));
        },
        // стан індикатора: ok -> warn (лишилось <= 90 символів) -> danger (лишилось <= 30)
        meterState() {
            const left = this.maxLength - this.charsCount;
            if (left <= 30) {
                return 'danger';
            }
            if (left <= 90) {
                return 'warn';
            }
            return 'ok';
        }
    },

    methods: {
        submit() {
            const title = this.title;
            const text = this.text.trim();
            if (!title || !text) {
                return;
            }
            this.$emit('save', { id: this.note ? this.note.id : null, title, text });
        }
    },

    template: `
        <form id="note-form" @submit.prevent="submit">
            <label class="form-label" for="note-title">Заголовок:</label>
            <input class="form-control" type="text" id="note-title" v-model.trim="title" required>

            <label class="form-label" for="note-content">Зміст:</label>
            <textarea class="form-control form-control--textarea" id="note-content" v-model="text" required maxlength="300"></textarea>
            <div class="length-meter" role="progressbar" aria-label="Довжина тексту нотатки"
                 aria-valuemin="0" :aria-valuemax="maxLength" :aria-valuenow="charsCount">
                <div class="length-meter--fill" :class="'length-meter--fill--' + meterState"
                     :style="{ width: fillPercent + '%' }"></div>
            </div>
            <p id="char-counter" class="char-counter" :class="'char-counter--' + meterState">{{ charsCount }} / {{ maxLength }}</p>

            <div class="form-actions">
                <button class="btn" type="submit">{{ submitLabel }}</button>
                <button class="btn btn--outline" type="button" @click="$emit('cancel')">Скасувати</button>
            </div>
        </form>
    `
};

// Маршрут «/»: список нотаток (повторно використовує компонент картки NoteCard)
const NotesListView = {
    components: { NoteCard },
    props: ['notes', 'ready', 'loading', 'error'],
    emits: ['select', 'delete', 'refresh'],

    methods: {
        open(note) {
            navigate(notePath(note.id));
        }
    },

    template: `
        <section id="notes-list">
            <p id="notes-count">Усього нотаток: {{ notes.length }}</p>
            <h2>Мої нотатки</h2>
            <div class="page-actions">
                <a class="btn btn--link" href="#/new" data-link>+ Нова нотатка</a>
                <button id="refresh-btn" class="btn btn--secondary" :disabled="loading" @click="$emit('refresh')">
                    {{ loading ? 'Завантаження...' : 'Оновити дані з API' }}
                </button>
            </div>
            <p class="error-message" v-if="error">{{ error }}</p>
            <p class="empty-message" v-if="!ready">Завантаження нотаток…</p>
            <p class="empty-message" v-else-if="notes.length === 0">Нотаток поки немає. Створіть першу за посиланням «Нова нотатка».</p>

            <div class="cards">
                <note-card
                    v-for="note in notes"
                    :key="note.id"
                    :title="note.title"
                    :text="note.text"
                    :category="note.category"
                    @select="$emit('select', note)"
                    @edit="open(note)"
                    @delete="$emit('delete', note)">
                </note-card>
            </div>
        </section>
    `
};

// Маршрут «/notes/:id»: перегляд і редагування конкретної нотатки
const NoteDetailView = {
    components: { NoteForm },
    props: ['notes', 'ready', 'noteId'],
    emits: ['save', 'delete'],

    data() {
        return { editing: false };
    },

    computed: {
        // нотатка з потрібним id (параметр маршруту приходить рядком)
        note() {
            return this.notes.find(n => String(n.id) === this.noteId) || null;
        },
        categoryClass() {
            const map = {
                'Безпека': 'note-category--security',
                'Навчання': 'note-category--general',
                'Побут': 'note-category--household',
            };
            return this.note ? (map[this.note.category] || 'note-category--other') : '';
        },
        isPassword() {
            return this.note !== null && this.note.category === 'Безпека';
        }
    },

    watch: {
        // перехід на іншу нотатку закриває режим редагування
        noteId() {
            this.editing = false;
        }
    },

    methods: {
        onSave(payload) {
            this.$emit('save', payload);
            this.editing = false;
        }
    },

    template: `
        <section class="note-detail">
            <p><a class="link-back" href="#/" data-link>← До списку нотаток</a></p>

            <p class="empty-message" v-if="!ready">Завантаження…</p>

            <template v-else-if="note">
                <template v-if="!editing">
                    <span class="note-category" :class="categoryClass">{{ note.category }}</span>
                    <h2>{{ note.title }}</h2>
                    <p class="note-detail--text" :class="{ 'note-content--password': isPassword }">{{ note.text }}</p>
                    <div class="page-actions">
                        <button class="btn" type="button" @click="editing = true">Редагувати</button>
                        <button class="btn btn--outline" type="button" @click="$emit('delete', note)">Видалити</button>
                    </div>
                </template>

                <template v-else>
                    <h2>Редагування нотатки</h2>
                    <note-form :note="note" submit-label="Зберегти зміни" @save="onSave" @cancel="editing = false"></note-form>
                </template>
            </template>

            <template v-else>
                <h2>Нотатку не знайдено</h2>
                <p>Нотатки з номером «{{ noteId }}» не існує або її було видалено.</p>
            </template>
        </section>
    `
};

// Маршрут «/new»: форма створення нової нотатки (практикум 8)
const NoteNewView = {
    components: { NoteForm },
    emits: ['save'],

    template: `
        <section id="new-note">
            <p><a class="link-back" href="#/" data-link>← До списку нотаток</a></p>
            <h2>Нова нотатка</h2>
            <note-form submit-label="Додати нотатку" @save="$emit('save', $event)" @cancel="goHome"></note-form>
        </section>
    `,

    methods: {
        goHome() {
            navigate('/');
        }
    }
};

// Сторінка «Не знайдено» для невідомого маршруту
const NotFoundView = {
    props: ['path'],

    template: `
        <section class="note-detail">
            <h2>Сторінку не знайдено</h2>
            <p>Адреси «{{ path }}» у застосунку немає.</p>
            <p><a class="btn btn--link" href="#/" data-link>На головну</a></p>
        </section>
    `
};

Vue.createApp({
    components: { NotesListView, NoteDetailView, NoteNewView, NotFoundView },

    data() {
        return {
            route: resolveRoute(),
            notes: [],
            ready: false,
            selectedNote: null,
            dbAvailable: true,
            loading: false,
            error: '',
            dbError: ''
        };
    },

    methods: {
        // Оновлює поточний маршрут (викликається при hashchange та на старті)
        syncRoute() {
            this.route = resolveRoute();
            document.title = this.route.title + ' — Менеджер нотаток';
            window.scrollTo(0, 0);
        },

        // Виконує операцію з IndexedDB; при помилці показує зрозуміле повідомлення
        async persist(operation) {
            if (!this.dbAvailable) {
                return;
            }
            try {
                await operation();
            } catch (err) {
                console.error('Помилка IndexedDB:', err);
                this.dbError = 'Не вдалося зберегти зміни в локальній базі даних.';
            }
        },

        // Наступний вільний числовий id
        nextId() {
            return this.notes.reduce((max, n) => (typeof n.id === 'number' ? Math.max(max, n.id) : max), 0) + 1;
        },

        // Створює нову нотатку (id === null) або оновлює наявну
        async saveNote({ id, title, text }) {
            if (!title || !text) {
                return;
            }

            if (id !== null) {
                const current = this.notes.find(n => n.id === id);
                // звичайний об'єкт: IndexedDB не може клонувати реактивний Proxy Vue
                const updated = { ...current, title, text };
                this.notes = this.notes.map(n => (n.id === updated.id ? updated : n));
                if (this.selectedNote && this.selectedNote.id === updated.id) {
                    this.selectedNote = updated;
                }
                await this.persist(() => updateItem(updated));
            } else {
                const note = { id: this.nextId(), title, category: 'Загальне', text };
                this.notes.push(note);
                await this.persist(() => addItem(note));
                // після створення відкриваємо сторінку нової нотатки (маршрут із параметром)
                navigate(notePath(note.id));
            }
        },

        // Видаляє нотатку зі списку та зі сховища
        async removeNote(note) {
            this.notes = this.notes.filter(n => n.id !== note.id);
            if (this.selectedNote && this.selectedNote.id === note.id) {
                this.selectedNote = null;
            }
            // якщо видалили нотатку зі сторінки її деталей - повертаємося до списку
            if (this.route.view === 'note-detail' && this.route.params.id === String(note.id)) {
                navigate('/');
            }
            await this.persist(() => deleteItem(note.id));
        },

        // Завантажує нотатки з API
        async loadData() {
            this.loading = true;
            this.error = '';
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                const apiNotes = data.map(post => ({
                    id: 'api-' + post.id,
                    title: post.title,
                    category: 'API',
                    text: post.body,
                    fromApi: true
                }));

                const oldApiIds = this.notes.filter(n => n.fromApi).map(n => n.id);
                this.notes = this.notes.filter(n => !n.fromApi).concat(apiNotes);

                await this.persist(async () => {
                    await deleteItems(oldApiIds);
                    for (const item of apiNotes) {
                        await addItem(item);
                    }
                });
            } catch (err) {
                this.error = 'Нотатки недоступні офлайн';
                console.error('Error fetching data:', err);
            } finally {
                this.loading = false;
            }
        },

        // Початкове завантаження: міграція, читання з IndexedDB, перший запуск
        async init() {
            try {
                await migrateFromLocalStorage();
                let items = await getAllItems();

                if (items.length === 0 && localStorage.getItem('notesSeeded') !== 'true') {
                    for (const note of defaultNotes) {
                        await addItem({ ...note });
                    }
                    localStorage.setItem('notesSeeded', 'true');
                    items = await getAllItems();
                }

                this.notes = items;
            } catch (err) {
                // IndexedDB недоступна: працюємо лише в пам'яті
                console.error('Не вдалося відкрити IndexedDB:', err);
                this.dbAvailable = false;
                this.dbError = 'Локальна база даних (IndexedDB) недоступна: зміни не збережуться після перезавантаження сторінки.';
                this.notes = defaultNotes.map(n => ({ ...n }));
            } finally {
                this.ready = true;
            }
        }
    },

    created() {
        // кнопки «назад»/«вперед» та зміна адреси змінюють hash -> перемальовуємо потрібну «сторінку»
        window.addEventListener('hashchange', this.syncRoute);
        document.title = this.route.title + ' — Менеджер нотаток';
    },

    beforeUnmount() {
        window.removeEventListener('hashchange', this.syncRoute);
    },

    mounted() {
        this.init();
    }
}).mount('#app');