# Ruleta de Gatos 🐱

Página web estática que muestra una ruleta giratoria con 19 gatos. El flujo es:

1. Escribe **quién pregunta** y **la pregunta**.
2. Pulsa **Confirmar pregunta** (los campos se bloquean y se habilita el giro).
3. Gira la ruleta y un gato "responde" al azar.
4. La pregunta, el autor y el gato ganador se guardan en un historial persistente (localStorage).
5. Pulsa **Nueva pregunta** para empezar otra ronda, o **Borrar historial** para limpiarlo.

## Cómo usarla

Opción 1 — abrir directamente:
```
Doble clic en index.html
```

Opción 2 — servidor local (recomendado):
```bash
python3 -m http.server 8000
# luego visita http://localhost:8000
```

## Stack
- HTML5 + CSS3 + JavaScript vanilla (sin dependencias).
- `<canvas>` 2D para dibujar la ruleta.
- `requestAnimationFrame` con easing `easeOutCubic` para el giro.

## Archivos
- `index.html` — estructura de la página.
- `styles.css` — estilos y layout responsive.
- `script.js` — array de gatos, dibujo de la ruleta y lógica de giro.

## Lista de gatos
Dexter, Marty, Lilo, Lulú, Eddy, Bell, Turoc, Lana, Yeyuni, Catalino, Héctor, Egle, Sonata, Poah, Gris, Dior, Wero, Nimbus, Medio bigote.

## Personalización
Edita el array `gatos` en `script.js` para añadir, quitar o renombrar participantes — la ruleta se redibuja automáticamente con el número de sectores que tenga el array.

## Cache-busting
Los navegadores cachean `styles.css` y `script.js` de forma agresiva. Para que los usuarios reciban siempre la última versión:

1. Meta tags en `index.html` fuerzan `no-cache` para el propio HTML.
2. Los assets se cargan con un sufijo `?v=YYYY-MM-DD-N` (ej. `styles.css?v=2026-04-19-1`).

**Cada vez que modifiques `styles.css` o `script.js`, incrementa el sufijo `?v=` en `index.html`.** Si en un mismo día haces varios cambios, sube el contador final (`-1`, `-2`, `-3`…). Busca en el HTML el comentario `Cache-busting:` para encontrarlo rápido.
