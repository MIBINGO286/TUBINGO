// script.js — versión con **bloqueo manual persistente** (sin Google Sheets) y panel ordenado
/*********************** CONFIG ***********************/
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxKH9xP-YZ6UXdTw9MtjeF9C19lMlXH0k-oMrbXiWqhrhoN0xJJPPpa6NOGFJo7x_5G/exec';
const SHEET_URL  = 'https://opensheet.elk.sh/1YeHvkb5ag9hdL1VZTtXyi3PKwio7RWQ5tr-WaDKd52g/RESERVAS';
const BLOQUE     = 50;
const WHATS_APP  = '584266404042';
const PANEL_PASS = 'joker123';

/*********************** ESTADO ***********************/
let cartones = [], pintados = 0;
let vendidos = new Set();            // reservados en Google Sheets
let manual   = new Set(JSON.parse(localStorage.getItem('BLOCKS')||'[]')); // bloqueados localmente y persistentes
let drawn    = new Set();
let bolas    = Array.from({length:75},(_,i)=>i+1);
let intervalo = null;

/********************* REFERENCIAS *********************/
const $ = s=>document.querySelector(s);
const cont=$('#cartones-container'), loader=$('#loader');
const modal=$('#modal'), form=$('#form-reserva'), spanNum=$('#carton-numero'), inputID=$('#input-id'), btnDesc=$('#btn-descargar');
const panel=$('#panel'), btnToggle=$('#btn-toggle-panel'), btnUnlock=$('#btn-unlock'), pw=$('#password-input'), panelC=$('#panel-content');
const btnStart=$('#btn-start-draw'), btnStop=$('#btn-stop-draw'), curr=$('#current-ball'), hist=$('#history'), btnRestart=$('#btn-restart');
const modes=[...document.querySelectorAll('input[name="mode"]')];
const inputBlock=$('#input-block-carton'), btnBlock=$('#btn-block-carton');
const inputFree=$('#input-unreserve'),   btnFree=$('#btn-unreserve');
const search=$('#search-input');

/*********************** INIT **************************/
window.addEventListener('DOMContentLoaded',init);
async function init(){
  /* 1 – cartones.json */
  try{ const r=await fetch('cartones.json',{cache:'no-store'}); cartones=await r.json(); cartones.sort((a,b)=>a.id-b.id);}catch(e){loader.textContent='❌ cartones';return;}
  pintar(); observar();

  /* 2 – reservas Google Sheets */
  try{ const r=await fetch(SHEET_URL,{cache:'no-store'}); const d=await r.json(); vendidos=new Set(d.filter(x=>String(x.Estado||x.ESTADO).toUpperCase()==='RESERVADO').map(x=>String(x.ID))); refrescar();}catch(e){console.warn('sin reservas');}
}

/********************* CARTONES ************************/
function crear({id,grid}){
  const art=document.createElement('article'); art.className='carton'; art.dataset.id=id;
  art.innerHTML=`<h3>#${id.toString().padStart(4,'0')}</h3><div class="grid">${grid.flat().map(n=>`<div class="cell" data-num="${n}">${n==='FREE'?'★':n}</div>`).join('')}</div>`;
  if(bloqueado(id)) art.classList.add('vendido'); else art.onclick=()=>abrir(id);
  return art;
}
function pintar(){const f=document.createDocumentFragment(); for(let i=pintados;i<pintados+BLOQUE&&i<cartones.length;i++)f.appendChild(crear(cartones[i])); pintados+=BLOQUE; cont.appendChild(f); if(pintados>=cartones.length) loader.style.display='none';}
function observar(){const s=document.createElement('div'); cont.appendChild(s); new IntersectionObserver(e=>e[0].isIntersecting&&pintar()).observe(s);} 
function refrescar(){cont.querySelectorAll('.carton').forEach(c=>bloqueado(c.dataset.id)?c.classList.add('vendido'):c.classList.remove('vendido'));}

