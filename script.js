/*  =========  CONFIGURACIÓN  =========  */
const API_URL  = 'https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec';
const CARTONES_JSON = 'bingo_cards.json';      // pon aquí tu archivo de 1000 cartones
const BLOQUE = 50;                             // cartones por carga
const whatsappBase = 'https://wa.me/584266404042?text=Hola,%20quiero%20comprar%20el%20cart%C3%B3n%20n%C3%BAmero%20';

/*  =========  ESTADO  =========  */
let cartones  = [];
let vendidos  = new Set();
let pintados  = 0;
let cargando  = false;

/*  =========  ELEMENTOS DOM  =========  */
const contenedor = document.getElementById('cartones-container');
const loader     = document.getElementById('loader');
const modal      = document.getElementById('modal');
const formRes    = document.getElementById('form-reserva');
const spanNum    = document.getElementById('carton-numero');
const inputID    = document.getElementById('input-id');

/*  =========  INICIO  =========  */
window.addEventListener('DOMContentLoaded', async () => {
  await cargarCartones();
  await cargarVendidos();
  pintarBloque();
  observarScroll();
});

/*  =========  CARGA DE CARTONES  =========  */
async function cargarCartones() {
  cartones = await fetch(CARTONES_JSON).then(r => r.json());
}

/*  =========  RESERVAS EXISTENTES  =========  */
async function cargarVendidos() {
  try {
    const data = await fetch(API_URL).then(r => r.json());
    vendidos = new Set(
      (data.reservas || [])
        .filter(r => r.ESTADO === 'RESERVADO')
        .map(r => String(r.ID))
    );
  } catch (err) {
    console.warn('No pude obtener reservas:', err);
  }
}

/*  =========  RENDER  =========  */
function crearCarton({ id, grid }) {
  const art = document.createElement('article');
  art.className = 'carton';
  art.dataset.id = id;

  art.innerHTML = `
    <h3>#${String(id).padStart(4, '0')}</h3>
    <div class="grid">
      ${grid.flat().map(c => `<div class="cell">${c === 'FREE' ? '★' : c}</div>`).join('')}
    </div>
  `;

  if (vendidos.has(String(id))) {
    art.classList.add('vendido');
  } else {
    art.addEventListener('click', () => abrirModal(id));
  }
  return art;
}

function pintarBloque() {
  if (cargando || pintados >= cartones.length) return;
  cargando = true;

  const frag = document.createDocumentFragment();
  for (let i = pintados; i < pintados + BLOQUE && i < cartones.length; i++) {
    frag.appendChild(crearCarton(cartones[i]));
  }
  pintados += BLOQUE;
  contenedor.appendChild(frag);

  cargando = false;
  if (pintados >= cartones.length) loader.style.display = 'none';
}

function observarScroll() {
  const sentinel = document.createElement('div');
  contenedor.appendChild(sentinel);
  new IntersectionObserver(e => {
    if (e[0].isIntersecting) pintarBloque();
  }).observe(sentinel);
}

/*  =========  MODAL  =========  */
function abrirModal(id) {
  inputID.value = id;
  spanNum.textContent = id;
  modal.classList.remove('hidden');
}
function cerrarModal() {
  modal.classList.add('hidden');
  formRes.reset();
}
window.cerrarModal = cerrarModal;

/*  =========  RESERVAR (Sheets + WhatsApp)  =========  */
formRes.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(formRes);

  // 1) Guardar en Google Sheets
  const payload = {
    action:  'reserve',
    ID:      fd.get('ID'),
    Nombre:  fd.get('Nombre'),
    Apellido:fd.get('Apellido'),
    Telefono:fd.get('Teléfono')
  };

  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  }).then(r => r.json());

  if (!res.ok) {
    alert('No se pudo registrar: ' + (res.error || ''));
    return;
  }

  // 2) Marcar como vendido en la interfaz
  vendidos.add(payload.ID);
  contenedor.querySelector(`.carton[data-id="${payload.ID}"]`)?.classList.add('vendido');

  // 3) Redirigir a WhatsApp
  window.open(`${whatsappBase}${payload.ID}`, '_blank');

  cerrarModal();
});
