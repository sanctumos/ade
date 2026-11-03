<?php
/**
 * Same-origin reverse proxy with path-split:
 *   /v1/sanctum/registry/* → Registry (db/ade_registry_upstream.url, default :8870)
 *   everything else       → Letta Kernel (db/ade_upstream.url)
 * Client: ADE_CONFIG.base = https://ade.sanctumos.org/proxy.php
 * Requests: GET/POST/… proxy.php?path=/v1/agents/  (also PATH_INFO if enabled)
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Stainless-Package-Version');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

/**
 * Resolve a one-line upstream URL file beside the vhost db/ (or repo db/).
 */
function ade_read_upstream_file(string $docRoot, string $basename): string
{
    $candidates = [
        dirname($docRoot) . '/db/' . $basename,
        dirname(__DIR__) . '/db/' . $basename,
    ];
    foreach ($candidates as $file) {
        if (is_readable($file)) {
            $url = rtrim(trim((string)file_get_contents($file)), '/');
            if ($url !== '' && preg_match('#^https?://#i', $url)) {
                return $url;
            }
        }
    }
    return '';
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

$docRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__), '/');
$isRegistry = str_starts_with($path, '/v1/sanctum/registry');

if ($isRegistry) {
    $upstream = ade_read_upstream_file($docRoot, 'ade_registry_upstream.url');
    if ($upstream === '') {
        // Prefer the same edge as Letta (moya nginx path-splits /v1/sanctum/registry → :8870).
        $upstream = ade_read_upstream_file($docRoot, 'ade_upstream.url');
    }
    if ($upstream === '') {
        // Local lab default when no edge file exists.
        $upstream = 'http://127.0.0.1:8870';
    }
} else {
    $upstream = ade_read_upstream_file($docRoot, 'ade_upstream.url');
    if ($upstream === '') {
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'ADE proxy upstream not configured (db/ade_upstream.url)']);
        exit;
    }
}

$query = $_GET;
unset($query['path']);
$qs = http_build_query($query);
$url = $upstream . $path . ($qs !== '' ? ('?' . $qs) : '');
$body = file_get_contents('php://input');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
$wantStream = (stripos($accept, 'text/event-stream') !== false)
    || (is_string($body) && str_contains(str_replace(' ', '', $body), '"streaming":true'));

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
if ($accept !== '') {
    $headers[] = 'Accept: ' . $accept;
}
$stainless = (string)($_SERVER['HTTP_X_STAINLESS_PACKAGE_VERSION'] ?? '');
if ($wantStream) {
    // Letta 0.16+ 422s streaming=true unless the caller looks like SDK v1.0+.
    // PHP-cURL's default User-Agent is not letta-client/*, so inject on stream only.
    $headers[] = 'User-Agent: letta-client/1.0.0';
    $headers[] = 'X-Stainless-Package-Version: ' . ($stainless !== '' ? $stainless : '1.0.0');
} elseif ($stainless !== '') {
    $headers[] = 'X-Stainless-Package-Version: ' . $stainless;
}

$isMultipart = $ct !== '' && stripos($ct, 'multipart/form-data') !== false;
$postFields = ($method === 'GET' || $method === 'HEAD') ? null : $body;
if ($isMultipart && !empty($_FILES)) {
    // php://input is empty for multipart; rebuild so Letta gets file + form fields.
    $headers = array_values(array_filter($headers, static function ($h): bool {
        return stripos((string)$h, 'Content-Type:') !== 0;
    }));
    $postFields = $_POST;
    foreach ($_FILES as $field => $info) {
        if (!is_array($info) || (($info['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK)) {
            continue;
        }
        $tmp = (string)($info['tmp_name'] ?? '');
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            continue;
        }
        $mime = (string)($info['type'] ?? '');
        if ($mime === '') {
            $mime = 'application/octet-stream';
        }
        $postFields[$field] = new CURLFile($tmp, $mime, (string)($info['name'] ?? 'upload'));
    }
}

$ch = curl_init($url);
$curlOpts = [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_HEADER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_CONNECTTIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
];
if ($wantStream) {
    $curlOpts[CURLOPT_USERAGENT] = 'letta-client/1.0.0';
}
curl_setopt_array($ch, $curlOpts);

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
        // Registry missing → honest failure (not silent Letta).
        http_response_code(502);
        header('Content-Type: application/json');
    }
    $payload = [
        'error' => $isRegistry ? 'Registry upstream failed' : 'Upstream proxy failed',
        'detail' => $err,
    ];
    if ($isRegistry) {
        $payload['service'] = 'sanctum-registry';
        $payload['hint'] = 'Start Registry on loopback :8870 or set db/ade_registry_upstream.url';
    }
    echo json_encode($payload);
    exit;
}

$sendHeaders();
