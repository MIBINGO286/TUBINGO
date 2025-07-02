// CONFIGURACIÓN
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec';
const CARTONES_JSON = 'cartones.json'; // archivo con 1000 cartones
const WHATSAPP_NUM = '04266404042';
const CARTONES_POR_CARGAR = 50;
const PASSWORD = 'Jrr035$$*';

// VARIABLES GLOBALES
let cartones = [];
let cartonesVendidos = {};
let cartonesCargados = 0;
let cartonSeleccionado = null;

let numerosSacados = new Set();
let intervaloSorteo = null;
let modoJuego = null; // 'vertical', 'horizontal', 'diagonal', 'carton_lleno'

const container = document.getElementById('cartonesContainer');
const loading = document.getElementById('loading');
const modalReserva = document.getElementById('modalReserva');
const formReserva = document.getElementById('formReserva');
const cartonNumSpan = document.getElementById('cartonNum');
const closeReservaBtn = document.getElementById('closeReserva');

const panelControl = document.getElementById('panelControl');
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

// INICIALIZAR
window.onload = async () => {
  bloquearPanelControl(true);
  await cargarCartonesVendidos();
  await cargarCartonesJSON();
  cargarCartonesALaVista();

  // Scroll para carga progresiva
  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
      cargarCartonesALaVista();
    }
  });
};

// FUNCIONES DE CARGA

