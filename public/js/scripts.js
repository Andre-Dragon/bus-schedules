const fetchBusData = async () => {
  try {
    const res = await fetch('/next-departure');

    if (!res.ok) {
      throw new Error(`http:// ошибка. Статус ошибки: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error(`Ошибка при получении данных: ${error}`);
  }
};

const formatDate = date => date.toISOString().split('T')[0];

const formatTime = date => date.toTimeString().split(' ')[0].slice(0, 8);

const getRemainingTimeHandler = timeDeparture => {
  const now = new Date();
  return Math.floor((Number(timeDeparture) - Number(now)) / 1000);
};

const createListBuses = ({
  busNumber,
  startPoint,
  endPoint,
  nextDeparture
}) => {
  const nextDepartureDateTimeUTC = new Date(
    `${nextDeparture.date}T${nextDeparture.time}Z`
  );
  const remainingTime = getRemainingTimeHandler(nextDepartureDateTimeUTC);

  const remainingTimeText =
    remainingTime < 60 ? 'В пути' : nextDeparture.remaining;

  return `
    <tr>
      <td>${busNumber}</td>
      <td>${startPoint} - ${endPoint}</td>
      <td>${formatDate(nextDepartureDateTimeUTC)}</td>
      <td>${formatTime(nextDepartureDateTimeUTC)}</td>
      <td>${remainingTimeText}</td>
    </tr>
  `;
};

const listBusesHandler = buses =>
  buses.map(bus => createListBuses(bus)).join('');

const renderBusData = buses => {
  const tableBody = document.querySelector('#bus tbody');
  tableBody.textContent = '';
  tableBody.insertAdjacentHTML('afterbegin', listBusesHandler(buses));
};

const addZeroHandler = n => (n < 10 ? `0${n}` : n);

const addTimeHandler = () => {
  const timeEl = document.getElementById('time');
  const d = new Date();
  const h = addZeroHandler(d.getHours());
  const m = addZeroHandler(d.getMinutes());
  const s = addZeroHandler(d.getSeconds());

  // timeEl.textContent = d.toTimeString().split(' ')[0];
  timeEl.textContent = `${h}:${m}:${s}`;
  setTimeout(addTimeHandler, 1000);
};

const initWebSocket = () => {
  const ws = new WebSocket(`ws://${location.host}`);

  ws.addEventListener('open', () => {
    console.log('Соединение WebSocket');
  });

  ws.addEventListener('message', event => {
    const buses = JSON.parse(event.data);
    renderBusData(buses);
  });

  ws.addEventListener('error', error => {
    console.error(`Ошибка WebSocket: ${error}`);
  });
  ws.addEventListener('close', () => {
    console.log('Соединение WebSocket закрыто');
  });
};

const init = async () => {
  addTimeHandler();
  const buses = await fetchBusData();
  renderBusData(buses);
  initWebSocket();
};

init();
