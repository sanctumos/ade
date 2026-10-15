<?php
/**
 * Same-origin reverse proxy → self-hosted Letta.
 * Upstream: ../db/ade_upstream.url (one line, no trailing slash) beside the vhost.
 * Client: ADE_CONFIG.base = https://ade.sanctumos.org/proxy.php
 * Requests: GET/POST/… proxy.php?path=/v1/agents/  (also PATH_INFO if enabled)
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

$docRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__), '/');
$upstreamFile = dirname($docRoot) . '/db/ade_upstream.url';
if (!is_readable($upstreamFile)) {
    // Repo-relative fallback when serving from checkout
    $alt = dirname(__DIR__) . '/db/ade_upstream.url';
    if (is_readable($alt)) {
        $upstreamFile = $alt;
    }
}

$upstream = '';
if (is_readable($upstreamFile)) {
    $upstream = trim((string)file_get_contents($upstreamFile));
}
$upstream = rtrim($upstream, '/');
if ($upstream === '' || !preg_match('#^https?://#i', $upstream)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'ADE proxy upstream not configured (db/ade_upstream.url)']);
    exit;
}

$path = '';
if (!empty($_GET['path'])) {
    $path = (string)$_GET['path'];
} elseif (!empty($_SERVER['PATH_INFO'])) {
    $path = (string)$_SERVER['PATH_INFO'];
}
$path = '/' . ltrim($path, '/');
if ($path === '/' || str_contains($path, '..')) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing or invalid path']);
    exit;
}

$query = $_GET;
unset($query['path']);
$qs = http_build_query($query);
$url = $upstream . $path . ($qs !== '' ? ('?' . $qs) : '');

$headers = [];
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($auth === '' && function_exists('apache_request_headers')) {
    $hrs = apache_request_headers();
    foreach ($hrs ?: [] as $k => $v) {
        if (strtolower((string)$k) === 'authorization') {
            $auth = (string)$v;
            break;
        }
    }
}
if ($auth !== '') {
    $headers[] = 'Authorization: ' . $auth;
}
$ct = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if ($ct !== '') {
    $headers[] = 'Content-Type: ' . $ct;
}
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
if ($accept !== '') {
    $headers[] = 'Accept: ' . $accept;
}

$body = file_get_contents('php://input');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_POSTFIELDS => ($method === 'GET' || $method === 'HEAD') ? null : $body,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_HEADER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_CONNECTTIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
]);

$wantStream = (stripos($accept, 'text/event-stream') !== false)
    || (is_string($body) && str_contains($body, '"streaming":true'));

$status = 0;
$responseHeaders = [];

curl_setopt($ch, CURLOPT_HEADERFUNCTION, static function ($ch, string $headerLine) use (&$status, &$responseHeaders, $wantStream): int {
    $len = strlen($headerLine);
    if (preg_match('#^HTTP/\S+\s+(\d+)#', $headerLine, $m)) {
        $status = (int)$m[1];
        return $len;
    }
    $trim = trim($headerLine);
    if ($trim === '') {
        return $len;
    }
    $pos = strpos($trim, ':');
    if ($pos === false) {
        return $len;
    }
    $name = strtolower(substr($trim, 0, $pos));
    $value = trim(substr($trim, $pos + 1));
    if (in_array($name, ['content-type', 'cache-control', 'x-accel-buffering'], true)) {
        $responseHeaders[$name] = $value;
    }
    return $len;
});

// Send upstream status/headers before body when possible
$headersSent = false;
$sendHeaders = static function () use (&$headersSent, &$status, &$responseHeaders, $wantStream): void {
    if ($headersSent) {
        return;
    }
    $headersSent = true;
    http_response_code($status > 0 ? $status : 502);
    foreach ($responseHeaders as $n => $v) {
        header($n . ': ' . $v);
    }
    if ($wantStream) {
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');
        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }
        @ini_set('zlib.output_compression', '0');
        @ini_set('output_buffering', 'off');
        while (ob_get_level() > 0) {
            ob_end_flush();
        }
    }
};

curl_setopt($ch, CURLOPT_WRITEFUNCTION, static function ($ch, string $chunk) use ($sendHeaders): int {
    $sendHeaders();
    echo $chunk;
    if (function_exists('ob_flush')) {
        @ob_flush();
    }
    flush();
    return strlen($chunk);
});

$ok = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($ok === false) {
    if (!$headersSent) {
        http_response_code(502);
        header('Content-Type: application/json');
    }
    echo json_encode(['error' => 'Upstream proxy failed', 'detail' => $err]);
    exit;
}

$sendHeaders();
