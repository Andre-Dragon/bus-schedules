import express from 'express';
import { DateTime, Duration } from 'luxon';
import { readFile } from 'node:fs/promises';
import { WebSocketServer } from 'ws';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3000;
const app = express();
const timeZone = 'UTC';

// Получаем данные расписания
const loadBases = async () => {
  try {
    const data = await readFile(
    path.join(__dirname, 'database/buses.json'),
    'utf-8'
  );

  return JSON.parse(data);
  } catch (error) {
    console.error(error);
  }
};

// Высчитываем следующие время отправления
const getNextDeparture = (fdt, fm) => {
  const now = DateTime.now().setZone(timeZone);
  const [hour, minute, second] = fdt.split(':').map(Number);
  let departure = DateTime.now()
    .set({
      hour,
      minute,
      second,
      millisecond: 0
    })
    .setZone(timeZone);

  const endOfDay = DateTime.now()
    .set({
      hour: 23,
      minute: 59,
      second: 59
    })
    .setZone(timeZone);

  while (now > departure) {
    departure = departure.plus({ minutes: fm });

    if (departure > endOfDay) {
      departure = DateTime.now()
        .set({ hour, minute, second })
        .plus({ days: 1 })
        .setZone(timeZone);
    }
  }

  return departure;
};

// Обновляем данные расписания автобусов
const sendUpdatedData = async () => {
  const buses = await loadBases();
  const now = DateTime.now().setZone(timeZone);
  const updatedBuses = buses.map(bus => {
    const nextDeparture = getNextDeparture(
      bus.firstDepartureTime,
      bus.frequencyMinutes
    );

    const timeRemaining = Duration.fromMillis(
      nextDeparture.diff(now).toMillis()
    );

    return {
      ...bus,
      nextDeparture: {
        date: nextDeparture.toFormat('yyyy-MM-dd'),
        time: nextDeparture.toFormat('HH:mm:ss'),
        remaining: timeRemaining.toFormat('hh:mm:ss')
      }
    };
  });

  return updatedBuses;
};

// Сортировка по времени
const sortBuses = buses =>
  [...buses].sort(
    (a, b) =>
      Number(new Date(`${a.nextDeparture.date}T${a.nextDeparture.time}Z`)) -
      Number(new Date(`${b.nextDeparture.date}T${b.nextDeparture.time}Z`))
  );

// Запуск статических файлов в папке "public"
app.use(express.static(path.join(__dirname, 'public')));

// Запрос на станичку "next-departure"
app.get('/next-departure', async (req, res) => {
  try {
    const updatedBuses = await sendUpdatedData();
    const sortedBuses = sortBuses(updatedBuses);
    res.json(sortedBuses);
  } catch (error) {
    res.send('error');
  }
});

// Создаем WebSocketServer
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', ws => {
  console.log('Websocket соединился');
  clients.add(ws);

  const sendUpdates = async () => {
    try {
      const updatedBuses = await sendUpdatedData();
      const sortedBuses = sortBuses(updatedBuses);
      ws.send(JSON.stringify(sortedBuses));
    } catch (error) {
      console.error(`Ошибка соединения  websocket: ${error}`);
    }
  };

  const intervalId = setInterval(sendUpdates, 1000);

  ws.on('close', () => {
    clearInterval(intervalId);
    clients.delete(ws);
    console.log('Websocket закрыт');
  });
});

// Запуск локального сервера http://localhost:3000
const server = app.listen(port, () => {
  console.log(`Ваш порт запущен на http://localhost:${port}`);
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
});
