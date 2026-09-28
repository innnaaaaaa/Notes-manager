// перевірка підключення файлу
console.log('app.js підключено');

// дані варіанта — масив нотаток з назвою й категорією
const notes = [
    { title: 'Нотатки з лекції', category: 'Навчання' },
    { title: 'Пароль від Wifi', category: 'Безпека' },
    { title: 'Список покупок', category: 'Побут' },
    { title: 'Ідеї для проєкту', category: 'Навчання' },
    { title: 'Пароль від пошти', category: 'Безпека' },
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

// стрілкова функція — перевіряє, чи пароль достатньо надійний
const isStrongPassword = password => password.length >= 8;

console.log(`Пароль "${testPassword}" надійний: ${isStrongPassword(testPassword)}`);
console.log(`Пароль "abc" надійний: ${isStrongPassword('abc')}`);

// Видаляємо всі статичні картки-приклади з практикуму 2
document.querySelectorAll('.cards article').forEach(el => el.remove());

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

// Рендерить список нотаток у контейнер на основі масиву даних
function renderNotes(notesArray) {
    listContainer.innerHTML = '';

    notesArray.forEach((note, index) => {
        const card = document.createElement('article');
        const title = document.createElement('h3');
        const category = document.createElement('p');

        title.textContent = note.title;
        category.textContent = note.category;

        card.dataset.id = index + 1;
        card.classList.add(categoryToClass(note.category));

        card.append(title, category);
        listContainer.append(card);
    });
}

// Виклик рендеру з реальними даними при завантаженні сторінки
renderNotes(notes);

// Оновлення підсумкового лічильника кількості нотаток
notesCountEl.textContent = `Усього нотаток: ${notes.length}`;

// Вибір форми
const noteForm = document.querySelector('#note-form');
const titleInput = document.querySelector('#note-title');
const contentInput = document.querySelector('#note-content');
const charCounter = document.querySelector('#char-counter');

// Лічильник символів у полі введення нотатки
contentInput.addEventListener('input', () => {
    const maxLength = 300;
    const currentLength = contentInput.value.length;

    charCounter.textContent = `${currentLength} / ${maxLength}`;
    charCounter.classList.toggle('near-limit', maxLength - currentLength <= 30);
});

// Обрабка форми
noteForm.addEventListener('submit', event => {
    // скасування перезавантаження сторінки
    event.preventDefault();

    // зчитування значення полів
    const title = titleInput.value.trim();
    const excerpt = contentInput.value.trim();

    // Новий об'єкт та додавання його до масиву
    notes.push({ title: title, category: 'Загальне', excerpt: excerpt });

    // Оновлення рендеру та лічильника
    renderNotes(notes);
    notesCountEl.textContent = `Усього нотаток: ${notes.length}`;

    // Очищення полів форми та лічильника символів
    noteForm.reset();
    charCounter.textContent = '0 / 300';
    charCounter.classList.remove('near-limit');
});

// Вибір контейнера для перегляду нотатки (руга подія)
const noteViewer = document.querySelector('aside');

listContainer.addEventListener('click', event =>{
    const clickedCard = event.target.closest('article');
    if (!clickedCard){
        return;
    }
    
    const noteIndex = Number(clickedCard.dataset.id) - 1;
    const clickedNote = notes[noteIndex];

    noteViewer.innerHTML = `
        <h2>Перегляд обраної нотатки</h2>
        <h3>${clickedNote.title}</h3>
        <p>${clickedNote.category}</p>
    `;
});