// перевірка підключення файлу
console.log('app.js підключено');

// дані варіанта - масив нотаток з назвою й категорією
const notes = [
    { title: 'Нотатки з лекції', category: 'Навчання', excerpt: 'Бази даних, PostgreSQL' },
    { title: 'Пароль від Wifi', category: 'Безпека', excerpt: '12345678' },
    { title: 'Список покупок', category: 'Побут', excerpt: 'Молоко, хліб, яйця' },
    { title: 'Ідеї для проєкту', category: 'Навчання', excerpt: 'Додаток для нотаток з категоріями' },
    { title: 'Пароль від пошти', category: 'Безпека', excerpt: 'qwerty2026!' },
];

// підраховує та виводить у консоль кількість нотаток у кожній категорії
function countByCategory(notesArray) {
    const counts = {};

    for (const note of notesArray) {
        const category = note.category;

        if (counts[category] === undefined) {
            counts[category] = 1;
        } else {
            counts[category] += 1;
        }
    }

    for (const category of Object.keys(counts)) {
        console.log(`${category}: ${counts[category]} нотаток`);
    }

    return counts;
}

// виклик функції обробки циклом
countByCategory(notes);

// умовна перевірка жорстко заданого пароля
const testPassword = '12345678';

if (testPassword.length < 8) {
    console.log('Попередження: пароль занадто короткий!');
} else {
    console.log('Довжина пароля прийнятна.');
}

// стрілкова функція - перевіряє, чи пароль достатньо надійний
const isStrongPassword = password => password.length >= 8;

console.log(`Пароль "${testPassword}" надійний: ${isStrongPassword(testPassword)}`);
console.log(`Пароль "abc" надійний: ${isStrongPassword('abc')}`);

// Видаляємо всі статичні картки-приклади з практикуму 2
document.querySelectorAll('.cards .note-card').forEach(el => el.remove());

// Вибір контейнера для динамічних карток нотаток
const listContainer = document.querySelector('.cards');
const notesCountEl = document.querySelector('#notes-count');

// Присвоює кожній нотатці категорійний CSS-клас для візуального розрізнення
function categoryToClass(category) {
    if (category === 'Безпека'){
        return 'note-category--security';
    }
    if (category === 'Навчання'){
        return 'note-category--general';
    }
    if (category === 'Побут'){
        return 'note-category--household';
    }

    return 'note-category--other';
}

// Створює SVG-іконку замка для нотаток категорії «Безпека»
function createLockIcon() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'note-category-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z');

    svg.append(path);
    return svg;
}

// Рендерить список нотаток у контейнер на основі масиву даних
function renderNotes(notesArray) {
    listContainer.innerHTML = '';

    notesArray.forEach((note, index) => {
        const card = document.createElement('article');
        const title = document.createElement('h3');
        const category = document.createElement('p');

        title.textContent = note.title;
        category.textContent = note.category;

        // іконка замка для нотаток категорії «Безпека»
        if (note.category === 'Безпека') {
            category.prepend(createLockIcon());
        }

        card.dataset.id = index + 1;
        card.classList.add('note-card', categoryToClass(note.category));

        card.append(title, category);
        listContainer.append(card);
    });
}

// Виклик рендеру з реальними даними при завантаженні сторінки
renderNotes(notes);

// Оновлення підсумкового лічильника кількості нотаток
notesCountEl.textContent = `Усього нотаток: ${notes.length}`;

// Вибір форми та її елементів
const noteForm = document.querySelector('#note-form');
const titleInput = document.querySelector('#note-title');
const contentInput = document.querySelector('#note-content');
const charCounter = document.querySelector('#char-counter');
const MAXLENGTH = 300;

// Лічильник символів при наближенні до ліміту змінює колір (клас near-limit)
contentInput.addEventListener('input', () => {
    const currentLength = contentInput.value.length;

    charCounter.textContent = `${currentLength} / ${MAXLENGTH}`;
    charCounter.classList.toggle('near-limit', MAXLENGTH - currentLength <= 30);
});

// Додаткова валідація поле не має складатися лише з пробілів
function checkNotBlank(input, message) {
    const isBlank = input.value !== '' && input.value.trim() === '';
    input.setCustomValidity(isBlank ? message : '');
}

titleInput.addEventListener('input', () => {
    checkNotBlank(titleInput, 'Заголовок не може складатися лише з пробілів');
});

contentInput.addEventListener('input', () => {
    checkNotBlank(contentInput, 'Текст нотатки не може складатися лише з пробілів');
});

// Обробка надсилання форми без перезавантаження сторінки
noteForm.addEventListener('submit', event => {
    // скасування перезавантаження сторінки
    event.preventDefault();

    // отримання значень полів форми
    const title = titleInput.value.trim();
    const excerpt = contentInput.value.trim();

    // новий об'єкт у форматі масиву notes + поле excerpt
    notes.push({ title: title, category: 'Загальне', excerpt: excerpt });

    // повторний рендер списку нотаток після додавання нової
    renderNotes(notes);
    notesCountEl.textContent = `Усього нотаток: ${notes.length}`;

    // очищення форми та скидання лічильника символів
    noteForm.reset();
    charCounter.textContent = `0 / ${MAXLENGTH}`;
    charCounter.classList.remove('near-limit');
});

// Друга подія: делегування кліку на контейнері списку.
// Показує повний текст обраної нотатки в aside (через textContent, безпечно).
const noteViewer = document.querySelector('aside');

listContainer.addEventListener('click', event => {
    const clickedCard = event.target.closest('.note-card');
    if (!clickedCard) {
        return;
    }

    const clickedNote = notes[Number(clickedCard.dataset.id) - 1];

    const heading = document.createElement('h2');
    const title = document.createElement('h3');
    const category = document.createElement('p');
    const text = document.createElement('p');

    heading.textContent = 'Перегляд обраної нотатки';
    title.textContent = clickedNote.title;
    category.textContent = clickedNote.category;
    text.textContent = clickedNote.excerpt || 'Текст для цієї нотатки не додано.';

    noteViewer.replaceChildren(heading, title, category, text);
});