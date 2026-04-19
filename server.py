"""Servidor estático + API de historial para la Ruleta de Gatos.

Usa solo la stdlib de Python. Arranca con:

    python3 server.py

Expone:
    GET    /                 -> index.html (y el resto de archivos estáticos)
    GET    /api/historial    -> lista completa (JSON array)
    POST   /api/historial    -> guarda una entrada (JSON body)
    DELETE /api/historial    -> borra todas las entradas
    DELETE /api/historial/ID -> borra la entrada con id=ID

Los datos se guardan en ruleta.db (SQLite) junto a este archivo.
Si existe un historial.json anterior se migra automáticamente la
primera vez que arranca el servidor.
"""

import http.server
import json
import os
import socketserver
import sqlite3
import urllib.parse
from pathlib import Path

PORT = int(os.environ.get("PORT", 3000))
ROOT = Path(__file__).resolve().parent
DB_FILE = ROOT / "ruleta.db"
MAX_BODY = 1_000_000
MAX_ENTRIES = 500
CAMPOS = ("id", "autor", "pregunta", "gato", "fecha")


def get_conn():
    conn = sqlite3.connect(str(DB_FILE), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS historial (
                id       TEXT PRIMARY KEY,
                autor    TEXT NOT NULL,
                pregunta TEXT NOT NULL,
                gato     TEXT NOT NULL,
                fecha    TEXT NOT NULL
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial(fecha DESC)"
        )
    _migrar_json_legacy()


def _migrar_json_legacy():
    legacy = ROOT / "historial.json"
    if not legacy.exists():
        return
    try:
        data = json.loads(legacy.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[ruleta] No se pudo leer historial.json: {exc}")
        return
    if not isinstance(data, list):
        return
    migrados = 0
    with get_conn() as conn:
        for entrada in data:
            if not isinstance(entrada, dict):
                continue
            if not all(isinstance(entrada.get(c), str) and entrada.get(c) for c in CAMPOS):
                continue
            conn.execute(
                "INSERT OR IGNORE INTO historial (id, autor, pregunta, gato, fecha) VALUES (?, ?, ?, ?, ?)",
                tuple(entrada[c] for c in CAMPOS),
            )
            migrados += 1
    legacy.rename(legacy.with_suffix(".json.migrated"))
    print(f"[ruleta] Migrados {migrados} registros de historial.json a SQLite.")


def leer_historial():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, autor, pregunta, gato, fecha FROM historial "
            "ORDER BY fecha DESC LIMIT ?",
            (MAX_ENTRIES,),
        ).fetchall()
    return [dict(row) for row in rows]


def insertar_entrada(entrada):
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO historial (id, autor, pregunta, gato, fecha) "
            "VALUES (?, ?, ?, ?, ?)",
            tuple(entrada[c] for c in CAMPOS),
        )


def borrar_entrada(entry_id):
    with get_conn() as conn:
        conn.execute("DELETE FROM historial WHERE id = ?", (entry_id,))


def borrar_todo():
    with get_conn() as conn:
        conn.execute("DELETE FROM historial")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print("[ruleta]", self.address_string(), "-", fmt % args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, status, obj=None):
        payload = b"" if obj is None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if payload:
            self.wfile.write(payload)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0 or length > MAX_BODY:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return None

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/historial":
            try:
                return self.send_json(200, leer_historial())
            except sqlite3.Error as exc:
                return self.send_json(500, {"error": f"DB: {exc}"})
        if path.startswith("/api/"):
            return self.send_json(404, {"error": "Ruta no encontrada"})
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/historial":
            entrada = self.read_json_body()
            if not isinstance(entrada, dict):
                return self.send_json(400, {"error": "JSON inválido"})
            if not all(isinstance(entrada.get(c), str) and entrada.get(c) for c in CAMPOS):
                return self.send_json(400, {"error": "Faltan campos: " + ", ".join(CAMPOS)})
            limpia = {c: entrada[c][:500] for c in CAMPOS}
            try:
                insertar_entrada(limpia)
            except sqlite3.Error as exc:
                return self.send_json(500, {"error": f"DB: {exc}"})
            return self.send_json(201, {"ok": True, "entrada": limpia})
        return self.send_json(405, {"error": "Método no permitido"})

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/historial":
            try:
                borrar_todo()
            except sqlite3.Error as exc:
                return self.send_json(500, {"error": f"DB: {exc}"})
            return self.send_json(204)
        if path.startswith("/api/historial/"):
            entry_id = urllib.parse.unquote(path[len("/api/historial/"):])
            if not entry_id:
                return self.send_json(400, {"error": "ID requerido"})
            try:
                borrar_entrada(entry_id)
            except sqlite3.Error as exc:
                return self.send_json(500, {"error": f"DB: {exc}"})
            return self.send_json(204)
        return self.send_json(405, {"error": "Método no permitido"})


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    init_db()
    with ThreadedHTTPServer(("0.0.0.0", PORT), Handler) as srv:
        print(f"Ruleta de Gatos corriendo en http://localhost:{PORT}")
        print(f"Base de datos: {DB_FILE}")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
