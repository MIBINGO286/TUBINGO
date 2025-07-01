let cartones = [];
let totalCards = 1000;
let adminAuthenticated = false;
let currentMode = 'lleno';
let drawnNumbers = [];
let drawInterval = null;

// --- ¡IMPORTANTE! REEMPLAZA ESTA URL con la URL de tu Google Apps Script desplegado ---
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwEk757_Gw8Le8-qyghCdQiI_1IZt24A9196X1QT-kACCJ-98EW5FvZZhAB1MqowQdkw/exec'; // Tu URL de ejemplo, ¡asegúrate que es la correcta después del redeploy!


// Cargar cartones.json (o puedes modificar esto para que venga de Apps Script también)
fetch("cartones.json")
  .then(res => res.json())
  .then(data => {
    cartones = data;
    renderCardsLazy(20);
    observeScroll();
    // Opcional: También podrías cargar el estado de "vendido" desde Apps Script en lugar de localStorage
    // getSoldCardsStatusFromAppsScript();
  })
  .catch(error => {
    console.error("Error al cargar cartones.json:", error);
    alert("Error al cargar los cartones. Por favor, recarga la página.");
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
      
      // Aquí usamos el estado guardado en localStorage, idealmente vendría de Apps Script
      const isSold = localStorage.getItem('sold-' + (index + 1)) === 'true';

      wrapper.innerHTML = `
        <div class="bingo-label">Cartón #${index + 1}${isSold ? " (VENDIDO)" : ""}</div>
        <div class="bingo-card${isSold ? " sold-card" : ""}" onclick="openReservationModal(${index + 1})">
          <div class="bingo-header">BINGO</div>
          <div class="bingo-grid">${
            cartones[index].flat().map(cell => `
              <div class="bingo-cell${cell === 'FREE' ? ' free' : ''}">${cell}</div>
            `).join("")
          }</div>
        </div>
      `;
      // Aplicar estilos para cartones vendidos
      if (isSold) {
        // En lugar de style.opacity, usa una clase CSS para mejor manejo
        // wrapper.querySelector('.bingo-card').style.opacity = 0.5;
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
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' }); // block: 'center' para centrar
  } else {
    alert(`Cartón #${input} no encontrado.`);
  }
}

function unlockAdminButtons() {
  const input = document.getElementById('adminPassword').value;
  if (input === "Jrr035$$*") { // Esta clave es solo para el frontend
    adminAuthenticated = true;
    document.querySelectorAll('.admin-only').forEach(btn => btn.style.display = "inline-block");
    alert("Controles de administrador desbloqueados.");
  } else {
    alert("Contraseña incorrecta.");
  }
}

// --- FUNCIÓN MODIFICADA: Desmarcar/Liberar Cartón (ahora habla con Apps Script) ---
async function unmarkSoldCard() {
  if (!adminAuthenticated) {
    return alert("Debes autenticarte como administrador primero.");
  }
  const input = parseInt(document.getElementById('cartonNumberToUnmark').value);
  if (isNaN(input) || input < 1 || input > totalCards) { // totalCards para consistencia
    return alert("Número de cartón inválido.");
  }

  if (!confirm(`¿Estás seguro de liberar el cartón #${input}? Esto lo hará disponible.`)) return;

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      // ¡IMPORTANTE! Envía la acción 'resetCard' y la clave de administrador
      body: JSON.stringify({
        action: "resetCard", // Nueva acción en Apps Script para liberar 1 cartón
        id: input,
        secret: "Jrr035$$*" // Envía la clave de admin para autorizar la acción
      })
    });
    const data = await response.json();

    if (data.ok) {
      localStorage.removeItem('sold-' + input); // Eliminar de localStorage
      const cardEl = document.getElementById('card-' + input);
      if (cardEl) {
        cardEl.querySelector('.bingo-card').classList.remove('sold-card'); // Quitar clase de vendido
        const label = cardEl.querySelector('.bingo-label');
        label.textContent = label.textContent.replace(" (VENDIDO)", "");
      }
      alert(`Cartón #${input} ha sido liberado y está disponible.`);
    } else {
      alert(`Error al liberar cartón: ${data.error}`);
      console.error("Error al liberar cartón:", data.error);
    }
  } catch (error) {
    console.error("Error de red al intentar liberar cartón:", error);
    alert("Error de conexión. Intenta de nuevo.");
  }
}

