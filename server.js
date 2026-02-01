const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Railway сам подставит нужный порт
const PORT = process.env.PORT || 3000;

// Временное хранилище (сообщения будут стерты при перезагрузке сервера)
let users = {}; 
let messages = [];

app.use(express.static(__dirname));
app.use(express.json());

app.post('/register', (req, res) => {
    const { user, pass } = req.body;
    if (!user || !pass) return res.json({ ok: false });
    users[user] = pass;
    console.log(`Новый юзер: ${user}`);
    res.json({ ok: true });
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] === pass) {
        res.json({ ok: true });
    } else {
        res.json({ ok: false, msg: "Ошибка входа" });
    }
});

app.get('/history', (req, res) => {
    res.json(messages.slice(-50));
});

io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('send-msg', (d) => {
        messages.push(d);
        io.emit('new-msg', d);
    });
});

// Слушаем на 0.0.0.0 (это исправит ошибку "failed to respond")
server.listen(PORT, '0.0.0.0', () => {
    console.log(`MARKGRAM OK! Порт: ${PORT}`);
});