/******************* UTILIDADES ***********************/
const bloqueado = id => vendidos.has(String(id)) || manual.has(String(id));
const guardarManual = () => localStorage.setItem('BLOCKS',JSON.stringify([...manual]));

/******************* MODAL RESERVA ********************/
function abrir(id){ inputID.value=id; spanNum.textContent=id; modal.classList.remove('hidden'); }
function cerrar(){ modal.classList.add('hidden'); form.reset(); btnDesc.classList.add('hidden'); }
window.cerrarModal=cerrar;

form.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(form); const id=fd.get('ID');
  if(bloqueado(id)){ alert('Cartón bloqueado o reservado'); return; }
  reservar(fd,id);
});

function reservar(fd,id){ // envía a Apps Script + WhatsApp + bloquea
  const ifr=document.createElement('iframe'); ifr.name='h_iframe'; ifr.style.display='none'; document.body.appendChild(ifr);
  const f=document.createElement('form'); f.action=WEBAPP_URL; f.method='POST'; f.target='h_iframe';
  fd.forEach((v,k)=>{const i=document.createElement('input'); i.name=k; i.value=v; f.appendChild(i);}); document.body.appendChild(f); f.submit();
  vendidos.add(id); refrescar();
  window.open(`https://wa.me/${WHATS_APP}?text=${encodeURIComponent('Hola, quiero comprar el cartón '+id)}`,'_blank');
  btnDesc.classList.remove('hidden'); btnDesc.onclick=()=>jpg(id);
  cerrar();
}
function jpg(id){const art=document.querySelector(`.carton[data-id="${id}"]`); html2canvas(art).then(c=>{const a=document.createElement('a'); a.href=c.toDataURL('image/jpeg'); a.download=`carton_${id}.jpg`; a.click();});}

/******************* PANEL DE CONTROL *****************/
btnToggle.onclick=()=>panel.classList.toggle('hidden');
btnUnlock.onclick=()=>{ if(pw.value===PANEL_PASS){ panelC.classList.remove('hidden'); pw.value=''; } else alert('Contraseña incorrecta'); };
btnBlock.onclick=()=>{ const id=inputBlock.value.trim(); if(!id)return; manual.add(id); guardarManual(); refrescar(); alert('Bloqueado '+id); };
btnFree.onclick =()=>{ const id=inputFree.value.trim(); if(!manual.has(id)){ alert('No está bloqueado manual'); return;} manual.delete(id); guardarManual(); refrescar(); alert('Desbloqueado '+id);} ;
search.addEventListener('input',()=>{const q=search.value.trim(); cont.querySelectorAll('.carton').forEach(c=>{c.style.display=c.dataset.id.startsWith(q)?'block':'none';});});

/******************* SORTEO AUTOMÁTICO ****************/ 
function letra(n){return n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O';}
function extraer(){ if(!bolas.length){ detener(); alert('Fin del sorteo'); return; } const i=Math.random()*bolas.length|0; const num=bolas.splice(i,1)[0]; drawn.add(num); curr.textContent=`${letra(num)} - ${num}`; const li=document.createElement('li'); li.textContent=letra(num)+num; hist.prepend(li);} 
function marcar(n){ document.querySelectorAll(`.cell[data-num="${n}"]`).forEach(c=>c.classList.add('marked')); }
function iniciar(){ if(intervalo) return; extraer(); intervalo=setInterval(()=>{ extraer(); marcar(curr.textContent.split(' - ')[1]); },4000); btnStart.disabled=true; btnStop.disabled=false; }
function detener(){ clearInterval(intervalo); intervalo=null; btnStart.disabled=false; btnStop.disabled=true; }
btnStart.addEventListener('click',iniciar); btnStop.addEventListener('click',detener);
btnRestart.addEventListener('click',()=>{ if(confirm('¿Reiniciar partida?')){ detener(); bolas=[...Array(75)].map((_,i)=>i+1); drawn.clear(); hist.innerHTML=''; curr.textContent=''; cont.querySelectorAll('.cell.marked').forEach(c=>c.classList.remove('marked')); } });
