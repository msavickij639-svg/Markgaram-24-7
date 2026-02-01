const express = require('express');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Хранилище в памяти
let users = {}; 
let messages = [];

app.use(express.static(__dirname));
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Проверка для Railway (Health Check)
app.get('/health', (req, res) => res.send('OK'));

app.post('/register', (req, res) => {
    const { user, pass } = req.body;
    users[user] = pass;
    res.json({ ok: true });
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] === pass) res.json({ ok: true });
    else res.json({ ok: false });
});

app.get('/history', (req, res) => {
    res.json(messages.slice(-50));
});

// Запускаем сервер
const expressServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`MARKGRAM ONLINE: http://0.0.0.0:${PORT}`);
});

// Подключаем Socket.io к запущенному серверу
const io = new Server(expressServer);

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('send-msg', (d) => {
        messages.push(d);
        io.emit('new-msg', d);
    });
});
