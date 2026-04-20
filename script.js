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

const popupOverlay = document.getElementById("popup-overlay");
const popupFoto = document.getElementById("popup-foto");
const popupNombre = document.getElementById("popup-titulo");
const popupMeta = document.getElementById("popup-meta");
const popupCerrarBtn = document.getElementById("popup-cerrar");
const popupOkBtn = document.getElementById("popup-ok");

const IMG_DIR = "imggatos/";
const IMG_EXTS = ["jpg", "jpeg", "png", "webp"];

function nombreArchivoGato(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function cargarFoto(img, nombre) {
  const base = nombreArchivoGato(nombre);
  let intento = 0;
  img.alt = `Foto de ${nombre}`;
  img.hidden = true;
  img.onerror = () => {
    intento += 1;
    if (intento < IMG_EXTS.length) {
      img.src = `${IMG_DIR}${base}.${IMG_EXTS[intento]}`;
    } else {
      img.onerror = null;
      img.hidden = true;
    }
  };
  img.onload = () => { img.hidden = false; };
  img.src = `${IMG_DIR}${base}.${IMG_EXTS[0]}`;
}

function abrirPopup(gato, meta) {
  popupNombre.textContent = gato;
  if (meta) {
    popupMeta.textContent = meta;
    popupMeta.hidden = false;
  } else {
    popupMeta.textContent = "";
    popupMeta.hidden = true;
  }
  cargarFoto(popupFoto, gato);
  popupOverlay.hidden = false;
  popupOverlay.setAttribute("aria-hidden", "false");
  setTimeout(() => popupOkBtn.focus(), 50);
}

function cerrarPopup() {
  if (popupOverlay.hidden) return;
  popupOverlay.hidden = true;
  popupOverlay.setAttribute("aria-hidden", "true");
  popupFoto.onerror = null;
  popupFoto.onload = null;
  popupFoto.removeAttribute("src");
  if (!modoLibre && !preguntaActiva) {
    resetEstadoInicial();
  } else {
    btn.focus();
  }
}

const opcionesPanel = document.getElementById("opciones");
const ctaBtn = document.getElementById("abrir-form");
const libreBtn = document.getElementById("modo-libre");
const formPanel = document.getElementById("form-panel");
const form = document.getElementById("pregunta-form");
const autorInput = document.getElementById("autor");
const preguntaInput = document.getElementById("pregunta");
const cancelarBtn = document.getElementById("cancelar");
const activaPanel = document.getElementById("pregunta-activa");
const activaAutor = document.getElementById("activa-autor");
const activaPregunta = document.getElementById("activa-pregunta");
const cambiarBtn = document.getElementById("cambiar");
const librePanel = document.getElementById("libre-activo");
const salirLibreBtn = document.getElementById("salir-libre");
const estadoEl = document.getElementById("estado");
const historialLista = document.getElementById("historial-lista");
const historialVacio = document.getElementById("historial-vacio");
const limpiarBtn = document.getElementById("limpiar-historial");

let W = 600, H = 600, cx = 300, cy = 300, radius = 290;
let rotation = 0;
let spinning = false;
let preguntaActiva = null;
let modoLibre = false;

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
function actualizarGirar() {
  if (spinning) {
    btn.disabled = true;
    btn.classList.remove("listo");
    btn.textContent = "Girando…";
  } else if (preguntaActiva || modoLibre) {
    btn.disabled = false;
    btn.classList.add("listo");
    btn.textContent = "¡Girar!";
  } else {
    btn.disabled = true;
    btn.classList.remove("listo");
    btn.textContent = "Elige modo";
  }
}

function shakePreguntaCard() {
  const card = document.querySelector(".pregunta-card");
  if (!card) return;
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

function spin() {
  if (spinning) return;
  if (!preguntaActiva && !modoLibre) {
    setEstado("Elige un modo para poder girar.", "error");
    shakePreguntaCard();
    return;
  }
  spinning = true;
  actualizarGirar();
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
      announceWinner(targetIndex);
      actualizarGirar();
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
  let meta = null;
  if (preguntaActiva) {
    meta = `${preguntaActiva.autor} preguntó: "${preguntaActiva.pregunta}"`;
    guardarEntrada({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      autor: preguntaActiva.autor,
      pregunta: preguntaActiva.pregunta,
      gato,
      fecha: new Date().toISOString(),
    });
    preguntaActiva = null;
    setEstado(`El gato respondió: ${gato}`, "ok");
  } else if (modoLibre) {
    setEstado(`Salió: ${gato}. Puedes volver a girar.`, "ok");
  }
  abrirPopup(gato, meta);
}

/* ---------- UI state ---------- */
function mostrarPanel(panelVisible) {
  [opcionesPanel, formPanel, activaPanel, librePanel].forEach((p) => {
    p.hidden = p !== panelVisible;
  });
}

function mostrarOpciones() { mostrarPanel(opcionesPanel); }

function mostrarForm() {
  mostrarPanel(formPanel);
  setTimeout(() => autorInput.focus(), 50);
}

function mostrarActiva() {
  mostrarPanel(activaPanel);
  activaAutor.textContent = preguntaActiva.autor;
  activaPregunta.textContent = `"${preguntaActiva.pregunta}"`;
}

function mostrarLibre() { mostrarPanel(librePanel); }

function resetEstadoInicial() {
  autorInput.value = "";
  preguntaInput.value = "";
  autorInput.disabled = false;
  preguntaInput.disabled = false;
  preguntaActiva = null;
  modoLibre = false;
  actualizarGirar();
  mostrarOpciones();
  ganadorEl.textContent = "—";
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
  modoLibre = false;
  autorInput.disabled = true;
  preguntaInput.disabled = true;
  actualizarGirar();
  mostrarActiva();
  setEstado("Pregunta confirmada. ¡Gira la ruleta!", "ok");
  ganadorEl.textContent = "—";
}

function cancelarForm() {
  mostrarOpciones();
  setEstado("");
}

function cambiarPregunta() {
  preguntaActiva = null;
  autorInput.disabled = false;
  preguntaInput.disabled = false;
  actualizarGirar();
  mostrarOpciones();
  setEstado("");
}

function activarLibre() {
  modoLibre = true;
  preguntaActiva = null;
  mostrarLibre();
  actualizarGirar();
  setEstado("Modo giro libre. ¡Gira cuando quieras!", "ok");
  ganadorEl.textContent = "—";
}

function salirLibre() {
  modoLibre = false;
  mostrarOpciones();
  actualizarGirar();
  setEstado("");
}

function setEstado(msg, tipo) {
  estadoEl.textContent = msg || "";
  estadoEl.classList.remove("ok", "error");
  if (tipo) estadoEl.classList.add(tipo);
}

/* ---------- Persistence ---------- */
let usingServer = false;

function leerLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function escribirLocal(lista) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); }
  catch { /* sin almacenamiento */ }
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

