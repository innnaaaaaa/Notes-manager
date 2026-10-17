console.log('app.js підключено');

// API: JSONPlaceholder (https://jsonplaceholder.typicode.com), без ключа
const API_URL = 'https://jsonplaceholder.typicode.com/posts?userId=1';

// Обраний фреймворк: Vue 3 - працює через один <script> з CDN без Babel/JSX

// Ручний DOM-код (renderNotes, categoryToClass, showLoading, showError та обробники
// з querySelector/innerHTML із практикумів 7-9) - замінено компонентом NoteCard
// і реактивним станом Vue.

const NoteCard = {
    props: ['title', 'excerpt', 'category'],
    emits: ['select'],

    // Локальний реактивний прапорець: розгорнуто чи згорнуто текст
    data() {
        return { expanded: false };
    },

    computed: {
        // похідне значення: скорочений текст, коли нотатка згорнута
        preview() {
            return this.excerpt.length > 40
                ? this.excerpt.slice(0, 40) + '…'
                : this.excerpt;
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
            this.expanded = !this.expanded; // Vue сам перемалює картку
            this.$emit('select');           // повідомляємо батьківський компонент для aside
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
                {{ expanded ? excerpt : preview }}
            </p>
        </article>
    `
};

Vue.createApp({
    components: { NoteCard },

    // Дані - у реактивному стані, а не у звичайній зовнішній змінній
    data() {
        return {
            maxLength: 300,
            nextId: 6,
            notes: [
                { id: 1, title: 'Нотатки з лекції', category: 'Навчання', excerpt: 'Бази даних, PostgreSQL: таблиці, первинні та зовнішні ключі, базові запити SELECT/INSERT.' },
                { id: 2, title: 'Пароль від Wifi', category: 'Безпека', excerpt: '12345678' },
                { id: 3, title: 'Список покупок', category: 'Побут', excerpt: 'Молоко, хліб, яйця, сир, яблука, кава, мило.' },
                { id: 4, title: 'Ідеї для проєкту', category: 'Навчання', excerpt: 'Додаток для нотаток із категоріями, пошуком і синхронізацією через API.' },
                { id: 5, title: 'Пароль від пошти', category: 'Безпека', excerpt: 'qwerty2026!' },
            ],
            newTitle: '',
            newContent: '',
            selectedNote: null,
            loading: false,
            error: ''
        };
    },

    computed: {
        // похідні значення - перераховуються автоматично
        charsCount() {
            return this.newContent.length;
        },
        nearLimit() {
            return this.maxLength - this.charsCount <= 30;
        }
    },

    methods: {
        addNote() {
            // новий об'єкт з унікальним id додається до реактивного масиву
            this.notes.push({
                id: this.nextId++,
                title: this.newTitle,
                category: 'Загальне',
                excerpt: this.newContent.trim()
            });
            this.newTitle = '';
            this.newContent = '';
        },

        async loadData() {
            this.loading = true;
            this.error = '';
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Завантажені дані з API:', data);

                // лишаємо власні нотатки, замінюємо лише попередні дані з API
                const apiNotes = data.map(post => ({
                    id: 'api-' + post.id,
                    title: post.title,
                    category: 'API',
                    excerpt: post.body,
                    fromApi: true
                }));
                this.notes = this.notes.filter(n => !n.fromApi).concat(apiNotes);
            } catch (err) {
                this.error = 'Нотатки недоступні офлайн';
                console.error('Error fetching data:', err);
            } finally {
                this.loading = false;
            }
        }
    },

    mounted() {
        this.loadData();
    }
}).mount('#app');