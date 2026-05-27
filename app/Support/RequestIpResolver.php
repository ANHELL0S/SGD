<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Extrae y separa las direcciones IP de una petición HTTP para el log de auditoría.
 *
 * Distingue la IP del cliente final (`$request->ip()`, resuelta con proxies de confianza)
 * de la IP del servidor proxy inmediato (`REMOTE_ADDR`). Cuando la petición es null
 * (ej. jobs en cola) devuelve todos los campos a null.
 */
class RequestIpResolver
{
    /**
     * Devuelve un array con ip, ip_cliente, ip_proxy e ips[] listos para incluir en un log.
     *
     * @param  Request|null $request Petición HTTP actual; null si se llama desde un job o CLI.
     * @return array<string, mixed>
     */
    public static function resolve(?Request $request): array
    {
        if ($request === null) {
            return [
                'ip' => null,
                'ip_cliente' => null,
                'ip_proxy' => null,
                'ips' => [],
            ];
        }

        $clientIp = $request->ip();
        $proxyIp = $request->server('REMOTE_ADDR');

        return [
            'ip' => $clientIp,
            'ip_cliente' => $clientIp,
            'ip_proxy' => is_string($proxyIp) && $proxyIp !== '' ? $proxyIp : null,
            'ips' => $request->ips(),
        ];
    }
}
