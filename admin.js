import { marcarCartonVendido, registrarBolaExtraida, obtenerDatosIniciales } from './api.js';

let bolasExtraidas = [];
let modoActual = "linea";
let bolasDisponibles = Array.from({ length: 75 }, (_, i) => i + 1);

// Mostrar panel si contraseña es correcta
function pedirAccesoAdmin() {
  const clave = prompt("Introduce la contraseña de administrador:");
  if (clave === "Jrr035$$*") {
    document.getElementById("panelAdmin").classList.remove("hidden");
    inicializarPanel();
  } else {
    alert("Contraseña incorrecta.");
  }
}

// Extrae una bola aleatoria y la registra
async function extraerBola() {
  if (bolasDisponibles.length === 0) {
    alert("Ya se han extraído todas las bolas.");
    return;
  }

  const index = Math.floor(Math.random() * bolasDisponibles.length);
  const bola = bolasDisponibles.splice(index, 1)[0];
  bolasExtraidas.push(bola);

  // animación en consola
  console.log(`🎱 Bola extraída: ${bola}`);

  // registra en Google Sheets
  await registrarBolaExtraida(bola);

  // aquí podrías mostrar animación o sonido
}

// Reinicia la partida
function reiniciarPartida() {
  if (!confirm("¿Seguro que deseas reiniciar la partida?")) return;

  bolasDisponibles = Array.from({ length: 75 }, (_, i) => i + 1);
  bolasExtraidas = [];
  console.log("🎲 Partida reiniciada");
}

// Cambiar modalidad de juego
function cambiarModo(e) {
  modoActual = e.target.value;
  console.log("Modo de juego:", modoActual);
}

// Cargar datos iniciales al iniciar sesión
async function inicializarPanel() {
  const datos = await obtenerDatosIniciales();
  const ventas = datos.ventas || [];
  document.getElementById("infoVentas").innerText = `${ventas.length} cartones vendidos`;

  // podrías aquí restaurar bolas o ganadores previos
}

// Eventos del panel
document.getElementById("btnExtraer").addEventListener("click", extraerBola);
document.getElementById("btnReiniciar").addEventListener("click", reiniciarPartida);
document.getElementById("modoJuego").addEventListener("change", cambiarModo);

// Activar login admin
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(pedirAccesoAdmin, 500); // pide acceso tras 0.5s
});
