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

const canvas = document.getElementById("ruleta");
const ctx = canvas.getContext("2d");
const btn = document.getElementById("girar");
const ganadorEl = document.getElementById("ganador");
const listaEl = document.getElementById("lista-gatos");
const form = document.getElementById("pregunta-form");
const autorInput = document.getElementById("autor");
const preguntaInput = document.getElementById("pregunta");
const confirmarBtn = document.getElementById("confirmar");
const nuevaBtn = document.getElementById("nueva");
const estadoEl = document.getElementById("estado");
const historialLista = document.getElementById("historial-lista");
const historialVacio = document.getElementById("historial-vacio");
const limpiarBtn = document.getElementById("limpiar-historial");

const STORAGE_KEY = "ruleta-gatos.historial";
let preguntaActiva = null;

let W = 600, H = 600, cx = 300, cy = 300, radius = 290;
let rotation = 0;
let spinning = false;

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
  ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spin() {
  if (spinning) return;
  if (!preguntaActiva) {
    setEstado("Primero confirma tu pregunta para poder girar.", "error");
    return;
  }
  spinning = true;
  btn.disabled = true;
  ganadorEl.textContent = "girando…";
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
      autor: preguntaActiva.autor,
      pregunta: preguntaActiva.pregunta,
      gato,
      fecha: new Date().toISOString(),
    });
    preguntaActiva = null;
  }
  nuevaBtn.hidden = false;
  setEstado(`El gato respondió: ${gato}`, "ok");
}

function renderList() {
  listaEl.innerHTML = gatos.map((g) => `<li>${g}</li>`).join("");
}

function setEstado(msg, tipo) {
  estadoEl.textContent = msg || "";
  estadoEl.classList.remove("ok", "error");
  if (tipo) estadoEl.classList.add(tipo);
}

function leerHistorial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function escribirHistorial(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch {
    /* almacenamiento no disponible */
  }
}

function guardarEntrada(entrada) {
  const lista = leerHistorial();
  lista.unshift(entrada);
  escribirHistorial(lista.slice(0, 100));
  renderHistorial();
}

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
  } catch {
    return iso;
  }
}

function renderHistorial() {
  const lista = leerHistorial();
  historialLista.innerHTML = lista.map((e) => `
    <li class="historial-item">
      <div class="meta">${escapar(e.autor)} · ${formatearFecha(e.fecha)}</div>
      <p class="preg">“${escapar(e.pregunta)}”</p>
      <p class="resp">🐱 ${escapar(e.gato)}</p>
    </li>
  `).join("");
  historialVacio.hidden = lista.length > 0;
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
  confirmarBtn.disabled = true;
  nuevaBtn.hidden = false;
  btn.disabled = false;
  setEstado("Pregunta confirmada. ¡Gira la ruleta!", "ok");
}

function nuevaPregunta() {
  preguntaActiva = null;
  autorInput.disabled = false;
  preguntaInput.disabled = false;
  confirmarBtn.disabled = false;
  autorInput.value = "";
  preguntaInput.value = "";
  nuevaBtn.hidden = true;
  btn.disabled = true;
  ganadorEl.textContent = "—";
  document.querySelectorAll("#lista-gatos li").forEach((li) => {
    li.classList.remove("ganador");
  });
  setEstado("");
  autorInput.focus();
}

function limpiarHistorial() {
  if (!confirm("¿Borrar todo el historial de preguntas?")) return;
  escribirHistorial([]);
  renderHistorial();
}

btn.addEventListener("click", spin);
canvas.addEventListener("click", spin);
btn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    spin();
  }
});
form.addEventListener("submit", confirmarPregunta);
nuevaBtn.addEventListener("click", nuevaPregunta);
limpiarBtn.addEventListener("click", limpiarHistorial);
window.addEventListener("resize", setupCanvas);

renderList();
renderHistorial();
setupCanvas();
