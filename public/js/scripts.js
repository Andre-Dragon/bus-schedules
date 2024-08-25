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

const init = async () => {
  const buses = await fetchBusData();
  renderBusData(buses);
};

init();
