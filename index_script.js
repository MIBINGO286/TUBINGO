
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

function openReservationModal(cardNumber) {
  alert("Cartón seleccionado: " + cardNumber);
}
