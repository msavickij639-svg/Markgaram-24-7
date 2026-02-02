const WebSocket = require('ws');

// Railway сам подставит PORT, а если нет — будет 8080
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

wss.on('connection', (ws) => {
    console.log('Новое подключение! Бабайка не прошла.');

    ws.on('message', (message) => {
        try {
            // Распаковываем JSON-пакет
            const packet = JSON.parse(message);
            
            // Добавляем время к пакету
            packet.time = new Date().toLocaleTimeString();

            // Превращаем обратно в строку и шлем ВСЕМ
            const outgoingJSON = JSON.stringify(packet);
            
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(outgoingJSON);
                }
            });
        } catch (e) {
            console.log("Ошибка в пакете: Не JSON!");
        }
    });
});

console.log(`Сервер MarkGram летит на порту ${port}`);
