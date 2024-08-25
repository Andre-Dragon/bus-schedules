import express from 'express';
import { DateTime } from 'luxon';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3000;
const app = express();
const timeZone = 'UTC';

// Получаем данные расписания
const loadBases = async () => {
  const data = await readFile(
    path.join(__dirname, 'database/buses.json'),
    'utf-8'
  );

  return JSON.parse(data);
};

// Высчитываем следующие время отправления
const getNextDeparture = (fdt, fm) => {
  const now = DateTime.now().setZone(timeZone);
  const [hours, minutes] = fdt.split(':').map(Number);
  let departure = DateTime.now()
    .set({
      hours,
      minutes
    })
    .setZone(timeZone);

  if (now > departure) {
    departure = departure.plus({ minutes: fm });
  }

  const endOfDay = DateTime.now()
    .set({
      hours: 23,
      minutes: 59,
      seconds: 59
    })
    .setZone(timeZone);

  if (departure > endOfDay) {
    departure = departure
      .startOf('day')
      .plus({ days: 1 })
      .set({ hours, minutes });
  }

  while (now > departure) {
    departure = departure.plus({ minutes: fm });

    if (departure > endOfDay) {
      departure = departure
        .startOf('day')
        .plus({ days: 1 })
        .set({ hours, minutes });
    }
  }

  return departure;
};

// Обновляем данные расписания автобусов
const sendUpdatedData = async () => {
  const buses = await loadBases();
  const updatedBuses = buses.map(bus => {
    const nextDeparture = getNextDeparture(
      bus.firstDepartureTime,
      bus.frequencyMinutes
    );

    return {
      ...bus,
      nextDeparture: {
        date: nextDeparture.toFormat('yyyy-MM-dd'),
        time: nextDeparture.toFormat('HH:mm:ss')
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

// Запуск локального сервера http://localhost:3000
app.listen(port, () => {
  console.log(`Ваш порт запущен на http://localhost:${port}`);
});
