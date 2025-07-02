// api.js – Funciones para comunicar con Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxdrSJhX7HuTyfieoZNo5LY7DkC4Wpz2ltPqWCAGPJFQW6ntTftrtvlBIMV9Q9lvmbnow/exec";
const ADMIN_HASH = "Jrr035$$*"; // en producción esto debería ir encriptado o hasheado

export async function marcarCartonVendido(idCarton) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        accion: "marcarVendido",
        idCarton,
        auth: ADMIN_HASH
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    return await res.json();
  } catch (err) {
    console.error("Error al registrar cartón vendido:", err);
    return null;
  }
}

export async function registrarBolaExtraida(bola) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        accion: "registrarBola",
        bola,
        auth: ADMIN_HASH
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    return await res.json();
  } catch (err) {
    console.error("Error registrando bola:", err);
    return null;
  }
}

export async function obtenerDatosIniciales() {
  try {
    const res = await fetch(API_URL);
    return await res.json(); // esperas: { ventas: [...], bolas: [...], ganadores: [...] }
  } catch (err) {
    console.error("Error obteniendo datos iniciales:", err);
    return {};
  }
}
