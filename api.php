<?php
/**
 * Backend PHP para la Ruleta de Gatos.
 * Guarda el historial en una base de datos MySQL (Hostinger u otra).
 *
 * Expone la misma API que server.py:
 *   GET    /api/historial      -> lista completa (JSON)
 *   POST   /api/historial      -> guarda una entrada
 *   DELETE /api/historial/ID   -> borra una entrada por id
 *   DELETE /api/historial      -> borra todas las entradas
 *
 * Requiere config.php con las credenciales de la base de datos.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$config_path = __DIR__ . '/config.php';
if (!file_exists($config_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Falta config.php. Copia config.example.php y ajústalo.']);
    exit;
}
require $config_path;

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'  => 'No se pudo conectar a la base de datos.',
        'detail' => $e->getMessage(),
        'host'   => $DB_HOST ?? null,
        'name'   => $DB_NAME ?? null,
        'user'   => $DB_USER ?? null,
    ]);
    exit;
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS historial (
            id       VARCHAR(64)  PRIMARY KEY,
            autor    VARCHAR(500) NOT NULL,
            pregunta TEXT         NOT NULL,
            gato     VARCHAR(100) NOT NULL,
            fecha    VARCHAR(40)  NOT NULL,
            INDEX idx_historial_fecha (fecha)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo crear la tabla historial.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Si está en un subdirectorio (ej. /ruleta/api/historial), quitar el prefijo.
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($base !== '' && strpos($path, $base) === 0) {
    $path = substr($path, strlen($base));
    if ($path === '' || $path === false) $path = '/';
}

// Extraer id (si viene)
$id = null;
if (preg_match('#^/api/historial/?$#', $path)) {
    // colección
} elseif (preg_match('#^/api/historial/([^/]+)/?$#', $path, $m)) {
    $id = urldecode($m[1]);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Ruta no encontrada']);
    exit;
}

function enviar_json(int $status, $body = null): void {
    http_response_code($status);
    if ($body !== null) echo json_encode($body, JSON_UNESCAPED_UNICODE);
}

try {
    if ($method === 'GET' && $id === null) {
        $rows = $pdo->query(
            "SELECT id, autor, pregunta, gato, fecha FROM historial ORDER BY fecha DESC LIMIT 500"
        )->fetchAll();
        enviar_json(200, $rows);
        exit;
    }

    if ($method === 'POST' && $id === null) {
        $raw = file_get_contents('php://input') ?: '';
        if (strlen($raw) > 1_000_000) {
            enviar_json(413, ['error' => 'Body demasiado grande']);
            exit;
        }
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            enviar_json(400, ['error' => 'JSON inválido']);
            exit;
        }
        $campos = ['id', 'autor', 'pregunta', 'gato', 'fecha'];
        foreach ($campos as $c) {
            if (!isset($body[$c]) || !is_string($body[$c]) || $body[$c] === '') {
                enviar_json(400, ['error' => "Falta campo: $c"]);
                exit;
            }
        }
        $stmt = $pdo->prepare(
            "REPLACE INTO historial (id, autor, pregunta, gato, fecha) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            mb_substr($body['id'], 0, 64),
            mb_substr($body['autor'], 0, 500),
            mb_substr($body['pregunta'], 0, 500),
            mb_substr($body['gato'], 0, 100),
            mb_substr($body['fecha'], 0, 40),
        ]);
        enviar_json(201, ['ok' => true]);
        exit;
    }

    if ($method === 'DELETE' && $id === null) {
        $pdo->exec("DELETE FROM historial");
        enviar_json(204);
        exit;
    }

    if ($method === 'DELETE' && $id !== null) {
        $stmt = $pdo->prepare("DELETE FROM historial WHERE id = ?");
        $stmt->execute([$id]);
        enviar_json(204);
        exit;
    }

    enviar_json(405, ['error' => 'Método no permitido']);
} catch (Throwable $e) {
    enviar_json(500, ['error' => 'Error interno']);
}
