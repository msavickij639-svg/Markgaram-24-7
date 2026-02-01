const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs'); 
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Railway сам подставит порт, если нет - берем 3000
const PORT = process.env.PORT || 3000;

let db;
(async () => {
    try {
        // База данных в папке /tmp (самое безопасное место на сервере)
        const dbPath = path.join('/tmp', 'markgram.db');
        db = await open({ 
            filename: dbPath, 
            driver: sqlite3.Database 
        });
        
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, user TEXT UNIQUE, pass TEXT);
            CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, sender TEXT, receiver TEXT, text TEXT, type TEXT);
        `);
        console.log("Markgram DB: OK");
    } catch (err) {
        console.error("DB Error:", err);
    }
})();

app.use(express.static(__dirname));
app.use(express.json());

// Маршруты
app.post('/register', async (req, res) => {
    try {
        const { user, pass } = req.body;
        const hash = await bcrypt.hash(pass, 10);
        await db.run('INSERT INTO users (user, pass) VALUES (?, ?)', [user, hash]);
        res.json({ ok: true });
    } catch (e) { res.json({ ok: false, msg: "Занято" }); }
});

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    const userData = await db.get('SELECT * FROM users WHERE user = ?', [user]);
    if (userData && await bcrypt.compare(pass, userData.pass)) {
        res.json({ ok: true });
    } else { res.json({ ok: false, msg: "Ошибка" }); }
});

app.get('/history', async (req, res) => {
    const { target, me } = req.query;
    try {
        const rows = await db.all(`
            SELECT * FROM messages WHERE (sender = ? AND receiver = ? AND type = 'private') 
            OR (sender = ? AND receiver = ? AND type = 'private') 
            OR (receiver = ? AND type = 'channel') ORDER BY id ASC
        `, [me, target, target, me, target]);
        res.json(rows);
    } catch (e) { res.json([]); }
});

// Сокеты
io.on('connection', (socket) => {
    socket.on('join', (u) => socket.join(u));
    socket.on('send-msg', async (d) => {
        try {
            await db.run('INSERT INTO messages (sender, receiver, text, type) VALUES (?,?,?,?)', 
                [d.from, d.to, d.msg, d.type]);
            io.to(d.to).to(d.from).emit('new-msg', d);
        } catch (e) {}
    });
});

// ВАЖНО: Слушаем на 0.0.0.0, чтобы Railway нас видел
server.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});