// --- FUNCIÓN MODIFICADA: Enviar Reserva (ahora usa Apps Script para todo) ---
async function sendReservation() {
  const cardNumber = document.getElementById("modalCardNumber").textContent;
  const name = document.getElementById("userName").value.trim();
  const lastName = document.getElementById("userLastName").value.trim(); // Asume que tienes un campo para el apellido
  const phone = document.getElementById("userPhone").value.trim();

  if (!name || !lastName || !phone) { // Incluye el apellido en la validación
    return alert("Completa tu nombre, apellido y teléfono.");
  }

  // Confirmar si el cartón ya está marcado como vendido localmente para evitar envíos duplicados
  if (localStorage.getItem('sold-' + cardNumber) === 'true') {
      alert(`El cartón #${cardNumber} ya está marcado como vendido localmente.`);
      closeModal();
      return;
  }

  // Deshabilitar botón para evitar múltiples envíos
  const btnSend = document.getElementById('btnSendReservation');
  if (btnSend) btnSend.disabled = true;

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors', // Necesario para peticiones a otros dominios
      headers: {
        'Content-Type': 'application/json'
      },
      // ¡IMPORTANTE! Envía los datos en el formato que espera tu Google Apps Script
      body: JSON.stringify({
        action: "reserve", // La acción que el Apps Script espera
        id: Number(cardNumber),
        nombre: name,
        apellido: lastName, // Envía el apellido
        telefono: phone
      })
    });
    const data = await response.json(); // Parsea la respuesta JSON

    if (data.ok) {
      localStorage.setItem("sold-" + cardNumber, "true"); // Marcar localmente
      const cardEl = document.getElementById('card-' + cardNumber);
      if (cardEl) {
        cardEl.querySelector('.bingo-card').classList.add('sold-card'); // Añadir clase de vendido
        const label = cardEl.querySelector('.bingo-label');
        if (!label.textContent.includes("(VENDIDO)")) label.textContent += " (VENDIDO)";
      }
      alert(`¡Cartón #${cardNumber} reservado con éxito!`);
      if (data.whatsapp_sent) {
          console.log("Mensaje de WhatsApp enviado por el servidor.");
      } else {
          console.warn("Mensaje de WhatsApp no enviado por el servidor (verificar configuración de API).");
      }
      closeModal();
    } else {
      alert(`Error al reservar cartón: ${data.error}`);
      console.error("Error en la reserva:", data.error);
    }
  } catch (error) {
    console.error("Error de red al enviar reserva:", error);
    alert("Error de conexión. Intenta de nuevo.");
  } finally {
      if (btnSend) btnSend.disabled = false; // Habilitar el botón nuevamente
  }
}


function drawNumber() {
  if (drawnNumbers.length >= 75) return alert("Todos los números han sido sorteados.");
  let n;
  do {
    n = Math.floor(Math.random() * 75) + 1;
  } while (drawnNumbers.includes(n));
  drawnNumbers.push(n);
  document.getElementById("drawn-number").textContent = "🎱 Número: " + n;
  document.getElementById("drawn-numbers-history").textContent = "Números: " + drawnNumbers.join(", ");
  const msg = new SpeechSynthesisUtterance("Número " + n);
  window.speechSynthesis.speak(msg);
  updateMarkedNumbers();
}

function updateMarkedNumbers() {
  document.querySelectorAll(".bingo-wrapper").forEach(wrapper => {
    const cells = wrapper.querySelectorAll(".bingo-cell");
    cells.forEach(cell => {
      const value = cell.textContent;
      if (value !== "FREE" && drawnNumbers.includes(Number(value))) {
        cell.classList.add("marked");
      }
    });
  });
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
  document.querySelectorAll(".marked").forEach(el => el.classList.remove("marked"));
  
  // Puedes añadir un llamado a Apps Script para resetear los estados en la hoja si es necesario
  // Por ejemplo, si tienes una acción "resetGameData" en tu script de Apps Script
  // fetch(GOOGLE_APPS_SCRIPT_URL, {
  //   method: 'POST',
  //   mode: 'cors',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ action: "resetAll", secret: "Jrr035$$*" }) // Usar con precaución y solo si adminAuthenticated
  // });
}

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

function openReservationModal(cardNumber) {
  // Opcional: antes de abrir el modal, puedes verificar el estado del cartón desde Apps Script
  // para asegurarte de que no está vendido por otro usuario.
  const isSoldLocally = localStorage.getItem('sold-' + cardNumber) === 'true';
  const cardEl = document.getElementById('card-' + cardNumber);

  if (isSoldLocally || (cardEl && cardEl.querySelector('.bingo-card').classList.contains('sold-card'))) {
    alert(`El cartón #${cardNumber} ya está vendido.`);
    return;
  }

  document.getElementById("modalCardNumber").textContent = cardNumber;
  document.getElementById("reservationModal").style.display = "block";
}

function closeModal() {
  document.getElementById("reservationModal").style.display = "none";
  // Limpiar campos del modal al cerrar
  document.getElementById("userName").value = "";
  document.getElementById("userLastName").value = ""; // Asegúrate de limpiar también el apellido
  document.getElementById("userPhone").value = "";
}

// Agrega estas funciones para manejar la autenticación del administrador si no las tienes
document.addEventListener('DOMContentLoaded', () => {
    // Escucha para el botón de desbloqueo de admin
    const adminUnlockBtn = document.getElementById('adminUnlockBtn'); // Asume un botón con este ID
    if (adminUnlockBtn) {
        adminUnlockBtn.addEventListener('click', unlockAdminButtons);
    }

    // Escucha para el botón de desmarcar
    const unmarkCardBtn = document.getElementById('unmarkCardBtn'); // Asume un botón con este ID
    if (unmarkCardBtn) {
        unmarkCardBtn.addEventListener('click', unmarkSoldCard);
    }
});
