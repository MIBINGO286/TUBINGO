const cartonesPorCarga = 50;
let cartones = [];
let cartonesMostrados = 0;
let cargando = false;

// WhatsApp número del vendedor
const whatsappBase = "https://wa.me/584120985491?text=Hola,%20quiero%20comprar%20el%20cart%C3%B3n%20n%C3%BAmero%20";

// Fetch inicial de cartones
async function cargarCartones() {
  if (cargando || cartonesMostrados >= 1000) return;
  cargando = true;
  document.getElementById("cargando").style.display = "block";

  if (cartones.length === 0) {
    const res = await fetch("cartones.json");
    cartones = await res.json();
  }

  const contenedor = document.getElementById("cartonesContainer");
  const siguientes = cartones.slice(cartonesMostrados, cartonesMostrados + cartonesPorCarga);

  siguientes.forEach(carton => {
    const div = document.createElement("div");
    div.classList.add("carton");

    const idLabel = document.createElement("div");
    idLabel.className = "carton-id";
    idLabel.innerText = `Cartón #${carton.id}`;
    div.appendChild(idLabel);

    const tabla = document.createElement("div");
    carton.grid.forEach(fila => {
      fila.forEach(n => {
        const celda = document.createElement("div");
        celda.className = "celda";
        celda.innerText = n === 0 ? "★" : n;
        tabla.appendChild(celda);
      });
      const br = document.createElement("br");
      tabla.appendChild(br);
    });

    div.appendChild(tabla);

    // Botón de WhatsApp
    const boton = document.createElement("a");
    boton.href = `${whatsappBase}${carton.id}`;
    boton.target = "_blank";
    boton.innerText = "Comprar";
    boton.className = "btn-whatsapp mt-2 inline-block";
    div.appendChild(boton);

    contenedor.appendChild(div);
  });

  cartonesMostrados += cartonesPorCarga;
  cargando = false;
  if (cartonesMostrados >= 1000) {
    document.getElementById("cargando").innerText = "Todos los cartones han sido cargados.";
  } else {
    document.getElementById("cargando").style.display = "none";
  }
}

// Buscar cartón por número
document.getElementById("buscarInput").addEventListener("input", e => {
  const val = e.target.value.trim();
  if (!/^[0-9]{1,4}$/.test(val)) return;

  const id = val.padStart(3, '0');
  const index = cartones.findIndex(c => c.id === id);
  if (index >= 0) {
    const container = document.getElementById("cartonesContainer");
    const target = container.children[index];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

// Cargar cartones al hacer scroll
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    cargarCartones();
  }
});

// Inicio automático
window.addEventListener("DOMContentLoaded", () => {
  cargarCartones();
});
