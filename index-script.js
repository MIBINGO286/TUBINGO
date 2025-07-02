// -- CONFIGURACIÓN -- 
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec';
const CARTONES_JSON = 'cartones.json';
const WHATSAPP_NUM = '04266404042';
const PASSWORD = 'Jrr035$$*';

const CARTONES_POR_CARGAR = 50;

// -- VARIABLES GLOBALES --
let cartones = [];
let cartonesVendidos = {};
let cartonesCargados = 0;
let cartonSeleccionado = null;

let numerosSacados = new Set();
let intervaloSorteo = null;
let modoJuego = null;

// -- ELEMENTOS DOM --
const container = document.getElementById('cartonesContainer');
const loading = document.getElementById('loading');
const modalReserva = document.getElementById('modalReserva');
const formReserva = document.getElementById('formReserva');
const cartonNumSpan = document.getElementById('cartonNum');
const closeReservaBtn = document.getElementById('closeReserva');

const panelControl = document.getElementById('menuPanelControl');
const btnDesbloquear = document.getElementById('btnDesbloquear');
const inputPassword = document.getElementById('inputPassword');
const btnSacarNumeros = document.getElementById('btnSacarNumeros');
const btnDetenerSorteo = document.getElementById('btnDetenerSorteo');
const btnModoVertical = document.getElementById('btnModoVertical');
const btnModoHorizontal = document.getElementById('btnModoHorizontal');
const btnModoDiagonal = document.getElementById('btnModoDiagonal');
const btnModoCartonLleno = document.getElementById('btnModoCartonLleno');
const btnReiniciar = document.getElementById('btnReiniciar');
const inputBuscarCarton = document.getElementById('inputBuscarCarton');
const btnBuscarCarton = document.getElementById('btnBuscarCarton');
const btnQuitarCartones = document.getElementById('btnQuitarCartones');

// -- INICIO --
window.onload = async () => {
  bloquearPanelControl(true);
  await cargarCartonesVendidos();
  await cargarCartonesJSON();
  cargarCartonesALaVista();

  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
      cargarCartonesALaVista();
    }
  });
}

// -- FUNCIONES --

async function cargarCartonesVendidos() {
  try {
    const res = await fetch('https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/Hoja%201');
    const datos = await res.json();
    datos.forEach(row => {
      if (row.Estado && (row.Estado.toUpperCase() === 'RESERVADO' || row.Estado.toUpperCase() === 'VENDIDO')) {
        cartonesVendidos[row.ID] = true;
      }
    });
  } catch (e) {
    console.error('Error cargando cartones vendidos:', e);
  }
}

async function cargarCartonesJSON() {
  try {
    const res = await fetch(CARTONES_JSON);
    cartones = await res.json();
  } catch (e) {
    console.error('Error cargando cartones.json:', e);
  }
}

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
      <div class="numero-carton">#${id.padStart(4, '0')}</div>
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

function abrirModalReserva(id) {
  cartonSeleccionado = id;
  cartonNumSpan.textContent = id.toString().padStart(4, '0');
  formReserva.reset();
  modalReserva.classList.remove('hidden');
}

closeReservaBtn.onclick = () => {
  modalReserva.classList.add('hidden');
  cartonSeleccionado = null;
};

formReserva.onsubmit = async e => {
  e.preventDefault();

  if (!cartonSeleccionado) return alert('Selecciona un cartón.');

  const nombre = formReserva.nombre.value.trim();
  const apellido = formReserva.apellido.value.trim();
  const telefono = formReserva.telefono.value.trim();

  if (!nombre || !apellido || !telefono) {
    return alert('Completa todos los campos.');
  }

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
    if (text === 'OK') {
      // Actualizamos el cartón en pantalla a vendido
      cartonesVendidos[cartonSeleccionado] = true;
      const cartonDiv = container.querySelector(`.carton[data-id="${cartonSeleccionado}"]`);
      if (cartonDiv) {
        cartonDiv.classList.add('vendido');
        const estadoDiv = cartonDiv.querySelector('.estado');
        if (estadoDiv) estadoDiv.textContent = 'VENDIDO';
        cartonDiv.removeEventListener('click', abrirModalReserva);
      }

      // Cerramos el modal
      modalReserva.classList.add('hidden');
      cartonSeleccionado = null;

      // Abrir WhatsApp para enviar mensaje
      const mensaje = encodeURIComponent(
        `Hola, quiero reservar el cartón #${cartonSeleccionado.toString().padStart(4, '0')}.\n` +
        `Nombre: ${nombre}\nApellido: ${apellido}\nTeléfono: ${telefono}`
      );
      const urlWhatsapp = `https://wa.me/58${WHATSAPP_NUM}?text=${mensaje}`;
      window.open(urlWhatsapp, '_blank');

      alert('Cartón reservado correctamente. Se abrirá WhatsApp para confirmar tu reserva.');
    } else {
      alert('Error al reservar. Intenta nuevamente más tarde.');
    }
  } catch (error) {
    console.error('Error en reserva:', error);
    alert('Error en la conexión. Intenta de nuevo.');
  }
};

        
