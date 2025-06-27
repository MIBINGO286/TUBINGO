
let adminAuthenticated = false;
const drawnNumbers = new Set();
const totalCards = 1000;
const cards = [];
const gameMode = { current: 'linea' };
let autoDrawInterval = null;
let selectedCardNumber = null;
let staticCardsData = [];

async function loadCartones() {
  const res = await fetch('cartones.json');
  staticCardsData = await res.json();
  generateStaticCards();
}
window.addEventListener('DOMContentLoaded', loadCartones);

function generateStaticCards() {
  document.getElementById('cards').innerHTML = '';
  cards.length = 0;
  staticCardsData.forEach((data, i) => {
    createCard(i, data);
  });
}

function createCard(cardIndex, data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bingo-wrapper';
  wrapper.id = 'card-' + (cardIndex + 1);

  const label = document.createElement('div');
  label.className = 'bingo-label';
  label.textContent = 'Cartón ' + (cardIndex + 1);
  wrapper.appendChild(label);

  const cardDiv = document.createElement('div');
  cardDiv.className = 'bingo-card';
  cardDiv.dataset.index = cardIndex;
  cardDiv.onclick = () => openReservationModal(cardIndex + 1);

  const header = document.createElement('div');
  header.className = 'bingo-header';
  header.textContent = 'B I N G O';
  cardDiv.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'bingo-grid';

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = document.createElement('div');
      const value = data[col][row];
      cell.className = 'bingo-cell';
      if (value === 'FREE') {
        cell.textContent = 'LIBRE';
        cell.classList.add('free', 'marked');
      } else {
        cell.textContent = value;
      }
      grid.appendChild(cell);
    }
  }

  cardDiv.appendChild(grid);
  wrapper.appendChild(cardDiv);

  const isSold = localStorage.getItem('sold-' + (cardIndex + 1)) === 'true';
  if (isSold) {
    cardDiv.style.opacity = 0.5;
    label.textContent += ' (VENDIDO)';
  }

  document.getElementById('cards').appendChild(wrapper);
  cards.push({ element: cardDiv, data });
}

function drawNumber() {
  if (!adminAuthenticated) return alert("⚠️ Acceso denegado.");
  if (drawnNumbers.size >= 75) return;

  let number;
  do {
    number = Math.floor(Math.random() * 75) + 1;
  } while (drawnNumbers.has(number));
  drawnNumbers.add(number);

  const letter = getBingoLetter(number);
  const announcement = `${letter} ${number}`;
  document.getElementById('drawn-number').textContent = `Número sacado: ${announcement}`;
  speakNumber(announcement);
  updateDrawnNumbersHistory();
  markCards(number);

  if (checkForWinners()) {
    stopAutoDraw();
    document.getElementById('resetGameBtn').style.display = 'block';
  }
}

function getBingoLetter(number) {
  if (number <= 15) return 'B';
  if (number <= 30) return 'I';
  if (number <= 45) return 'N';
  if (number <= 60) return 'G';
  return 'O';
}

function speakNumber(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'es-ES';
  utter.rate = 0.9;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
}

function updateDrawnNumbersHistory() {
  const sorted = Array.from(drawnNumbers).sort((a, b) => a - b);
  document.getElementById('drawn-numbers-history').textContent = `Números: ${sorted.map(n => getBingoLetter(n) + n).join(', ')}`;
}

function markCards(number) {
  cards.forEach(card => {
    const grid = card.element.querySelectorAll('.bingo-cell');
    grid.forEach(cell => {
      if (parseInt(cell.textContent) === number) {
        cell.classList.add('marked');
      }
    });
  });
}

function setGameMode(mode) {
  gameMode.current = mode;
  alert(`Modo de juego: ${mode}`);
}

function checkForWinners() {
  let winnerFound = false;
  cards.forEach(card => {
    const cells = Array.from(card.element.querySelectorAll('.bingo-cell'));
    const grid = [...Array(5)].map((_, r) => cells.slice(r * 5, r * 5 + 5));
    let hasWon = false;

    if (gameMode.current === 'linea') {
      hasWon = grid.some(row => row.every(cell => cell.classList.contains('marked')));
    } else if (gameMode.current === 'horizontal') {
      for (let col = 0; col < 5; col++) {
        hasWon = [...Array(5).keys()].every(row => grid[row][col].classList.contains('marked'));
        if (hasWon) break;
      }
    } else if (gameMode.current === 'diagonal') {
      const d1 = [...Array(5).keys()].every(i => grid[i][i].classList.contains('marked'));
      const d2 = [...Array(5).keys()].every(i => grid[i][4 - i].classList.contains('marked'));
      hasWon = d1 || d2;
    } else if (gameMode.current === 'lleno') {
      hasWon = cells.every(cell => cell.classList.contains('marked') || cell.textContent === 'LIBRE');
    }

    if (hasWon) {
      winnerFound = true;
      card.element.style.borderColor = 'red';
      cards.forEach(c => {
        c.element.parentElement.style.display = (c === card) ? 'block' : 'none';
      });
      card.element.parentElement.scrollIntoView({ behavior: 'smooth' });
    }
  });
  return winnerFound;
}

