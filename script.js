// script.js — versión CSP‑safe: lee Google Sheets vía JSONP, mantiene bloqueo manual y panel ordenado
/*********************** CONFIG ***********************/
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_URL  = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS';
const BLOQUE     = 50;
const WHATS_APP  = '584266404042';
const PANEL_PASS = 'joker123';
const SYNC_INTERVAL = 15000; // Sincronizar reservas cada 15 segundos

/*********************** ESTADO ************************/
let cartones = [], pintados = 0;
let vendidos = new Set();            // reservados en Google Sheets
let manual   = new Set(JSON.parse(localStorage.getItem('BLOCKS')||'[]')); // bloqueados localmente y persistentes
let drawn    = new Set();
let bolas    = Array.from({length:75},(_,i)=>i+1);
let intervalo = null;

/********************* REFERENCIAS *********************/
const $ = s=>document.querySelector(s);
const cont=$('#cartones-container'), loader=$('#loader');
const modal=$('#modal'), form=$('#form-reserva'), spanNum=$('#carton-numero'), inputID=$('#input-id'), btnDesc=$('#btn-descargar');
const panel=$('#panel'), btnToggle=$('#btn-toggle-panel'), btnUnlock=$('#btn-unlock'), pw=$('#password-input'), panelC=$('#panel-content');
const btnStart=$('#btn-start-draw'), btnStop=$('#btn-stop-draw'), curr=$('#current-ball'), hist=$('#history'), btnRestart=$('#btn-restart');
const modes=[...document.querySelectorAll('input[name="mode"]')];
const inputBlock=$('#input-block-carton'), btnBlock=$('#btn-block-carton');
const inputFree=$('#input-unreserve'),   btnFree=$('#btn-unreserve');
const search=$('#search-input');

/*********************** INIT **************************/
window.addEventListener('DOMContentLoaded',init);
async function init(){
  /* 1 – cartones.json (si falla, detiene todo) */
  try{
    const r = await fetch('cartones.json',{cache:'no-store'});
    cartones = await r.json();
    cartones.sort((a,b)=>a.id-b.id);
  }catch(e){ loader.textContent='❌ Error al cargar cartones.'; return; }
  pintar(); observar();

  /* 2 – Cargar reservas iniciales y empezar a sincronizar */
  await cargarReservas(); // Carga inicial
  setInterval(sincronizarReservas, SYNC_INTERVAL); // Sincronización periódica
}

/********************* CARTONES ************************/
function crear({id,grid}){
  const art=document.createElement('article'); art.className='carton'; art.dataset.id=id;
  art.innerHTML=`<h3>#${id.toString().padStart(4,'0')}</h3><div class="grid">${grid.flat().map(n=>`<div class="cell" data-num="${n}">${n==='FREE'?'★':n}</div>`).join('')}</div>`;
  if(bloqueado(id)) art.classList.add('vendido'); else art.onclick=()=>abrir(id);
  return art;
}
function pintar(){const f=document.createDocumentFragment(); for(let i=pintados;i<pintados+BLOQUE&&i<cartones.length;i++)f.appendChild(crear(cartones[i])); pintados+=BLOQUE; cont.appendChild(f); if(pintados>=cartones.length) loader.style.display='none';}
function observar(){const s=document.createElement('div'); cont.appendChild(s); new IntersectionObserver(e=>e[0].isIntersecting&&pintar()).observe(s);}
function refrescar(){cont.querySelectorAll('.carton').forEach(c=>bloqueado(c.dataset.id)?c.classList.add('vendido'):c.classList.remove('vendido'));}

/******************* UTILIDADES ***********************/
const bloqueado = id => vendidos.has(String(id)) || manual.has(String(id));
const guardarManual = () => localStorage.setItem('BLOCKS',JSON.stringify([...manual]));

/******************* CARGAR Y SINCRONIZAR RESERVAS ********************/
function cargarReservas() {
  return new Promise(resolve => {
    const cb = 'jsonp_' + Date.now();
    window[cb] = d => {
      vendidos = new Set(d.filter(x => String(x.Estado || x.ESTADO).toUpperCase() === 'RESERVADO').map(x => String(x.ID)));
      refrescar();
      delete window[cb];
      resolve();
    };
    const s = document.createElement('script');
    s.src = `${SHEET_URL}?callback=${cb}`;
    document.body.appendChild(s);
  });
}

function sincronizarReservas() {
  const cb = 'jsonp_' + Date.now();
  window[cb] = d => {
    const nuevosVendidos = new Set(d.filter(x => String(x.Estado || x.ESTADO).toUpperCase() === 'RESERVADO').map(x => String(x.ID)));

    // Solo refrescar si hay cambios en el tamaño o contenido de los sets
    if (nuevosVendidos.size !== vendidos.size || ![...nuevosVendidos].every(id => vendidos.has(id))) {
      vendidos = nuevosVendidos;
      refrescar();
    }
    delete window[cb];
  };
  const s = document.createElement('script');
  s.src = `${SHEET_URL}?callback=${cb}`;
  document.body.appendChild(s);
}