async function cargarCartonesVendidos() {
  try {
    const res = await fetch(`https://opensheet.elk.sh/1kPdCww-t1f_CUhD9egbeNn6robyapky8PWCS63P31j4/Hoja%201`);
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

// MODAL RESERVA

function abrirModalReserva(id) {
  cartonSeleccionado = id;
  cartonNumSpan.textContent = id.padStart(4, '0');
  formReserva.reset();
  modalReserva.style.display = 'block';
}

closeReservaBtn.onclick = () => {
  modalReserva.style.display = 'none';
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
    if (text !== 'OK') throw new Error('Error en reserva');

    cartonesVendidos[cartonSeleccionado] = true;
    actualizarEstadoCarton(cartonSeleccionado, 'VENDIDO');

    abrirWhatsApp(cartonSeleccionado, nombre, apellido, telefono);

    alert('¡Cartón reservado!');

    modalReserva.style.display = 'none';
    cartonSeleccionado = null;
  } catch (error) {
    alert('Error al reservar. Intenta nuevamente.');
    console.error(error);
  }
};

function actualizarEstadoCarton(id, estado) {
  const cartonDiv = document.querySelector(`.carton[data-id="${id}"]`);
  if (!cartonDiv) return;
  cartonDiv.classList.add('vendido');
  cartonDiv.dataset.vendido = 'true';
  const estadoDiv = cartonDiv.querySelector('.estado');
  if (estadoDiv) estadoDiv.textContent = estado;
  cartonDiv.onclick = null;
}

function abrirWhatsApp(id, nombre, apellido, telefono) {
  const mensaje = encodeURIComponent(`Hola, quiero reservar el cartón #${id.padStart(4,'0')}.\nNombre: ${nombre}\nApellido: ${apellido}\nTeléfono: ${telefono}`);
  const url = `https://wa.me/58${WHATSAPP_NUM}?text=${mensaje}`;
  window.open(url, '_blank');
}

// PANEL DE CONTROL

btnDesbloquear.onclick = () => {
  const pass = inputPassword.value.trim();
  if (pass === PASSWORD) {
    bloquearPanelControl(false);
    alert('Panel desbloqueado.');
    inputPassword.value = '';
  } else {
    alert('Contraseña incorrecta.');
  }
};

function bloquearPanelControl(bloquear) {
  if (bloquear) {
    panelControl.classList.add('hidden');
  } else {
    panelControl.classList.remove('hidden');
  }
}

// BUSCADOR CARTONES

btnBuscarCarton.onclick = () => {
  const busqueda = inputBuscarCarton.value.trim();
  if (!busqueda) return alert('Ingresa el número del cartón a buscar.');

  const cartonDiv = document.querySelector(`.carton[data-id="${parseInt(busqueda, 10)}"]`);
  if (cartonDiv) {
    cartonDiv.scrollIntoView({behavior: 'smooth', block: 'center'});
    cartonDiv.classList.add('highlight');
    setTimeout(() => cartonDiv.classList.remove('highlight'), 2000);
  } else {
    alert('Cartón no encontrado.');
  }
};

// QUITAR CARTONES VENDIDOS (solo panel)

btnQuitarCartones.onclick = () => {
  if (!confirm('¿Seguro quieres quitar todos los cartones vendidos? Esta acción no se puede deshacer.')) return;
  // Remover visualmente
  Object.keys(cartonesVendidos).forEach(id => {
    const c = document.querySelector(`.carton[data-id="${id}"]`);
    if (c) c.remove();
  });
  cartonesVendidos = {};
  alert('Cartones vendidos removidos de la vista.');
};

// SORTEO AUTOMÁTICO

btnSacarNumeros.onclick = () => {
  if (intervaloSorteo) return alert('El sorteo ya está en marcha.');

  intervaloSorteo = setInterval(() => {
    if (numerosSacados.size >= 75) {
      clearInterval(intervaloSorteo);
      alert('¡Sorteo terminado!');
      return;
    }
    let n;
    do {
      n = Math.floor(Math.random() * 75) + 1;
    } while (numerosSacados.has(n));
    numerosSacados.add(n);
    anunciarNumero(n);
    marcarNumeroEnCartones(n);
    // Aquí puedes llamar función para verificar ganadores según modoJuego
  }, 3000);
};

btnDetenerSorteo.onclick = () => {
  if (intervaloSorteo) {
    clearInterval(intervaloSorteo);
    intervaloSorteo = null;
    alert('Sorteo detenido.');
  }
};

btnModoVertical.onclick = () => {
  modoJuego = 'vertical';
  alert('Modo juego: Vertical');
};

btnModoHorizontal.onclick = () => {
  modoJuego = 'horizontal';
  alert('Modo juego: Horizontal');
};

btnModoDiagonal.onclick = () => {
  modoJuego = 'diagonal';
  alert('Modo juego: Diagonal');
};

btnModoCartonLleno.onclick = () => {
  modoJuego = 'carton_lleno';
  alert('Modo juego: Cartón lleno');
};

btnReiniciar.onclick = () => {
  if (!confirm('¿Seguro quieres reiniciar la partida? Se borrarán los números sacados.')) return;
  numerosSacados.clear();
  // Remover marcado de números en los cartones
  document.querySelectorAll('.carton td').forEach(td => {
    td.classList.remove('marcado');
  });
  alert('Partida reiniciada.');
};

// Función para anunciar número con voz y mostrar letra+numero
function anunciarNumero(num) {
  const letras = ['B', 'I', 'N', 'G', 'O'];
  // Definir letra según rango del número
  let letra = 'B';
  if (num >= 1 && num <= 15) letra = 'B';
  else if (num >= 16 && num <= 30) letra = 'I';
  else if (num >= 31 && num <= 45) letra = 'N';
  else if (num >= 46 && num <= 60) letra = 'G';
  else if (num >= 61 && num <= 75) letra = 'O';

  const texto = `${letra} ${num}`;

  // Voz
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-VE'; // Español Venezuela
    window.speechSynthesis.speak(utterance);
  }

  // Mostrar en pantalla (puedes crear un div para mostrar)
  console.log('Número sorteado:', texto);
}

// Marcar número sorteado en los cartones
function marcarNumeroEnCartones(num) {
  document.querySelectorAll('.carton').forEach(carton => {
    if (carton.dataset.vendido === 'true') return; // No marcar cartones vendidos

    const tds = carton.querySelectorAll('tbody td');
    tds.forEach(td => {
      if (parseInt(td.textContent, 10) === num) {
        td.classList.add('marcado');
      }
    });
  });
}
