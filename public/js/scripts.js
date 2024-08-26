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

const formatTime = date => date.toTimeString().split(' ')[0].slice(0, 5);

const createListBuses = ({
  busNumber,
  startPoint,
  endPoint,
  nextDeparture
}) => {
  const nextDepartureDateTimeUTC = new Date(
    `${nextDeparture.date}T${nextDeparture.time}Z`
  );
  return `
    <tr>
      <td>${busNumber}</td>
      <td>${startPoint} - ${endPoint}</td>
      <td>${formatDate(nextDepartureDateTimeUTC)}</td>
      <td>${formatTime(nextDepartureDateTimeUTC)}</td>
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
  const s = addZeroHandler(d.getSeconds())

  timeEl.innerHTML = `${h}:${m}:${s}`;
  setTimeout(addTimeHandler, 1000);
};

const init = async () => {
  addTimeHandler();
  const buses = await fetchBusData();
  renderBusData(buses);
};

init();
