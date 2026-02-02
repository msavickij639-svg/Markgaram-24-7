const WebSocket = require('ws');

// Railway выдает порт автоматически через process.env.PORT
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`Сервер запущен на порту ${port}`);

wss.on('connection', (ws) => {
    console.log('Кто-то подключился к MarkGram!');

    ws.on('message', (message) => {
        try {
            // Распаковываем JSON пакет
            const packet = JSON.parse(message);
            console.log(`Получен пакет от ${packet.name}`);

            // Рассылаем этот же пакет всем клиентам
            const broadcastData = JSON.stringify(packet);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastData);
                }
            });
        } catch (e) {
            console.log("Ошибка: Пришел кривой пакет, игнорируем.");
        }
    });

    ws.on('close', () => console.log('Клиент ушел.'));
});

