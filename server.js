const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let db;
(async () => {
    db = await open({ 
        filename: path.join(__dirname, 'markgram.db'), 
        driver: sqlite3.Database 
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, user TEXT UNIQUE, pass TEXT);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, sender TEXT, receiver TEXT, text TEXT, type TEXT);
    `);
    console.log("База Markgram запущена!");
})();

app.use(express.static(__dirname));
app.use(express.json());

app.post('/register', async (req, res) => {
    try {
        const { user, pass } = req.body;
        const hash = await bcrypt.hash(pass, 10);
        await db.run('INSERT INTO users (user, pass) VALUES (?, ?)', [user, hash]);
        res.json({ ok: true });
    } catch (e) { res.json({ ok: false, msg: "Логин занят" }); }
});

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    const userData = await db.get('SELECT * FROM users WHERE user = ?', [user]);
    if (userData && await bcrypt.compare(pass, userData.pass)) {
        res.json({ ok: true });
    } else { res.json({ ok: false, msg: "Ошибка входа" }); }
});

app.get('/history', async (req, res) => {
    const { target, me } = req.query;
    const rows = await db.all(`
        SELECT * FROM messages WHERE (sender = ? AND receiver = ? AND type = 'private') 
        OR (sender = ? AND receiver = ? AND type = 'private') 
        OR (receiver = ? AND type = 'channel') ORDER BY id ASC
    `, [me, target, target, me, target]);
    res.json(rows);
});

io.on('connection', (socket) => {
    socket.on('join', (user) => { socket.join(user); });
    socket.on('send-msg', async (data) => {
        await db.run('INSERT INTO messages (sender, receiver, text, type) VALUES (?,?,?,?)', 
            [data.from, data.to, data.msg, data.type]);
        if (data.type === 'private') {
            io.to(data.to).to(data.from).emit('new-msg', data);
        } else { io.emit('new-msg', data); }
    });
});

server.listen(PORT, () => console.log('Сервер летит на порту ' + PORT));
