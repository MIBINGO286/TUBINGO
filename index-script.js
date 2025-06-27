let cartones = [];
let totalCards = 1000;
let adminAuthenticated = false;
let currentMode = 'lleno';
let drawnNumbers = [];
let drawInterval = null;

// Cargar cartones
fetch("cartones.json")
  .then(res => res.json())
  .then(data => {
    cartones = data;
    renderCardsLazy(20);
    observeScroll();
  });

function renderCardsLazy(batchSize = 20) {
  let index = 0;
  const container = document.getElementById("cards");

  function renderBatch() {
    const limit = Math.min(index + batchSize, cartones.length);
    for (; index < limit; index++) {
      const wrapper = document.createElement("div");
      wrapper.id = "card-" + (index + 1);
      wrapper.className = "bingo-wrapper";
      wrapper.innerHTML = `
        <div class="bingo-label">Cartón #${index + 1}</div>
        <div class="bingo-card" onclick="checkWinner(${index + 1})">
          <div class="bingo-header">BINGO</div>
          <div class="bingo-grid">${
            cartones[index].flat().map(cell => `
              <div class="bingo-cell${cell === 'FREE' ? ' free' : ''}">${cell}</div>
            `).join("")
          }</div>
        </div>
      `;
      if (localStorage.getItem('sold-' + (index + 1)) === 'true') {
        wrapper.querySelector('.bingo-card').style.opacity = 0.5;
        wrapper.querySelector('.bingo-label').textContent += " (VENDIDO)";
      }
      container.appendChild(wrapper);
    }
  }
  renderBatch();
  window.renderNextBatch = renderBatch;
}

function observeScroll() {
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY + window.innerHeight;
    const totalHeight = document.body.scrollHeight;
    if (scrollY + 100 > totalHeight) window.renderNextBatch();
  });
}

function scrollToCard() {
  const input = parseInt(document.getElementById('searchInput').value);
  const target = document.getElementById('card-' + input);
  if (target) target.scrollIntoView({ behavior: 'smooth' });
}

function unlockAdminButtons() {
  const input = document.getElementById('adminPassword').value;
  if (input === "Jrr035$$*") {
    adminAuthenticated = true;
    document.querySelectorAll('.admin-only').forEach(btn => btn.style.display = "inline-block");
    alert("Controles desbloqueados.");
  } else {
    alert("Contraseña incorrecta.");
  }
}

function unmarkSoldCard() {
  const input = parseInt(document.getElementById('cartonNumberToUnmark').value);
  if (isNaN(input) || input < 1 || input > 1000) return alert("Número inválido.");
  localStorage.removeItem('sold-' + input);
  const cardEl = document.getElementById('card-' + input);
  if (cardEl) {
    cardEl.querySelector('.bingo-card').style.opacity = 1;
    const label = cardEl.querySelector('.bingo-label');
    if (label.textContent.includes(" (VENDIDO)")) {
      label.textContent = label.textContent.replace(" (VENDIDO)", "");
    }
    alert("Cartón " + input + " está disponible.");
  }
  fetch("https://script.google.com/macros/s/AKfycbyOhKu4LPdOxLDgrWWNALkqAf0lCCV6F_brVBIXANyT6DHZz6et14NLqRmtjF9nlGxx/exec?delete=" + input, {
    method: "GET",
    mode: "no-cors"
  });
}

// 🎱 Sorteo de números
function drawNumber() {
  if (drawnNumbers.length >= 75) return alert("Ya se han sorteado todos los números.");
  let n;
  do {
    n = Math.floor(Math.random() * 75) + 1;
  } while (drawnNumbers.includes(n));
  drawnNumbers.push(n);
  document.getElementById("drawn-number").textContent = "🎱 Número: " + n;
  document.getElementById("drawn-numbers-history").textContent = "Números: " + drawnNumbers.join(", ");
  const msg = new SpeechSynthesisUtterance("Número " + n);
  window.speechSynthesis.speak(msg);
}

function startAutoDraw() {
  if (drawInterval) return;
  drawInterval = setInterval(drawNumber, 3000);
}

function stopAutoDraw() {
  clearInterval(drawInterval);
  drawInterval = null;
}

function setGameMode(mode) {
  currentMode = mode;
  alert("Modo de juego: " + mode);
}

function resetGame() {
  if (!confirm("¿Estás seguro de reiniciar el juego?")) return;
  drawnNumbers = [];
  document.getElementById("drawn-number").textContent = "";
  document.getElementById("drawn-numbers-history").textContent = "";
  window.speechSynthesis.cancel();
}

// 🏆 Validación de ganador
function checkWinner(cardIndex) {
  const card = cartones[cardIndex - 1];
  const flat = card.flat().map(c => c === 'FREE' ? 'FREE' : Number(c));
  const isDrawn = c => c === 'FREE' || drawnNumbers.includes(c);

  const rows = card.map(row => row.map(c => c === 'FREE' ? 'FREE' : Number(c)));
  const cols = [0,1,2,3,4].map(i => rows.map(row => row[i]));
  const diag1 = [0,1,2,3,4].map(i => rows[i][i]);
  const diag2 = [0,1,2,3,4].map(i => rows[i][4 - i]);

  let won = false;
  if (currentMode === 'linea' || currentMode === 'horizontal') won = rows.some(r => r.every(isDrawn));
  else if (currentMode === 'diagonal') won = [diag1, diag2].some(d => d.every(isDrawn));
  else if (currentMode === 'lleno') won = flat.every(isDrawn);

  if (won) alert("🎉 ¡Este cartón ha GANADO en modo " + currentMode.toUpperCase() + "!");
  else alert("⛔ Este cartón aún no cumple las condiciones.");
}

// 📲 Modal reserva WhatsApp
function openReservationModal(cardNumber) {
  document.getElementById("modalCardNumber").textContent = cardNumber;
  document.getElementById("reservationModal").style.display = "block";
}

function closeModal() {
  document.getElementById("reservationModal").style.display = "none";
}

function sendReservation() {
  const cardNumber = document.getElementById("modalCardNumber").textContent;
  const name = document.getElementById("userName").value.trim();
  const phone = document.getElementById("userPhone").value.trim();
  if (!name || !phone) return alert("Completa tu nombre y teléfono");
  const url = `https://api.whatsapp.com/send?phone=+584266404042&text=Hola! Vengo a reservar el cartón ${cardNumber}. Mi nombre es: ${name}, y mi número es: ${phone}`;
  localStorage.setItem("sold-" + cardNumber, "true");
  closeModal();
  const cardEl = document.getElementById('card-' + cardNumber);
  if (cardEl) {
    cardEl.querySelector('.bingo-card').style.opacity = 0.5;
    const label = cardEl.querySelector('.bingo-label');
    if (!label.textContent.includes("(VENDIDO)")) label.textContent += " (VENDIDO)";
  }
  fetch("https://script.google.com/macros/s/AKfycbyOhKu4LPdOxLDgrWWNALkqAf0lCCV6F_brVBIXANyT6DHZz6et14NLqRmtjF9nlGxx/exec", {
    method: "POST",
    body: JSON.stringify({ carton: cardNumber, nombre: name, telefono: phone })
  });
  window.open(url, "_blank");
}
