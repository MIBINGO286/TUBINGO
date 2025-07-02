const SHEET_ID = '1p-YXfD8bEEuqKw1jck6mITrRizMAy_qk5IMkl0QEWhg'; // tu hoja de Google Sheet
const SHEET_NAME = 'Hoja 1'; // pestaña
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzAfOn126VhY-ZCsX2s6-XjoqdNrRHYjZcAkSFYHlpT98d5va-lF1cG8XdNAyxxLc9b3g/exec'; // tu web app de Apps Script

let cartones = [], vendidos = new Set(), cargados = 0, cargando = false;

function cargarVendidos() {
  fetch(`https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`)
    .then(r => r.json())
    .then(data => {
      vendidos = new Set(data.map(d => d.ID));
      cargarMasCartones();
    });
}

function crearCarton(c) {
  const div = document.createElement('div');
  div.className = 'carton';
  div.innerHTML = '<h3>Cartón #' + c.id + '</h3><div class="grid">' +
    c.grid.map(fila => fila.map(n => `<div class="cell">${n}</div>`).join('')).join('') +
    '</div>';
  if (vendidos.has(String(c.id))) {
    div.classList.add('vendido');
  } else {
    div.onclick = () => abrirFormulario(c.id);
  }
  return div;
}

function cargarMasCartones() {
  if (cargando || cargados >= cartones.length) return;
  cargando = true;
  const cont = document.getElementById('cartones-container');
  const frag = document.createDocumentFragment();
  for (let i = cargados; i < cargados + 50 && i < cartones.length; i++) {
    frag.appendChild(crearCarton(cartones[i]));
  }
  cargados += 50;
  cont.appendChild(frag);
  cargando = false;
}

function abrirFormulario(id) {
  document.getElementById('formulario-reserva').classList.remove('hidden');
  document.getElementById('carton-numero').textContent = id;
  document.getElementById('input-id').value = id;
}
function cerrarFormulario() {
  document.getElementById('formulario-reserva').classList.add('hidden');
  document.getElementById('form-reserva').reset();
}

document.getElementByI
