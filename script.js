// script.js – versión final organizada con panel y bloqueo manual
/*********************** CONFIG ************************/
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_URL  = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS';
const BLOQUE     = 50;
const WHATS_APP  = '584266404042';
const PANEL_PASS = 'joker123';

/*********************** ESTADO ************************/
let cartones = [], vendidos = new Set(), pintados = 0;
let drawn = new Set(), bolas = Array.from({length:75},(_,i)=>i+1), intervalo = null;

/********************* REFERENCIAS *********************/
const $ = s => document.querySelector(s);
const cont = $('#cartones-container'), loader = $('#loader');
const modal = $('#modal'), form = $('#form-reserva'), spanNum = $('#carton-numero'), inputID = $('#input-id'), btnDesc = $('#btn-descargar');
const panel = $('#panel'), btnToggle = $('#btn-toggle-panel'), btnUnlock = $('#btn-unlock'), pw = $('#password-input'), panelC = $('#panel-content');
const btnStart = $('#btn-start-draw'), btnStop = $('#btn-stop-draw'), curr = $('#current-ball'), hist = $('#history'), btnRestart = $('#btn-restart');
const modes = [...document.querySelectorAll('input[name="mode"]')];
const inputBlock = $('#input-block-carton'), btnBlock = $('#btn-block-carton');
const inputFree = $('#input-unreserve'), btnFree = $('#btn-unreserve');
const search = $('#search-input');

/*********************** INIT **************************/
window.addEventListener('DOMContentLoaded', init);
async function init() {
  try {
    const r = await fetch('cartones.json', {cache: 'no-store'});
    cartones = await r.json();
    cartones.sort((a, b) => a.id - b.id);
  } catch(e) {
    loader.textContent = '❌ cartones';
    return;
  }

  pintar();
  observar();

  try {
    const r = await fetch(SHEET_URL, {cache: 'no-store'});
    const d = await r.json();
    vendidos = new Set(d.filter(x => String(x.Estado || x.ESTADO) === 'RESERVADO').map(x => String(x.ID)));
    refrescar();
  } catch(e) {
    console.warn('❗ sin reservas', e);
  }
}

/********************* CARTONES ************************/
function crear({id, grid}) {
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id;
  art.innerHTML = `<h3>#${id.toString().padStart(4, '0')}</h3><div class="grid">${grid.flat().map(n => `<div class="cell" data-num="${n}">${n === 'FREE' ? '★' : n}</div>`).join('')}</div>`;
  if (vendidos.has(String(id))) {
    art.classList.add('vendido');
  } else {
    art.onclick = () => abrir(id);
  }
  return art;
}

function pintar() {
  const f = document.createDocumentFragment();
  for (let i = pintados; i < pintados + BLOQUE && i < cartones.length; i++) {
    f.appendChild(crear(cartones[i]));
  }
  pintados += BLOQUE;
  cont.appendChild(f);
  if (pintados >= cartones.length) loader.style.display = 'none';
}

function observar() {
  const s = document.createElement('div');
  cont.appendChild(s);
  new IntersectionObserver(e => e[0].isIntersecting && pintar()).observe(s);
}

function refrescar() {
  cont.querySelectorAll('.carton').forEach(c => {
    if (vendidos.has(c.dataset.id)) {
      c.classList.add('vendido');
    } else {
      c.classList.remove('vendido');
    }
  });
}

/******************** MODAL RESERVA ********************/
function abrir(id) {
  inputID.value = id;
  spanNum.textContent = id;
  modal.classList.remove('hidden');
}
function cerrar() {
  modal.classList.add('hidden');
  form.reset();
  btnDesc.classList.add('hidden');
}
window.cerrarModal = cerrar;

form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const id = fd.get('ID');
  if (vendidos.has(id)) {
    alert('Ya reservado');
    return;
  }
  enviar(fd, id);
});

function enviar(fd, id) {
  const ifr = document.createElement('iframe');
  ifr.name = 'hidden_iframe';
  ifr.style.display = 'none';
  document.body.appendChild(ifr);

  const f = document.createElement('form');
  f.action = WEBAPP_URL;
  f.method = 'POST';
  f.target = 'hidden_iframe';
  fd.forEach((v, k) => {
    const inp = document.createElement('input');
    inp.name = k;
    inp.value = v;
    f.appendChild(inp);
  });
  document.body.appendChild(f);
  f.submit();

  vendidos.add(id);
  refrescar();
  window.open(`https://wa.me/${WHATS_APP}?text=${encodeURIComponent('Hola, quiero comprar el cartón ' + id + ' y ya estoy por realizar el pago')}`, '_blank');
  btnDesc.classList.remove('hidden');
  btnDesc.onclick = () => jpg(id);
  cerrar();
}

function jpg(id) {
  const art = document.querySelector(`.carton[data-id="${id}"]`);
  html2canvas(art).then(c => {
    const a = document.createElement('a');
    a.href = c.toDataURL('image/jpeg');
    a.download = `carton_${id}.jpg`;
    a.click();
  });
}

/******************* PANEL CONTROL *********************/
btnToggle.onclick = () => panel.classList.toggle('hidden');

btnUnlock.onclick = () => {
  if (pw.value === PANEL_PASS) {
    panelC.classList.remove('hidden');
    pw.value = '';
  } else {
    alert('Contraseña incorrecta');
  }
};

btnBlock.onclick = () => {
  const id = inputBlock.value.trim();
  if (!id) return;
  vendidos.add(id);
  refrescar();
  alert('Bloqueado ' + id);
};

btnFree.onclick = () => {
  const id = inputFree.value.trim();
  if (!vendidos.has(id)) {
    alert('No reservado');
    return;
  }
  vendidos.delete(id);
  refrescar();
  alert('Liberado ' + id);
};

search.addEventListener('input', () => {
  const q = search.value.trim();
  cont.querySelectorAll('.carton').forEach(c => {
    c.style.display = c.dataset.id.startsWith(q) ? 'block' : 'none';
  });
});

/******************** SORTEO ***************************/
function letra(n) {
  return n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O';
}
function bola() {
  if (!bolas.length) {
    parar();
    alert('Fin del sorteo');
    return;
  }
  const i = Math.floor(Math.random() * bolas.length);
  const num = bolas.splice(i, 1)[0];
  drawn.add(num);
  curr.textContent = `${letra(num)} - ${num}`;
  const li = document.createElement('li');
  li.textContent = letra(num) + num;
  hist.prepend(li);
}

function marcar(n) {
  document.querySelectorAll(`.cell[data-num="${n}"]`).forEach(c => c.classList.add('marked'));
}

function iniciar() {
  if (intervalo) return;
  bola();
  intervalo = setInterval(() => {
    bola();
    marcar(curr.textContent.split(' - ')[1]);
  }, 4000);
  btnStart.disabled = true;
  btnStop.disabled = false;
}

function parar() {
  clearInterval(intervalo);
  intervalo = null;
  btnStart.disabled = false;
  btnStop.disabled = true;
}
btnStart.addEventListener('click', iniciar);
btnStop.addEventListener('click', parar);
btnRestart.addEventListener('click', () => {
  if (confirm('¿Reiniciar partida?')) {
    parar();
    bolas = Array.from({length:75},(_,i)=>i+1);
    hist.innerHTML = '';
    curr.textContent = '';
  }
});
