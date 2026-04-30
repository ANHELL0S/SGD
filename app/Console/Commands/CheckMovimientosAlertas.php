<?php

namespace App\Console\Commands;

use App\Models\AlertaMovimiento;
use App\Models\Movimiento;
use App\Models\User;
use App\Notifications\VencimientoMovimientoNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Notification;

class CheckMovimientosAlertas extends Command
{
    protected $signature = 'movimientos:check-alertas';
    protected $description = 'Detecta cambios de prioridad en movimientos y genera alertas';

    private const NIVELES_ORDEN = ['baja', 'media', 'alta', 'bloqueado'];

    public function handle(): void
    {
        $movimientos = Movimiento::query()
            ->with([
                'documento:id_documento,numero_oficio,asunto',
                'expediente:id_expediente,estado',
            ])
            ->where(function (Builder $q): void {
                $q->whereNull('expediente_id')
                    ->orWhereHas('expediente', fn (Builder $q) => $q->where('estado', 'abierto'));
            })
            ->whereDoesntHave('documentosGenerados')
            ->whereNotNull('a_area_id')
            ->whereNotNull('fecha_envio')
            ->get();

        $alertasCreadas = 0;

        foreach ($movimientos as $movimiento) {
            $dias = $this->calcularDiasLaborales(
                Carbon::parse($movimiento->fecha_envio),
                now(),
            );

            $nivelActual = $this->determinarNivel($dias);

            if ($nivelActual === null) {
                continue;
            }

            $ultimoNivel = $movimiento->ultimo_nivel_alerta;

            if ($this->debeGenerarAlerta($ultimoNivel, $nivelActual)) {
                $this->crearAlertasParaDestinatarios($movimiento, $nivelActual, $dias);
                $alertasCreadas++;
            }

            if ($nivelActual !== $ultimoNivel) {
                $movimiento->update(['ultimo_nivel_alerta' => $nivelActual]);
            }
        }

        $this->info("Alertas generadas: {$alertasCreadas}");
    }

    private function determinarNivel(int $dias): ?string
    {
        if ($dias > 10) return 'bloqueado';
        if ($dias >= 7)  return 'alta';
        if ($dias >= 4)  return 'media';
        if ($dias >= 1)  return 'baja';
        return null;
    }

    private function debeGenerarAlerta(?string $ultimo, string $actual): bool
    {
        // Solo notificar al cruzar a media, alta o bloqueado
        if (!in_array($actual, ['media', 'alta', 'bloqueado'], true)) {
            return false;
        }

        // Si ya estaba en este nivel o superior, no volver a notificar
        if ($ultimo !== null) {
            $posUltimo = array_search($ultimo, self::NIVELES_ORDEN, true);
            $posActual = array_search($actual, self::NIVELES_ORDEN, true);
            if ($posActual <= $posUltimo) {
                return false;
            }
        }

        return true;
    }

    private function crearAlertasParaDestinatarios(Movimiento $movimiento, string $nivel, int $dias): void
    {
        $docAsunto  = $movimiento->documento?->asunto;
        $docNumero  = $movimiento->documento?->numero_oficio;
        $asunto = ($docAsunto !== null && trim($docAsunto) !== '')
            ? $docAsunto
            : (($docNumero !== null && trim($docNumero) !== '')
                ? "Oficio {$docNumero}"
                : "Sin asunto");

        if ($movimiento->destinatario_user_id !== null) {
            $usuarios = User::query()
                ->where('id_user', $movimiento->destinatario_user_id)
                ->where('estado', 'aprobado')
                ->get();
        } else {
            $usuarios = User::query()
                ->where('area_id', $movimiento->a_area_id)
                ->where('estado', 'aprobado')
                ->where('habilitado', true)
                ->get();
        }

        foreach ($usuarios as $usuario) {
            AlertaMovimiento::create([
                'user_id'       => $usuario->id_user,
                'movimiento_id' => $movimiento->id_movimiento,
                'nivel'         => $nivel,
                'asunto'        => $asunto,
            ]);
        }

        if ($nivel === 'bloqueado') {
            Notification::send($usuarios, new VencimientoMovimientoNotification($movimiento, $dias));
        }
    }

    private function calcularDiasLaborales(Carbon $inicio, \Carbon\CarbonInterface $fin): int
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
}
