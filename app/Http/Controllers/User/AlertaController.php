<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\AlertaMovimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestiona las alertas de movimientos para el usuario autenticado.
 *
 * Expone endpoints JSON para listar las últimas alertas con cálculo de días laborales
 * y para marcar alertas individuales o en bloque como leídas.
 */
class AlertaController extends Controller
{
    /**
     * Lista las últimas 30 alertas del usuario con días restantes y estado de respuesta.
     *
     * @param  Request $request
     * @return JsonResponse  `{ alertas: [...], no_leidas: int }`
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $alertas = AlertaMovimiento::query()
            ->with([
                'movimiento:id_movimiento,fecha_envio,documento_id',
                'movimiento.documento:id_documento,asunto,numero_oficio',
                'movimiento.documentosGenerados:id_documento,movimiento_origen_id',
            ])
            ->where('user_id', $user->id_user)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['id', 'movimiento_id', 'nivel', 'asunto', 'leido_at', 'created_at']);

        $noLeidas = $alertas->whereNull('leido_at')->count();

        $resultado = $alertas->map(function (AlertaMovimiento $alerta): array {
            $diasTranscurridos = 0;
            if ($alerta->movimiento?->fecha_envio) {
                $diasTranscurridos = $this->calcularDiasLaborales(
                    \Carbon\Carbon::parse($alerta->movimiento->fecha_envio),
                    now(),
                );
            }
            $diasRestantes = max(0, 10 - $diasTranscurridos);

            $yaRespondido = $alerta->movimiento?->documentosGenerados?->isNotEmpty() ?? false;

            $doc = $alerta->movimiento?->documento;
            $asunto = ($doc?->asunto !== null && trim($doc->asunto) !== '')
                ? $doc->asunto
                : (($doc?->numero_oficio !== null && trim($doc->numero_oficio) !== '')
                    ? "Oficio {$doc->numero_oficio}"
                    : $alerta->asunto);

            return [
                'id'             => $alerta->id,
                'movimiento_id'  => $alerta->movimiento_id,
                'nivel'          => $alerta->nivel,
                'asunto'         => $asunto,
                'leido_at'       => $alerta->leido_at,
                'created_at'     => $alerta->created_at,
                'dias_restantes' => $diasRestantes,
                'bloqueado'      => $diasTranscurridos > 10,
                'ya_respondido'  => $yaRespondido,
            ];
        });

        return response()->json([
            'alertas'   => $resultado,
            'no_leidas' => $noLeidas,
        ]);
    }

    /**
     * Cuenta los días laborales (lunes a viernes) entre dos fechas, sin incluir el día inicial.
     *
     * @param  \Carbon\Carbon          $inicio Fecha de inicio.
     * @param  \Carbon\CarbonInterface $fin    Fecha de fin.
     * @return int
     */
    private function calcularDiasLaborales(\Carbon\Carbon $inicio, \Carbon\CarbonInterface $fin): int
    {
        $dias = 0;
        $current = $inicio->copy()->addDay()->startOfDay();
        $end = $fin->copy()->startOfDay();

        while ($current->lte($end)) {
            if ($current->isWeekday()) {
                $dias++;
            }
            $current->addDay();
        }

        return $dias;
    }

    /**
     * Marca una alerta específica como leída (establece `leido_at`).
     *
     * Solo el propietario de la alerta puede marcarla; devuelve 403 en caso contrario.
     *
     * @param  Request         $request
     * @param  AlertaMovimiento $alerta Alerta a marcar (route model binding).
     * @return JsonResponse  `{ ok: true }`
     */
    public function marcarLeida(Request $request, AlertaMovimiento $alerta): JsonResponse
    {
        abort_unless($alerta->user_id === $request->user()?->id_user, 403);

        $alerta->update(['leido_at' => now()]);

        return response()->json(['ok' => true]);
    }

    /**
     * Marca todas las alertas no leídas del usuario autenticado como leídas en un solo UPDATE.
     *
     * @param  Request $request
     * @return JsonResponse  `{ ok: true }`
     */
    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        AlertaMovimiento::query()
            ->where('user_id', $user->id_user)
            ->whereNull('leido_at')
            ->update(['leido_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