/******************* MODAL RESERVA ********************/
function abrir(id){ inputID.value=id; spanNum.textContent=id; modal.classList.remove('hidden'); }
function cerrar(){ modal.classList.add('hidden'); form.reset(); btnDesc.classList.add('hidden'); }
window.cerrarModal=cerrar;

form.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(form);
  const id=fd.get('ID');
  if(bloqueado(id)){
    alert('¡Ups! Este cartón ya está bloqueado o reservado por alguien más.');
    cerrar(); // Cierra el modal si ya está bloqueado
    return;
  }
  reservar(fd,id);
});

function reservar(fd,id){
  const ifr=document.createElement('iframe');
  ifr.name='hidden_iframe';
  ifr.style.display='none';
  document.body.appendChild(ifr);

  // Asegúrate de que la WebApp procese la reserva y luego recarga las reservas
  ifr.onload = () => {
    // Pequeño retardo para dar tiempo a la WebApp a actualizar Google Sheets
    setTimeout(() => {
      cargarReservas(); // Re-carga las reservas después de la acción de la WebApp
      document.body.removeChild(ifr); // Limpia el iframe
    }, 1500); // 1.5 segundos de retardo, puedes ajustarlo si es necesario
  };

  const f=document.createElement('form');
  f.action=WEBAPP_URL;
  f.method='POST';
  f.target='hidden_iframe';
  fd.forEach((v,k)=>{const inp=document.createElement('input'); inp.name=k; inp.value=v; f.appendChild(inp);});
  document.body.appendChild(f);
  f.submit();

  // Abre WhatsApp y muestra el botón de descarga inmediatamente para el usuario actual
  window.open(`https://wa.me/${WHATS_APP}?text=${encodeURIComponent('Hola, quiero comprar el cartón '+id)}`,'_blank');
  btnDesc.classList.remove('hidden');
  btnDesc.onclick=()=>jpg(id);
  cerrar();
}

function jpg(id){const art=document.querySelector(`.carton[data-id="${id}"]`); html2canvas(art).then(c=>{const a=document.createElement('a'); a.href=c.toDataURL('image/jpeg'); a.download=`carton_${id}.jpg`; a.click();});}

/******************* PANEL ****************************/
btnToggle.onclick=()=>panel.classList.toggle('hidden');
btnUnlock.onclick=()=>{ if(pw.value===PANEL_PASS){ panelC.classList.remove('hidden'); pw.value=''; } else alert('Contraseña incorrecta'); };
btnBlock.onclick=()=>{ const id=inputBlock.value.trim(); if(!id)return; manual.add(id); guardarManual(); refrescar(); alert('Bloqueado '+id); };
btnFree.onclick =()=>{ const id=inputFree.value.trim(); if(!manual.has(id)){ alert('No está bloqueado manualmente'); return;} manual.delete(id); guardarManual(); refrescar(); alert('Desbloqueado '+id);} ;
search.addEventListener('input',()=>{const q=search.value.trim(); cont.querySelectorAll('.carton').forEach(c=>{c.style.display=c.dataset.id.startsWith(q)?'block':'none';});});

/******************* SORTEO ***************************/
function letra(n){return n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O';}
function extraer(){ if(!bolas.length){ detener(); alert('Fin del sorteo'); return; } const i=Math.random()*bolas.length|0; const num=bolas.splice(i,1)[0]; drawn.add(num); curr.textContent=`${letra(num)} - ${num}`; const li=document.createElement('li'); li.textContent=letra(num)+num; hist.prepend(li); marcar(num);}
function marcar(n){ document.querySelectorAll(`.cell[data-num="${n}"]`).forEach(c=>c.classList.add('marked')); }
function iniciar(){ if(intervalo) return; extraer(); intervalo=setInterval(extraer,4000); btnStart.disabled=true; btnStop.disabled=false; }
function detener(){ clearInterval(intervalo); intervalo=null; btnStart.disabled=false; btnStop.disabled=true; }
btnStart.addEventListener('click',iniciar); btnStop.addEventListener('click',detener);
btnRestart.addEventListener('click',()=>{ if(confirm('¿Reiniciar partida?')){ detener(); bolas=[...Array(75)].map((_,i)=>i+1); drawn.clear(); hist.innerHTML=''; curr.textContent=''; cont.querySelectorAll('.cell.marked').forEach(c=>c.classList.remove('marked')); } });
