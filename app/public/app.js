const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const hint = document.getElementById('hint');
const list = document.getElementById('todo-list');
const statusLine = document.getElementById('status');

function setStatus(message) {
  statusLine.textContent = message || '';
}

// Task text supports **bold**, for example "Call **Sam** about the invoice".
function format(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function makeButton(className, label, id) {
  const button = document.createElement('button');
  button.className = className;
  button.textContent = label;
  button.dataset.id = id;
  return button;
}

async function loadSettings() {
  const res = await fetch('/api/settings');
  if (!res.ok) return;
  const settings = await res.json();
  input.maxLength = settings.maxTextLength;
  hint.textContent =
    'Up to ' + settings.maxTextLength + ' characters. Wrap words in **double asterisks** for bold.';
}

async function loadTodos() {
  const res = await fetch('/api/todos');
  if (!res.ok) {
    setStatus('Failed to load todos (HTTP ' + res.status + ')');
    return;
  }
  const todos = await res.json();
  list.replaceChildren();
  for (const todo of todos) {
    const li = document.createElement('li');
    li.className = todo.completed ? 'todo completed' : 'todo';

    const text = document.createElement('span');
    text.className = 'text';
    text.innerHTML = format(todo.text);

    const age = document.createElement('span');
    age.className = 'age';
    age.textContent = todo.age;

    const actions = document.createElement('span');
    actions.className = 'actions';
    actions.appendChild(makeButton('toggle', 'Done', todo.id));
    actions.appendChild(makeButton('delete', 'Delete', todo.id));

    li.append(text, age, actions);
    list.appendChild(li);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input.value })
  });
  if (!res.ok) {
    setStatus('Failed to add todo (HTTP ' + res.status + ')');
    return;
  }
  input.value = '';
  loadTodos();
});

list.addEventListener('click', async (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  setStatus('');

  if (event.target.classList.contains('toggle')) {
    const res = await fetch('/api/todos/' + id, { method: 'PUT' });
    if (!res.ok) {
      setStatus('Failed to update todo (HTTP ' + res.status + ')');
      return;
    }
    loadTodos();
  }

  if (event.target.classList.contains('delete')) {
    const res = await fetch('/api/todos/' + id, { method: 'DELETE' });
    if (!res.ok) {
      setStatus('Failed to delete todo (HTTP ' + res.status + ')');
      return;
    }
    loadTodos();
  }
});

loadSettings();
loadTodos();
