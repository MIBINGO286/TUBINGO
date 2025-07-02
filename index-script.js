// CONFIGURACIÓN
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec';
const CARTONES_JSON = 'cartones.json'; // Archivo JSON con los 1000 cartones
const WHATSAPP_NUM = '04266404042'; // Tu número para recibir reservas
const CARTONES_POR_CARGAR = 50;

// VARIABLES GLOBALES
let cartones = [];           // Todos los cartones del JSON
let cartonesVendidos = {};   // IDs reservados desde Google Sheets
let cartonesCargados = 0;    // Para control de carga progresiva

// DOM
const container = document.getElementById('cartonesContainer');
const loading = document.getElementById('loading');
const modalReserva = document.getElementById('modalReserva');
const formReserva = document.getElementById('formReserva');
const cartonNumSpan = document.getElementById('cartonNum');
const closeReservaBtn = document.getElementById('closeReserva');

let cartonSeleccionado = null;

// --- FUNCIONES ---

// Carga inicial
async function init() {
  await cargarCartonesVendidos();
  await cargarCartonesJSON();
  cargarCartonesALaVista();

  // Scroll para carga progresiva
  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
      cargarCartonesALaVista();
    }
  });
}

// Carga los cartones vendidos de Google Sheets vía opensheet.elk.sh
async function cargarCartonesVendidos() {
  try {
    const response = await fetch(`https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/Hoja%201`);
    const datos = await response.json();
    // Guardar IDs que están con Estado RESERVADO o VENDIDO
    datos.forEach(row => {
      if (row.Estado && (row.Estado.toUpperCase() === 'RESERVADO' || row.Estado.toUpperCase() === 'VENDIDO')) {
        cartonesVendidos[row.ID] = true;
      }
    });
  } catch (e) {
    console.error('Error cargando cartones vendidos:', e);
  }
}

// Carga el archivo JSON con todos los cartones
async function cargarCartonesJSON() {
  try {
    const response = await fetch(CARTONES_JSON);
    cartones = await response.json();
  } catch (e) {
    console.error('Error cargando cartones.json:', e);
  }
}

// Agrega al DOM los próximos cartones que faltan mostrar
function cargarCartonesALaVista() {
  if (cartonesCargados >= cartones.length) {
    loading.textContent = 'No hay más cartones para cargar.';
    return;
  }
  loading.style.display = 'block';

  const fragment = document.createDocumentFragment();

  for (let i = cartonesCargados; i < cartonesCargados + CARTONES_POR_CARGAR && i < cartones.length; i++) {
    const c = cartones[i];
    const id = c.ID.toString();

    const cartonDiv = document.createElement('div');
    cartonDiv.className = 'carton';
    cartonDiv.dataset.id = id;
    cartonDiv.dataset.vendido = cartonesVendidos[id] ? 'true' : 'false';
    cartonDiv.innerHTML = `
      <div class="numero-carton">#${id.padStart(4,'0')}</div>
      <table>
        <thead>
          <tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>
        </thead>
        <tbody>
          ${c.tablero.map(fila => '<tr>' + fila.map(num => `<td>${num || ''}</td>`).join('') + '</tr>').join('')}
        </tbody>
      </table>
      <div class="estado">${cartonesVendidos[id] ? 'VENDIDO' : 'DISPONIBLE'}</div>
    `;

    if (cartonesVendidos[id]) {
      cartonDiv.classList.add('vendido');
    } else {
      cartonDiv.addEventListener('click', () => abrirModalReserva(id));
    }

    fragment.appendChild(cartonDiv);
  }

  container.appendChild(fragment);
  cartonesCargados += CARTONES_POR_CARGAR;

  if (cartonesCargados >= cartones.length) {
    loading.textContent = 'Todos los cartones están cargados.';
  }
}

// Abrir modal con formulario para reservar cartón
function abrirModalReserva(id) {
  cartonSeleccionado = id;
  cartonNumSpan.textContent = id.padStart(4, '0');
  formReserva.reset();
  modalReserva.style.display = 'block';
}

// Cerrar modal
closeReservaBtn.onclick = () => {
  modalReserva.style.display = 'none';
  cartonSeleccionado = null;
};

// Enviar formulario de reserva
formReserva.onsubmit = async (e) => {
  e.preventDefault();

  if (!cartonSeleccionado) return alert('Selecciona un cartón.');

  const nombre = formReserva.nombre.value.trim();
  const apellido = formReserva.apellido.value.trim();
  const telefono = formReserva.telefono.value.trim();

  if (!nombre || !apellido || !telefono) {
    return alert('Por favor completa todos los campos.');
  }

  // Enviar reserva a Google Sheets via Apps Script (POST)
  try {
    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        ID: cartonSeleccionado,
        Estado: 'RESERVADO',
        Nombre: nombre,
        Apellido: apellido,
        Teléfono: telefono
      })
    });
    const text = await res.text();
    if (text !== 'OK') throw new Error('Error en la reserva');

    // Marcar como vendido en frontend para evitar doble compra
    cartonesVendidos[cartonSeleccionado] = true;
    actualizarEstadoCarton(cartonSeleccionado, 'VENDIDO');

    // Enviar mensaje a WhatsApp
    abrirWhatsApp(cartonSeleccionado, nombre, apellido, telefono);

    alert('¡Cartón reservado con éxito!');

    modalReserva.style.display = 'none';
    cartonSeleccionado = null;

  } catch (error) {
    alert('Error al reservar. Intenta de nuevo.');
    console.error(error);
  }
};

// Actualizar visualmente el estado del cartón
function actualizarEstadoCarton(id, estado) {
  const cartonDiv = document.querySelector(`.carton[data-id="${id}"]`);
  if (!cartonDiv) return;
  cartonDiv.classList.add('vendido');
  cartonDiv.dataset.vendido = 'true';
  const estadoDiv = cartonDiv.querySelector('.estado');
  if (estadoDiv) estadoDiv.textContent = estado;
  // Remover evento click para no reservar más
  cartonDiv.onclick = null;
}

// Abrir WhatsApp con mensaje prellenado para la reserva
function abrirWhatsApp(id, nombre, apellido, telefono) {
  const mensaje = encodeURIComponent(`Hola, quiero reservar el cartón #${id.padStart(4,'0')}.\nNombre: ${nombre}\nApellido: ${apellido}\nTeléfono: ${telefono}`);
  const url = `https://wa.me/58${WHATSAPP_NUM}?text=${mensaje}`;
  window.open(url, '_blank');
}

// Inicializar al cargar la página
window.onload = init;
