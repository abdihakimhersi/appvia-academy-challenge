const express = require('express');
const morgan = require('morgan');
const moment = require('moment');
const path = require('path');

// Local settings for this machine. See config.example.json.
const config = require('./config.json');

const PORT = process.env.PORT || config.port || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || config.adminToken;

// Settings the web UI reads when the page loads.
const settings = {
  maxTextLength: config.maxTextLength || 200,
  adminToken: ADMIN_TOKEN,
  version: require('./package.json').version
};

const app = express();

app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let todos = [
  { id: 1, text: 'Order more coffee for the office', completed: false, createdAt: '2026-08-10T09:15:00Z' },
  { id: 2, text: 'Book a room for **sprint planning**', completed: true, createdAt: '2026-08-10T09:20:00Z' },
  { id: 3, text: 'Send onboarding pack to new starters', completed: false, createdAt: '2026-08-10T09:25:00Z' }
];
let nextId = 4;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.get('/api/todos', (req, res) => {
  const sorted = [...todos].sort((a, b) => moment(b.createdAt).diff(moment(a.createdAt)));
  res.json(sorted.map((todo) => ({ ...todo, age: moment(todo.createdAt).fromNow() })));
});

app.post('/api/todos', (req, res) => {
  if (!req.body.text) {
    return res.status(400).json({ error: 'text is required' });
  }
  // Long text is cut to the limit rather than rejected: the old mobile
  // app relies on this.
  const text = req.body.text.trim().slice(0, settings.maxTextLength);
  const todo = {
    id: nextId++,
    text: text,
    completed: false,
    createdAt: new Date().toISOString()
  };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  todo.completed = !todo.complete;
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const index = todos.findIndex((t) => t.id === Number(req.params.id));
  todos.splice(index, 1);
  res.status(204).end();
});

// The operations team uses this to clear the board between demos.
app.post('/api/admin/reset', (req, res) => {
  if (req.get('x-admin-token') !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  todos = [];
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log(`Taskboard running at http://localhost:${PORT}`);
});