function scrollToCard() {
  const input = parseInt(document.getElementById('searchInput').value);
  if (isNaN(input) || input < 1 || input > totalCards) {
    alert('Introduce un número de cartón válido (1 a ' + totalCards + ')');
    return;
  }
  cards.forEach(c => (c.element.parentElement.style.display = 'block'));
  const target = document.getElementById(`card-${input}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  } else {
    alert('Cartón no encontrado');
  }
}

function startAutoDraw() {
  if (!adminAuthenticated) return alert("⚠️ Acceso denegado.");
  if (autoDrawInterval) return;
  autoDrawInterval = setInterval(drawNumber, 3000);
}

function stopAutoDraw() {
  if (!adminAuthenticated) return alert("⚠️ Acceso denegado.");
  if (autoDrawInterval) {
    clearInterval(autoDrawInterval);
    autoDrawInterval = null;
  }
}

function resetGame() {
  if (!adminAuthenticated) return alert("⚠️ Acceso denegado.");
  drawnNumbers.clear();
  document.getElementById('drawn-number').textContent = '';
  document.getElementById('drawn-numbers-history').textContent = '';
  document.getElementById('resetGameBtn').style.display = 'none';
  cards.forEach(c => {
    c.element.parentElement.style.display = 'block';
    c.element.style.borderColor = '#333';
    const cells = c.element.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
      if (cell.textContent !== 'LIBRE') {
        cell.classList.remove('marked');
      }
    });
  });
}

function openReservationModal(cardNumber) {
  alert("Cartón seleccionado: " + cardNumber);
}


// === Funciones de reserva ===

function openReservationModal(cardNumber) {
  const isSold = localStorage.getItem(`sold-${cardNumber}`);
  if (isSold === 'true') {
    alert(`El cartón ${cardNumber} ya fue reservado.`);
    return;
  }
  selectedCardNumber = cardNumber;
  document.getElementById('modalCardNumber').textContent = cardNumber;
  document.getElementById('userName').value = '';
  document.getElementById('userPhone').value = '';
  document.getElementById('reservationModal').style.display = 'block';
}

function sendReservation() {
  const name = document.getElementById('userName').value.trim();
  const phone = document.getElementById('userPhone').value.trim();

  if (!name || !phone) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  const message = `Hola, quiero apartar el cartón número ${selectedCardNumber}.

Datos del comprador:
Nombre: ${name}
Teléfono: ${phone}
Ya realicé el pago.`;
  const encoded = encodeURIComponent(message);
  const waNumber = "584266404042";
  const waLink = `https://wa.me/${waNumber}?text=${encoded}`;

  guardarEnGoogleSheets(selectedCardNumber, name, phone);

  localStorage.setItem(`sold-${selectedCardNumber}`, 'true');
  const cardEl = document.getElementById(`card-${selectedCardNumber}`);
  if (cardEl) {
    cardEl.querySelector('.bingo-card').style.opacity = 0.5;
    cardEl.querySelector('.bingo-label').textContent += ' (VENDIDO)';
  }

  window.open(waLink, '_blank');
  closeModal();
}

function closeModal() {
  document.getElementById('reservationModal').style.display = 'none';
}

function guardarEnGoogleSheets(carton, nombre, telefono) {
  const url = "https://script.google.com/macros/s/AKfycbyOhKu4LPdOxLDgrWWNALkqAf0lCCV6F_brVBIXANyT6DHZz6et14NLqRmtjF9nlGxx/exec";

  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carton, nombre, telefono })
  })
  .then(() => console.log("✅ Reserva guardada en Google Sheets"))
  .catch((error) => console.error("❌ Error al guardar en Sheets:", error));
}


async function marcarCartonesVendidosDesdeGoogleSheets() {
  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbyOhKu4LPdOxLDgrWWNALkqAf0lCCV6F_brVBIXANyT6DHZz6et14NLqRmtjF9nlGxx/exec');
    const data = await res.json();
    if (!Array.isArray(data)) return;
    data.forEach(registro => {
      const num = parseInt(registro.carton);
      if (!isNaN(num)) {
        localStorage.setItem('sold-' + num, 'true');
      }
    });
  } catch (e) {
    console.error('❌ Error al cargar los cartones vendidos:', e);
  }
}

// Cargar marcados globales antes de generar cartones
window.addEventListener('DOMContentLoaded', async () => {
  await marcarCartonesVendidosDesdeGoogleSheets();
  await loadCartones();
});


// ========== SCROLL INFINITO PARA CARGA DIFERIDA DE CARTONES ==========

let cartonesRenderizados = 0;
const cantidadPorCarga = 50;

function generateStaticCards() {
  document.getElementById('cards').innerHTML = '';
  cards.length = 0;
  cartonesRenderizados = 0;
  cargarMasCartones();
}

function cargarMasCartones() {
  const total = staticCardsData.length;
  const fin = Math.min(cartonesRenderizados + cantidadPorCarga, total);
  for (let i = cartonesRenderizados; i < fin; i++) {
    createCard(i, staticCardsData[i]);
  }
  cartonesRenderizados = fin;
}

// Escucha de scroll para detectar si estamos al final de la página
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
    if (cartonesRenderizados < staticCardsData.length) {
      cargarMasCartones();
    }
  }
});


// ========== Buscador optimizado para scroll infinito ==========

async function scrollToCard() {
  const input = parseInt(document.getElementById('searchInput').value);
  if (isNaN(input) || input < 1 || input > totalCards) {
    alert('Introduce un número de cartón válido (1 a ' + totalCards + ')');
    return;
  }

  // Cargar hasta el cartón deseado si es necesario
  while (cartonesRenderizados < input) {
    cargarMasCartones();
    await new Promise(resolve => setTimeout(resolve, 10)); // evitar bloqueo
  }

  // Mostrar el cartón buscado
  cards.forEach(c => (c.element.parentElement.style.display = 'block'));
  const target = document.getElementById(`card-${input}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  } else {
    alert('Cartón no encontrado');
  }
}
