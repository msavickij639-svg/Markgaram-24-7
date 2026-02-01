const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Временное хранилище (пока сервер работает)
let users = {}; 
let messages = [];

app.use(express.static(__dirname));
app.use(express.json());

// Простая регистрация без сложных баз
app.post('/register', (req, res) => {
    const { user, pass } = req.body;
    users[user] = pass;
    res.json({ ok: true });
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] === pass) {
        res.json({ ok: true });
    } else {
        res.json({ ok: false, msg: "Ошибка" });
    }
});

app.get('/history', (req, res) => {
    res.json(messages.slice(-50)); // Отдаем последние 50 сообщений
});

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('send-msg', (d) => {
        messages.push(d);
        io.emit('new-msg', d);
    });
});

// Слушаем на 0.0.0.0 — это критически важно для Railway!
server.listen(PORT, '0.0.0.0', () => {
    console.log(`MARKGRAM IS READY ON PORT ${PORT}`);
});
