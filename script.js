const gatos = [
  "Dexter", "Marty", "Lilo", "Lulú", "Eddy",
  "Bell", "Turoc", "Lana", "Yeyuni", "Catalino",
  "Héctor", "Egle", "Sonata", "Poah", "Gris",
  "Dior", "Wero", "Nimbus", "Medio bigote"
];

const palette = [
  "#ffd1dc", "#c8e7ff", "#d6f5d6", "#ffe4b5", "#fff5b8",
  "#e2d4ff", "#ffd8e8", "#cdebff", "#defbdb", "#ffe0c2"
];

const N = gatos.length;
const SECTOR = (Math.PI * 2) / N;
const STORAGE_KEY = "ruleta-gatos.historial";

const canvas = document.getElementById("ruleta");
const ctx = canvas.getContext("2d");
const btn = document.getElementById("girar");
const ganadorEl = document.getElementById("ganador");
const listaEl = document.getElementById("lista-gatos");

const ctaBtn = document.getElementById("abrir-form");
const formPanel = document.getElementById("form-panel");
const form = document.getElementById("pregunta-form");
const autorInput = document.getElementById("autor");
const preguntaInput = document.getElementById("pregunta");
const cancelarBtn = document.getElementById("cancelar");
const activaPanel = document.getElementById("pregunta-activa");
const activaAutor = document.getElementById("activa-autor");
const activaPregunta = document.getElementById("activa-pregunta");
const cambiarBtn = document.getElementById("cambiar");
const estadoEl = document.getElementById("estado");
const historialLista = document.getElementById("historial-lista");
const historialVacio = document.getElementById("historial-vacio");
const limpiarBtn = document.getElementById("limpiar-historial");

let W = 600, H = 600, cx = 300, cy = 300, radius = 290;
let rotation = 0;
let spinning = false;
let preguntaActiva = null;

/* ---------- Canvas & wheel ---------- */
function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = rect.width;
  H = rect.height;
  cx = W / 2;
  cy = H / 2;
  radius = Math.min(W, H) / 2 - 6;
  drawWheel();
}

