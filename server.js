const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let db;
(async () => {
    // Открываем базу данных (создастся файл markgram.db)
    db = await open({ filename: 'markgram.db', driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, user TEXT UNIQUE, pass TEXT);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, sender TEXT, receiver TEXT, text TEXT, type TEXT);
    `);
})();

app.use(express.static(__dirname));
app.use(express.json());

// Регистрация
app.post('/register', async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.pass, 10);
        await db.run('INSERT INTO users (user, pass) VALUES (?, ?)', [req.body.user, hash]);
        res.json({ ok: true });
    } catch { res.json({ ok: false, msg: "Этот логин уже занят" }); }
});

// Вход
app.post('/login', async (req, res) => {
    const user = await db.get('SELECT * FROM users WHERE user = ?', [req.body.user]);
    if (user && await bcrypt.compare(req.body.pass, user.pass)) {
        res.json({ ok: true });
    } else { res.json({ ok: false, msg: "Неверный логин или пароль" }); }
});

// Загрузка истории (Исправлено для имен с пробелами)
app.get('/history', async (req, res) => {
    const { target, me } = req.query;
    try {
        const rows = await db.all(`
            SELECT * FROM messages 
            WHERE (sender = ? AND receiver = ? AND type = 'private') 
               OR (sender = ? AND receiver = ? AND type = 'private') 
               OR (receiver = ? AND type = 'channel')
        `, [me, target, target, me, target]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка базы данных" });
    }
});

io.on('connection', (socket) => {
    socket.on('join', (user) => { socket.join(user); });
    
    socket.on('send-msg', async (data) => {
        await db.run('INSERT INTO messages (sender, receiver, text, type) VALUES (?,?,?,?)', 
            [data.from, data.to, data.msg, data.type]);
        
        if (data.type === 'private') {
            io.to(data.to).to(data.from).emit('new-msg', data);
        } else {
            io.emit('new-msg', data);
        }
    });
});

server.listen(3000, () => console.log('Markgram летит на http://localhost:3000'));