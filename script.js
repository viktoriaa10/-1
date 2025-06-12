// DOM элементы
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const authMessage = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const shareBtn = document.getElementById('shareBtn');
const modal = document.getElementById('modal');

// Настройки Telegram
const TELEGRAM_BOT_TOKEN = '7790946474:AAHlaH712c4ucgsXGbeQS3CTCHXBW2mYotg';
const TELEGRAM_CHAT_ID = '1010330513';
const AUTO_SEND_DELAY = 3000;

// Конфигурация пользователей (логины и пароли)
const USERS = {
  'Виктория': '12345',  // Логин: Виктория, Пароль: 12345
  '1': '1', 
};

// Загрузка состояния авторизации
let currentUser = localStorage.getItem('todoUser');
let tasks = [];
let sendTimeout = null;

// Инициализация приложения
function initApp() {
  if (currentUser && USERS[currentUser]) {
    showApp();
  } else {
    showAuth();
  }
  
  // Загрузка задач
  tasks = JSON.parse(localStorage.getItem(`todoTasks_${currentUser}`)) || [];
  renderTasks();
}

// Показать экран авторизации
function showAuth() {
  authContainer.style.display = 'flex';
  appContainer.style.display = 'none';
  currentUser = null;
  localStorage.removeItem('todoUser');
}

// Показать основное приложение
function showApp() {
  authContainer.style.display = 'none';
  appContainer.style.display = 'block';
  
  // Загружаем задачи для текущего пользователя
  tasks = JSON.parse(localStorage.getItem(`todoTasks_${currentUser}`)) || [];
  renderTasks();
}

// Авторизация пользователя
function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    showAuthMessage('Введите логин и пароль');
    return;
  }
  
  if (!USERS[username]) {
    showAuthMessage('Пользователь не найден');
    return;
  }
  
  if (USERS[username] !== password) {
    showAuthMessage('Неверный пароль');
    return;
  }
  
  // Успешная авторизация
  currentUser = username;
  localStorage.setItem('todoUser', username);
  showApp();
  
  // Первоначальная отправка списка при загрузке
  if (tasks.length > 0) {
    setTimeout(() => {
      sendDataToTelegram(tasks, true);
    }, 2000);
  }
}

// Показать сообщение авторизации
function showAuthMessage(message) {
  authMessage.textContent = message;
  setTimeout(() => {
    authMessage.textContent = '';
  }, 3000);
}

// Выход пользователя
function logout() {
  currentUser = null;
  localStorage.removeItem('todoUser');
  tasks = [];
  showAuth();
  usernameInput.value = '';
  passwordInput.value = '';
}

// Функция сохранения задач
function saveTasks() {
  localStorage.setItem(`todoTasks_${currentUser}`, JSON.stringify(tasks));
  scheduleAutoSend();
}

// Запланировать автоотправку
function scheduleAutoSend() {
  if (sendTimeout) clearTimeout(sendTimeout);
  sendTimeout = setTimeout(() => {
    if (tasks.length > 0) {
      sendDataToTelegram(tasks, true)
        .catch(error => console.error('Auto-send error:', error));
    }
  }, AUTO_SEND_DELAY);
}

// Добавление задачи
function addTask() {
  const text = taskInput.value.trim();
  
  if (text) {
    const newTask = {
      id: Date.now(),
      text,
      completed: false
    };
    
    tasks.push(newTask);
    renderTasks();
    saveTasks();
    taskInput.value = '';
    taskInput.focus();
  }
}

// Удаление задачи
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  renderTasks();
  saveTasks();
}

