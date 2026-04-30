<?php

namespace App\Support;

use Illuminate\Http\Request;

class RequestIpResolver
{
    /**
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
