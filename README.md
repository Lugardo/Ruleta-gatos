# Ruleta de Gatos 🐱

Página web estática que muestra una ruleta giratoria con 19 gatos. El flujo es:

1. Escribe **quién pregunta** y **la pregunta**.
2. Pulsa **Confirmar pregunta** (los campos se bloquean y se habilita el giro).
3. Gira la ruleta y un gato "responde" al azar.
4. La pregunta, el autor y el gato ganador se guardan en un historial persistente (localStorage).
5. Pulsa **Nueva pregunta** para empezar otra ronda, o **Borrar historial** para limpiarlo.

## Cómo usarla

### Opción A — modo servidor (historial compartido, recomendado)

```bash
python3 server.py
# luego visita http://localhost:3000
```

`server.py` solo usa la stdlib de Python (sin dependencias). Sirve la página y expone una API en `/api/historial` que guarda los datos en una base de datos **SQLite** (`ruleta.db`, también junto al servidor). Todas las personas que accedan desde la misma dirección verán y compartirán el mismo historial.

Si venías de una versión anterior con `historial.json`, al arrancar el servidor se migra automáticamente a la DB y el archivo original se renombra a `historial.json.migrated`.

### Opción B — Hostinger (u otro hosting PHP+MySQL)

Ideal para que **todo el mundo vea el mismo historial desde cualquier dispositivo** sin tener que mantener una máquina encendida.

1. En el hPanel de Hostinger crea una **base de datos MySQL**: `hPanel > Bases de datos > MySQL`. Anota host, nombre de la DB, usuario y contraseña.
2. Copia `config.example.php` a `config.php` y rellena esos 4 valores.
3. Sube por File Manager o FTP a `public_html/` los archivos:
   - `index.html`, `styles.css`, `script.js`
   - `api.php`, `config.php`, `.htaccess`
4. Entra a tu dominio — la tabla `historial` se crea sola la primera vez que alguien carga la página.

**No subas** `config.php` a git ni a repos públicos (ya está en `.gitignore`). Tampoco subas `server.py` ni `ruleta.db` — esos son solo para desarrollo local.

### Opción C — modo local sin backend (historial por navegador)

Abre `index.html` directamente, o sírvelo con un static server cualquiera (`python3 -m http.server 8000`). Sin backend, el historial se guarda solo en `localStorage` del navegador.

La UI indica en qué modo estás con un badge junto a "Historial":
- **🌐 Guardado en servidor** — los datos viven en `historial.json`.
- **💾 Guardado localmente** — los datos viven solo en este navegador.

## Stack
- HTML5 + CSS3 + JavaScript vanilla (sin dependencias).
- `<canvas>` 2D para dibujar la ruleta.
- `requestAnimationFrame` con easing `easeOutCubic` para el giro.

## Archivos
- `index.html` — estructura de la página.
- `styles.css` — estilos y layout responsive.
- `script.js` — array de gatos, dibujo de la ruleta y lógica de giro.
- `server.py` — servidor estático + API `/api/historial` para desarrollo local (SQLite).
- `ruleta.db` — base de datos SQLite local (creada en runtime, ignorada por git).
- `api.php` — mismo API pero para hosting compartido con PHP + MySQL (Hostinger, etc.).
- `config.example.php` — plantilla de credenciales MySQL; copiar a `config.php`.
- `.htaccess` — rutea `/api/historial` a `api.php` y fija cache-control.

### Esquema de la DB
```sql
CREATE TABLE historial (
  id       TEXT PRIMARY KEY,
  autor    TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  gato     TEXT NOT NULL,
  fecha    TEXT NOT NULL
);
CREATE INDEX idx_historial_fecha ON historial(fecha DESC);
```

Puedes inspeccionarla con `sqlite3 ruleta.db "SELECT * FROM historial;"`.

## API del servidor
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/historial`     | Devuelve todas las entradas (JSON array). |
| POST   | `/api/historial`     | Guarda una entrada (`{id, autor, pregunta, gato, fecha}`). |
| DELETE | `/api/historial/:id` | Borra la entrada con el id dado. |
| DELETE | `/api/historial`     | Borra todas las entradas. |

## Lista de gatos
Dexter, Marty, Lilo, Lulú, Eddy, Bell, Turoc, Lana, Yeyuni, Catalino, Héctor, Egle, Sonata, Poah, Gris, Dior, Wero, Nimbus, Medio bigote.

## Personalización
Edita el array `gatos` en `script.js` para añadir, quitar o renombrar participantes — la ruleta se redibuja automáticamente con el número de sectores que tenga el array.

## Cache-busting
Los navegadores cachean `styles.css` y `script.js` de forma agresiva. Para que los usuarios reciban siempre la última versión:

1. Meta tags en `index.html` fuerzan `no-cache` para el propio HTML.
2. Los assets se cargan con un sufijo `?v=YYYY-MM-DD-N` (ej. `styles.css?v=2026-04-19-1`).

**Cada vez que modifiques `styles.css` o `script.js`, incrementa el sufijo `?v=` en `index.html`.** Si en un mismo día haces varios cambios, sube el contador final (`-1`, `-2`, `-3`…). Busca en el HTML el comentario `Cache-busting:` para encontrarlo rápido.