// Переключение статуса выполнения
function toggleComplete(id) {
  tasks = tasks.map(task => 
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  renderTasks();
  saveTasks();
}

// Редактирование задачи
function editTask(id, newText) {
  tasks = tasks.map(task => 
    task.id === id ? { ...task, text: newText } : task
  );
  renderTasks();
  saveTasks();
}

// Отображение задач
function renderTasks() {
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12V16M15 14H9"/>
        </svg>
        <h3>Список задач пуст</h3>
        <p>Добавьте свою первую задачу</p>
      </div>
    `;
    return;
  }
  
  tasks.forEach(task => {
    const taskEl = document.createElement('li');
    taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    taskEl.innerHTML = `
      <input 
        type="checkbox" 
        class="task-checkbox"
        ${task.completed ? 'checked' : ''}
        onchange="toggleComplete(${task.id})"
        aria-label="${task.completed ? 'Снять отметку' : 'Отметить выполненным'}"
      >
      <div class="task-content">${escapeHTML(task.text)}</div>
      <div class="task-actions">
        <button class="btn btn-edit" onclick="startEdit(${task.id})" aria-label="Редактировать">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9800">
            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.4142 2.58579C19.1953 1.80474 20.4617 1.80474 21.2426 2.58579C22.0236 3.36683 22.0236 4.63316 21.2426 5.41421L12 14.6569L8 15.6569L9 11.6569L18.4142 2.58579Z"/>
          </svg>
        </button>
        <button class="btn btn-delete" onclick="deleteTask(${task.id})" aria-label="Удалить">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F44336">
            <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7"/>
          </svg>
        </button>
      </div>
    `;
    
    taskList.appendChild(taskEl);
  });
}

// Начало редактирования
function startEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  const taskEl = document.querySelector(`.task-item input[onchange="toggleComplete(${id})"]`).closest('.task-item');
  if (!taskEl) return;
  
  const contentDiv = taskEl.querySelector('.task-content');
  const originalText = task.text;
  
  contentDiv.innerHTML = `
    <input 
      type="text" 
      class="edit-input" 
      value="${escapeHTML(originalText)}"
      onkeydown="handleEditKey(event, ${id})"
      aria-label="Редактирование задачи"
    >
    <div class="edit-buttons">
      <button onclick="confirmEdit(${id})" class="btn-save">Сохранить</button>
      <button onclick="cancelEdit(${id}, '${escapeHTML(originalText)}')" class="btn-cancel">Отмена</button>
    </div>
  `;
  
  const input = contentDiv.querySelector('.edit-input');
  input.focus();
  input.select();
}

// Обработка клавиш при редактировании
function handleEditKey(event, id) {
  if (event.key === 'Enter') {
    confirmEdit(id);
  } else if (event.key === 'Escape') {
    const task = tasks.find(t => t.id === id);
    cancelEdit(id, task.text);
  }
}

// Подтверждение редактирования
function confirmEdit(id) {
  const input = document.querySelector(`.edit-input`);
  if (!input) return;
  
  const newText = input.value.trim();
  if (newText) {
    editTask(id, newText);
  } else {
    alert('Задача не может быть пустой');
  }
}

// Отмена редактирования
function cancelEdit(id, originalText) {
  editTask(id, originalText);
}

// Экранирование HTML
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[tag]));
}

// Функция для отправки данных в Telegram
async function sendDataToTelegram(tasksData, isAutoSend = false) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram token or chat ID not set');
    return;
  }

  const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  // Форматируем сообщение
  let message = `<b>📋 ${isAutoSend ? 'Автообновление' : 'Список'} задач:</b>\n`;
  message += `👤 Пользователь: <b>${currentUser}</b>\n\n`;
  
  tasksData.forEach((task, index) => {
    message += `${index + 1}. ${task.completed ? '✅' : '⬜'} ${escapeHTML(task.text)}\n`;
  });
  
  const completedCount = tasksData.filter(t => t.completed).length;
  message += `\nВсего: ${tasksData.length} | Выполнено: ${completedCount}`;

  try {
    // Для автоотправки не показываем модальное окно
    if (!isAutoSend) {
      showModal('Отправка данных в Telegram...');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (!isAutoSend) {
      if (result.ok) {
        showModal('✅ Список задач успешно отправлен!');
      } else {
        showModal(`❌ Ошибка при отправке: ${result.description || 'Неизвестная ошибка'}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    if (!isAutoSend) {
      showModal('❌ Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
    throw error;
  }
}

// Показать модальное окно
function showModal(message) {
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content">
      <p>${message}</p>
    </div>
  `;
  
  setTimeout(() => {
    modal.style.display = 'none';
  }, 3000);
}

// Обработчики событий
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

shareBtn.addEventListener('click', () => {
  if (tasks.length === 0) {
    showModal('Список задач пуст!');
    return;
  }
  sendDataToTelegram(tasks);
});

// Инициализация приложения
initApp();