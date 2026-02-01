const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Railway ВСЕГДА дает порт через process.env.PORT
const PORT = process.env.PORT || 3000;

let users = {}; 
let messages = [];

app.use(express.static(__dirname));
app.use(express.json());

// ВАЖНО: Специальный маршрут, чтобы Railway видел, что сервер работает
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.post('/register', (req, res) => {
    const { user, pass } = req.body;
    if (!user || !pass) return res.json({ ok: false });
    users[user] = pass;
    res.json({ ok: true });
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    if (users[user] === pass) {
        res.json({ ok: true });
    } else {
        res.json({ ok: false });
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

// Слушаем на 0.0.0.0 — без этого Railway не пропустит трафик
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=== SERVER STARTED ===`);
    console.log(`PORT: ${PORT}`);
    console.log(`DOMAIN: ${process.env.RAILWAY_STATIC_URL || 'localhost'}`);
});
