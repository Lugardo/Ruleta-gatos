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
      btn.disabled = false;
      announceWinner(targetIndex);
    }
  }
  requestAnimationFrame(frame);
}

function announceWinner(idx) {
  ganadorEl.textContent = gatos[idx];
  document.querySelectorAll("#lista-gatos li").forEach((li, i) => {
    li.classList.toggle("ganador", i === idx);
  });
}

function renderList() {
  listaEl.innerHTML = gatos.map((g) => `<li>${g}</li>`).join("");
}

btn.addEventListener("click", spin);
canvas.addEventListener("click", spin);
btn.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    spin();
  }
});
window.addEventListener("resize", setupCanvas);

renderList();
setupCanvas();