function drawWheel() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  for (let i = 0; i < N; i++) {
    const start = -Math.PI / 2 + (i - 0.5) * SECTOR;
    const end = start + SECTOR;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(-Math.PI / 2 + i * SECTOR);
    ctx.fillStyle = "#3b2f4a";
    const fontSize = Math.max(11, Math.round(radius * 0.06));
    ctx.font = `600 ${fontSize}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(gatos[i], radius * 0.92, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* ---------- Spin ---------- */
function spin() {
  if (spinning) return;
  if (!preguntaActiva) {
    setEstado("Primero confirma tu pregunta para poder girar.", "error");
    return;
  }
  spinning = true;
  btn.disabled = true;
  btn.classList.remove("listo");
  btn.textContent = "girando…";
  ganadorEl.textContent = "…";
  document.querySelectorAll("#lista-gatos li").forEach((li) => {
    li.classList.remove("ganador");
  });

  const targetIndex = Math.floor(Math.random() * N);
  const turns = 5 + Math.floor(Math.random() * 3);
  const jitter = (Math.random() - 0.5) * SECTOR * 0.7;

  const baseRotation = rotation;
  let finalRotation = baseRotation + turns * Math.PI * 2;
  const currentMod = ((finalRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const targetR = -targetIndex * SECTOR + jitter;
  const targetMod = ((targetR % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 2 * Math.PI;
  finalRotation += delta;

  const startTime = performance.now();
  const duration = 4200;

  function frame(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(t);
    rotation = baseRotation + (finalRotation - baseRotation) * eased;
    drawWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      rotation = finalRotation % (2 * Math.PI);
      spinning = false;
      btn.textContent = "¡Girar!";
      announceWinner(targetIndex);
    }
  }
  requestAnimationFrame(frame);
}

function announceWinner(idx) {
  const gato = gatos[idx];
  ganadorEl.textContent = gato;
  document.querySelectorAll("#lista-gatos li").forEach((li, i) => {
    li.classList.toggle("ganador", i === idx);
  });
  if (preguntaActiva) {
    guardarEntrada({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      autor: preguntaActiva.autor,
      pregunta: preguntaActiva.pregunta,
      gato,
      fecha: new Date().toISOString(),
    });
    preguntaActiva = null;
  }
  setEstado(`El gato respondió: ${gato}`, "ok");
  setTimeout(resetEstadoInicial, 2500);
}

/* ---------- UI state ---------- */
function mostrarCTA() {
  ctaBtn.hidden = false;
  ctaBtn.setAttribute("aria-expanded", "false");
  formPanel.hidden = true;
  activaPanel.hidden = true;
}

function mostrarForm() {
  ctaBtn.hidden = true;
  ctaBtn.setAttribute("aria-expanded", "true");
  formPanel.hidden = false;
  activaPanel.hidden = true;
  setTimeout(() => autorInput.focus(), 50);
}

function mostrarActiva() {
  ctaBtn.hidden = true;
  formPanel.hidden = true;
  activaPanel.hidden = false;
  activaAutor.textContent = preguntaActiva.autor;
  activaPregunta.textContent = `"${preguntaActiva.pregunta}"`;
}

function resetEstadoInicial() {
  autorInput.value = "";
  preguntaInput.value = "";
  autorInput.disabled = false;
  preguntaInput.disabled = false;
  btn.disabled = true;
  btn.classList.remove("listo");
  mostrarCTA();
  setEstado("");
}

function confirmarPregunta(e) {
  e.preventDefault();
  const autor = autorInput.value.trim();
  const pregunta = preguntaInput.value.trim();
  if (!autor || !pregunta) {
    setEstado("Completa tu nombre y tu pregunta.", "error");
    return;
  }
  preguntaActiva = { autor, pregunta };
  autorInput.disabled = true;
  preguntaInput.disabled = true;
  btn.disabled = false;
  btn.classList.add("listo");
  mostrarActiva();
  setEstado("Pregunta confirmada. ¡Gira la ruleta!", "ok");
  ganadorEl.textContent = "—";
}

function cancelarForm() {
  mostrarCTA();
  setEstado("");
}

function cambiarPregunta() {
  preguntaActiva = null;
  btn.disabled = true;
  btn.classList.remove("listo");
  autorInput.disabled = false;
  preguntaInput.disabled = false;
  mostrarForm();
  setEstado("");
}

function setEstado(msg, tipo) {
  estadoEl.textContent = msg || "";
  estadoEl.classList.remove("ok", "error");
  if (tipo) estadoEl.classList.add(tipo);
}

/* ---------- Persistence ---------- */
function leerHistorial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function escribirHistorial(lista) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
  catch { /* sin almacenamiento */ }
}

function guardarEntrada(entrada) {
  const lista = leerHistorial();
  lista.unshift(entrada);
  escribirHistorial(lista.slice(0, 200));
  renderHistorial();
}

function borrarEntrada(id) {
  const lista = leerHistorial().filter((e) => e.id !== id);
  escribirHistorial(lista);
  renderHistorial();
}

function limpiarHistorial() {
  const total = leerHistorial().length;
  if (total === 0) return;
  if (!confirm(`¿Borrar las ${total} preguntas del historial? Esta acción no se puede deshacer.`)) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistorial();
}

/* ---------- History render ---------- */
function escapar(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatearFecha(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function renderHistorial() {
  const lista = leerHistorial();
  historialLista.innerHTML = lista.map((e) => `
    <li class="historial-item" data-id="${escapar(e.id || "")}">
      <div class="contenido">
        <div class="meta">
          <span class="autor">${escapar(e.autor)}</span>
          <span>·</span>
          <span>${formatearFecha(e.fecha)}</span>
        </div>
        <p class="preg">"${escapar(e.pregunta)}"</p>
        <p class="resp">🐱 ${escapar(e.gato)}</p>
      </div>
      <button type="button" class="borrar-item" aria-label="Borrar esta pregunta" title="Borrar">×</button>
    </li>
  `).join("");
  historialVacio.hidden = lista.length > 0;
  limpiarBtn.hidden = lista.length === 0;
}

function renderList() {
  listaEl.innerHTML = gatos.map((g) => `<li>${escapar(g)}</li>`).join("");
}

/* ---------- Events ---------- */
ctaBtn.addEventListener("click", mostrarForm);
cancelarBtn.addEventListener("click", cancelarForm);
form.addEventListener("submit", confirmarPregunta);
cambiarBtn.addEventListener("click", cambiarPregunta);

btn.addEventListener("click", spin);

historialLista.addEventListener("click", (e) => {
  const btnBorrar = e.target.closest(".borrar-item");
  if (!btnBorrar) return;
  const item = btnBorrar.closest(".historial-item");
  const id = item && item.dataset.id;
  if (id) borrarEntrada(id);
});

limpiarBtn.addEventListener("click", limpiarHistorial);
window.addEventListener("resize", setupCanvas);

renderList();
renderHistorial();
setupCanvas();
