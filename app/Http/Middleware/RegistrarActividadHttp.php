<?php

namespace App\Http\Middleware;

use App\Models\LogSistema;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Registra en {@see LogSistema} la actividad HTTP de operaciones CRUD relevantes.
 *
 * Solo persiste peticiones POST/PUT/PATCH/DELETE que afecten rutas relacionadas con
 * áreas, documentos, movimientos, remitentes o usuarios. Los assets estáticos y las
 * pruebas unitarias se omiten automáticamente.
 */
class RegistrarActividadHttp
{
    /**
     * Intercepta la petición, mide el tiempo de respuesta y registra el log si aplica.
     *
     * El filtrado se delega a {@see debeOmitir} y a la verificación de método/ruta.
     *
     * @param  Request $request
     * @param  Closure $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $inicio = microtime(true);

        $response = $next($request);

        $tiempoRespuesta = (int) ((microtime(true) - $inicio) * 1000); // en ms

        // No registrar assets o requests específicas
        if ($this->debeOmitir($request)) {
            return $response;
        }

        // Solo registrar métodos CRUD
        $metodosCrud = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (!in_array($request->getMethod(), $metodosCrud, true)) {
            return $response;
        }

        // Solo registrar si la ruta afecta a las tablas relevantes
        $rutasRelevantes = ['areas', 'documentos', 'movimientos', 'remitentes', 'users'];
        $path = $request->path();
        $afectaCrud = false;
        foreach ($rutasRelevantes as $recurso) {
            if (str_contains($path, $recurso)) {
                $afectaCrud = true;
                break;
            }
        }
        if (!$afectaCrud) {
            return $response;
        }

        // Capturar payload del request
        $requestPayload = $this->capturarPayload($request);

        // Capturar response
        $responsePayload = $this->capturarResponse($response);

        // Crear el log solo si cumple los filtros
        LogSistema::query()->create([
            'tipo' => 'http',
            'mensaje' => "{$request->getMethod()} {$request->path()} - {$response->getStatusCode()}",
            'metodo_http' => $request->getMethod(),
            'endpoint' => $request->path(),
            'status_code' => $response->getStatusCode(),
            'tiempo_respuesta' => $tiempoRespuesta,
            'request_payload' => $requestPayload,
            'response_payload' => $responsePayload,
            'user_id' => Auth::id(),
            'contexto' => [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'referrer' => $request->headers->get('referer'),
                'url_completa' => $request->fullUrl(),
                'query_params' => $request->query(),
            ],
        ]);

        return $response;
    }

    /**
     * Extrae y serializa el body de la petición, sanitizando campos sensibles.
     *
     * Para JSON devuelve el body decodificado y re-codificado con pretty print;
     * para formularios excluye `_token`, `password` y `password_confirmation`.
     * Devuelve `null` si no hay payload o si ocurre un error.
     *
     * @param  Request $request
     * @return string|null JSON codificado o null.
     */
    private function capturarPayload(Request $request): ?string
    {
        try {
            if ($request->isJson()) {
                $payload = $request->json()->all();
                // Sanitizar datos sensibles
                $payload = $this->sanitizar($payload);

                return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }

            if ($request->getMethod() !== 'GET') {
                $datos = $request->except(['_token', 'password', 'password_confirmation']);
                $datos = $this->sanitizar($datos);

                return json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
        } catch (\Exception $e) {
            return null;
        }

        return null;
    }

    /**
     * Extrae un fragmento del body de la respuesta para almacenarlo en el log.
     *
     * - JSON: formatea con pretty print completo.
     * - HTML: trunca a 500 caracteres.
     * - Otros: trunca a 1000 caracteres.
     * Devuelve `null` si el contenido está vacío o ocurre un error.
     *
     * @param  Response $response
     * @return string|null
     */
    private function capturarResponse(Response $response): ?string
    {
        try {
            $content = $response->getContent();

            if (empty($content)) {
                return null;
            }

            // Si es JSON, formatearlo
            if (str_contains($response->headers->get('Content-Type', ''), 'application/json')) {
                $decoded = json_decode($content, true);
                if (is_array($decoded) || is_object($decoded)) {
                    return json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                }
            }

            // Si es HTML, solo capturar primeras líneas
            if (str_contains($response->headers->get('Content-Type', ''), 'text/html')) {
                return substr($content, 0, 500).'...';
            }

            return substr($content, 0, 1000);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Reemplaza valores de campos sensibles con `'***REDACTADO***'` de forma recursiva.
     *
     * Los campos considerados sensibles son: `password`, `password_confirmation`,
     * `token`, `api_key` y `secret`.
     *
     * @param  array<string, mixed> $datos
     * @return array<string, mixed>
     */
    private function sanitizar(array $datos): array
    {
        $camposSensibles = ['password', 'password_confirmation', 'token', 'api_key', 'secret'];

        foreach ($datos as $key => &$value) {
            if (in_array(strtolower($key), $camposSensibles)) {
                $value = '***REDACTADO***';
            } elseif (is_array($value)) {
                $value = $this->sanitizar($value);
            }
        }

        return $datos;
    }

    /**
     * Determina si la petición debe excluirse del log.
     *
     * Se omiten: ejecuciones de tests unitarios y peticiones cuya ruta termina
     * en extensión de asset estático (css, js, imágenes, fuentes, etc.).
     *
     * @param  Request $request
     * @return bool `true` si la petición debe ignorarse.
     */
    private function debeOmitir(Request $request): bool
    {
        if (app()->runningUnitTests()) {
            return true;
        }

        $omitir = [
            'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2',
            'ttf', 'eot', 'ico', 'map', 'webp',
        ];

        foreach ($omitir as $ext) {
            if (str_ends_with($request->path(), ".{$ext}")) {
                return true;
            }
        }

        return false;
    }
}
