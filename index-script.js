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

function scrollToCard() {
  const input = parseInt(document.getElementById('searchInput').value);
  const target = document.getElementById('card-' + input);
  if (target) target.scrollIntoView({ behavior: 'smooth' });
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

  // Eliminar también en Google Sheets
  fetch("https://script.google.com/macros/s/AKfycbyOhKu4LPdOxLDgrWWNALkqAf0lCCV6F_brVBIXANyT6DHZz6et14NLqRmtjF9nlGxx/exec?delete=" + input, {
    method: "GET",
    mode: "no-cors"
  });
}