async function detectarServidor() {
  try {
    await fetchJson("api/historial");
    usingServer = true;
  } catch {
    usingServer = false;
  }
  actualizarIndicadorAlmacen();
}

function actualizarIndicadorAlmacen() {
  const el = document.getElementById("almacen-indicador");
  if (!el) return;
  el.textContent = usingServer ? "🌐 Guardado en servidor" : "💾 Guardado localmente";
  el.classList.toggle("remoto", usingServer);
  el.classList.toggle("local", !usingServer);
}

async function obtenerHistorial() {
  if (usingServer) {
    try { return await fetchJson("api/historial"); }
    catch { usingServer = false; actualizarIndicadorAlmacen(); }
  }
  return leerLocal();
}

async function guardarEntrada(entrada) {
  if (usingServer) {
    try {
      await fetchJson("api/historial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada),
      });
    } catch {
      usingServer = false;
      actualizarIndicadorAlmacen();
    }
  }
  if (!usingServer) {
    const lista = leerLocal();
    lista.unshift(entrada);
    escribirLocal(lista.slice(0, 200));
  }
  await renderHistorial();
}

async function borrarEntrada(id) {
  if (usingServer) {
    try {
      await fetch(`api/historial/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      usingServer = false;
      actualizarIndicadorAlmacen();
    }
  }
  if (!usingServer) {
    const lista = leerLocal().filter((e) => e.id !== id);
    escribirLocal(lista);
  }
  await renderHistorial();
}

async function limpiarHistorial() {
  const lista = await obtenerHistorial();
  if (lista.length === 0) return;
  if (!confirm(`¿Borrar las ${lista.length} preguntas del historial? Esta acción no se puede deshacer.`)) return;
  if (usingServer) {
    try {
      await fetch("api/historial", { method: "DELETE" });
    } catch {
      usingServer = false;
      actualizarIndicadorAlmacen();
    }
  }
  if (!usingServer) {
    localStorage.removeItem(STORAGE_KEY);
  }
  await renderHistorial();
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

async function renderHistorial() {
  const lista = await obtenerHistorial();
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
libreBtn.addEventListener("click", activarLibre);
cancelarBtn.addEventListener("click", cancelarForm);
form.addEventListener("submit", confirmarPregunta);
cambiarBtn.addEventListener("click", cambiarPregunta);
salirLibreBtn.addEventListener("click", salirLibre);

btn.addEventListener("click", spin);

historialLista.addEventListener("click", (e) => {
  const btnBorrar = e.target.closest(".borrar-item");
  if (!btnBorrar) return;
  const item = btnBorrar.closest(".historial-item");
  const id = item && item.dataset.id;
  if (id) borrarEntrada(id);
});

limpiarBtn.addEventListener("click", limpiarHistorial);

popupCerrarBtn.addEventListener("click", cerrarPopup);
popupOkBtn.addEventListener("click", cerrarPopup);
popupOverlay.addEventListener("click", (e) => {
  if (e.target === popupOverlay) cerrarPopup();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !popupOverlay.hidden) cerrarPopup();
});

window.addEventListener("resize", setupCanvas);

renderList();
setupCanvas();
actualizarGirar();

(async () => {
  await detectarServidor();
  await renderHistorial();
})();
