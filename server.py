"""Servidor estático + API de historial para la Ruleta de Gatos.

Usa solo la stdlib de Python. Arranca con:

    python3 server.py

Expone:
    GET    /                 -> index.html (y el resto de archivos estáticos)
    GET    /api/historial    -> lista completa (JSON array)
    POST   /api/historial    -> guarda una entrada (JSON body)
    DELETE /api/historial    -> borra todas las entradas
    DELETE /api/historial/ID -> borra la entrada con id=ID

Los datos se guardan en historial.json junto a este archivo.
"""

import http.server
import json
import os
import socketserver
import threading
import urllib.parse
from pathlib import Path

PORT = int(os.environ.get("PORT", 3000))
ROOT = Path(__file__).resolve().parent
HISTORIAL_FILE = ROOT / "historial.json"
MAX_BODY = 1_000_000
MAX_ENTRIES = 500
_lock = threading.Lock()


def leer_historial():
    if not HISTORIAL_FILE.exists():
        return []
    try:
        data = json.loads(HISTORIAL_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def escribir_historial(lista):
    tmp = HISTORIAL_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(lista, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(HISTORIAL_FILE)


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
            with _lock:
                return self.send_json(200, leer_historial())
        if path.startswith("/api/"):
            return self.send_json(404, {"error": "Ruta no encontrada"})
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/historial":
            entrada = self.read_json_body()
            if not isinstance(entrada, dict):
                return self.send_json(400, {"error": "JSON inválido"})
            campos = ("id", "autor", "pregunta", "gato", "fecha")
            if not all(isinstance(entrada.get(c), str) and entrada.get(c) for c in campos):
                return self.send_json(400, {"error": "Faltan campos: " + ", ".join(campos)})
            limpia = {c: entrada[c][:500] for c in campos}
            with _lock:
                lista = leer_historial()
                lista = [e for e in lista if e.get("id") != limpia["id"]]
                lista.insert(0, limpia)
                escribir_historial(lista[:MAX_ENTRIES])
            return self.send_json(201, {"ok": True, "entrada": limpia})
        return self.send_json(405, {"error": "Método no permitido"})

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/historial":
            with _lock:
                escribir_historial([])
            return self.send_json(204)
        if path.startswith("/api/historial/"):
            entry_id = urllib.parse.unquote(path[len("/api/historial/"):])
            if not entry_id:
                return self.send_json(400, {"error": "ID requerido"})
            with _lock:
                lista = [e for e in leer_historial() if e.get("id") != entry_id]
                escribir_historial(lista)
            return self.send_json(204)
        return self.send_json(405, {"error": "Método no permitido"})


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with ThreadedHTTPServer(("0.0.0.0", PORT), Handler) as srv:
        print(f"Ruleta de Gatos corriendo en http://localhost:{PORT}")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
