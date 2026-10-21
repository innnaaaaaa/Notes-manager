console.log('app.js підключено');

const STORAGE_KEY = 'notes';

// API: JSONPlaceholder (https://jsonplaceholder.typicode.com), без ключа
const API_URL = 'https://jsonplaceholder.typicode.com/posts?userId=1';

// Початкові тестові нотатки
const defaultNotes = [
    { id: 1, title: 'Нотатки з лекції', category: 'Навчання', text: 'Бази даних, PostgreSQL: таблиці, первинні та зовнішні ключі, базові запити SELECT/INSERT.' },
    { id: 2, title: 'Пароль від Wifi', category: 'Безпека', text: '12345678' },
    { id: 3, title: 'Список покупок', category: 'Побут', text: 'Молоко, хліб, яйця, сир, яблука, кава, мило.' },
    { id: 4, title: 'Ідеї для проєкту', category: 'Навчання', text: 'Додаток для нотаток із категоріями, пошуком і синхронізацією через API.' },
    { id: 5, title: 'Пароль від пошти', category: 'Безпека', text: 'qwerty2026!' },
];

// Зберігає масив нотаток у localStorage
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

// Компонент однієї нотатки. Дані отримує через props, а про дії повідомляє подіями.
const NoteCard = {
    props: ['title', 'text', 'category'],
    emits: ['select', 'edit', 'delete'],

    // Локальний реактивний прапорець: розгорнуто чи згорнуто текст
    data() {
        return { expanded: false };
    },

    computed: {
        // скорочений текст, коли нотатка згорнута
        preview() {
            return this.text.length > 40 ? this.text.slice(0, 40) + '…' : this.text;
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

    methods: {
        onClick() {
            this.expanded = !this.expanded;
            this.$emit('select');
        }
    },

    template: `
        <article class="note-card" :class="{ expanded: expanded }" @click="onClick">
            <span class="note-category" :class="categoryClass">
                <svg v-if="isPassword" class="note-category-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/></svg>
                {{ category }}
            </span>
            <h3>{{ title }}</h3>
            <p :class="{ 'note-content--password': isPassword }">
                {{ expanded ? text : preview }}
            </p>
            <div class="note-card__actions">
                <button class="btn btn--small btn--outline" type="button" @click.stop="$emit('edit')">Редагувати</button>
                <button class="btn btn--small" type="button" @click.stop="$emit('delete')">Видалити</button>
            </div>
        </article>
    `
};

Vue.createApp({
    components: { NoteCard },

    data() {
        return {
            maxLength: 300,
            notes: [],
            newTitle: '',
            newContent: '',
            editingId: null,
            selectedNote: null,
            loading: false,
            error: '',
            dbError: ''
        };
    },

    computed: {
        charsCount() {
            return this.newContent.length;
        },
        nearLimit() {
            return this.maxLength - this.charsCount <= 30;
        }
    },

    methods: {
        // Зберігає поточний масив нотаток у localStorage
        persist() {
            saveToLocalStorage(this.notes);
        },

        // Наступний вільний числовий id
        nextId() {
            return this.notes.reduce((max, n) => (typeof n.id === 'number' ? Math.max(max, n.id) : max), 0) + 1;
        },

        // Додає нову нотатку або зберігає зміни в редагованій
        saveNote() {
            const title = this.newTitle;
            const text = this.newContent.trim();
            if (!title || !text) {
                return;
            }

            if (this.editingId !== null) {
                this.notes = this.notes.map(n => (n.id === this.editingId ? { ...n, title, text } : n));
                if (this.selectedNote && this.selectedNote.id === this.editingId) {
                    this.selectedNote = this.notes.find(n => n.id === this.editingId);
                }
            } else {
                this.notes.push({ id: this.nextId(), title, category: 'Загальне', text });
            }

            this.persist();
            this.cancelEdit();
        },

        // Переносить дані нотатки у форму для редагування
        startEdit(note) {
            this.editingId = note.id;
            this.newTitle = note.title;
            this.newContent = note.text;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        // Скидає форму й режим редагування
        cancelEdit() {
            this.editingId = null;
            this.newTitle = '';
            this.newContent = '';
        },

        // Видаляє нотатку
        removeNote(note) {
            this.notes = this.notes.filter(n => n.id !== note.id);
            if (this.selectedNote && this.selectedNote.id === note.id) {
                this.selectedNote = null;
            }
            if (this.editingId === note.id) {
                this.cancelEdit();
            }
            this.persist();
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

                this.notes = this.notes.filter(n => !n.fromApi).concat(apiNotes);
                this.persist();
            } catch (err) {
                this.error = 'Нотатки недоступні офлайн';
                console.error('Error fetching data:', err);
            } finally {
                this.loading = false;
            }
        }
    },

    // Початковий стан береться з localStorage; при першому запуску - початкові нотатки
    created() {
        let items = loadFromLocalStorage();
        if (items.length === 0 && localStorage.getItem('notesSeeded') !== 'true') {
            items = defaultNotes.map(n => ({ ...n }));
            localStorage.setItem('notesSeeded', 'true');
            saveToLocalStorage(items);
        }
        this.notes = items;
    }
}).mount('#app');
