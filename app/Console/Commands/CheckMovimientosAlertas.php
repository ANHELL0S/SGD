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

/**
 * Comando programado que detecta escaladas de nivel en movimientos pendientes y genera alertas.
 *
 * Se ejecuta periódicamente (típicamente cada hora o cada día hábil). Para cada movimiento
 * que no tiene documentos generados y pertenece a un expediente abierto (o sin expediente),
 * calcula los días laborales transcurridos desde su envío y determina el nivel de urgencia:
 *
 *  - baja      : ≥ 1 día hábil
 *  - media     : ≥ 4 días hábiles
 *  - alta      : ≥ 7 días hábiles
 *  - bloqueado : > 10 días hábiles (dispara `VencimientoMovimientoNotification` por correo)
 *
 * Solo se genera alerta cuando el nivel *escala* (nunca en sentido contrario ni en el mismo nivel).
 * El nivel 'baja' no produce alerta de notificación, solo actualiza `ultimo_nivel_alerta`.
 */
class CheckMovimientosAlertas extends Command
{
    protected $signature = 'movimientos:check-alertas';
    protected $description = 'Detecta cambios de prioridad en movimientos y genera alertas';

    /** Orden ascendente de severidad de niveles para comparaciones de escalada. */
    private const NIVELES_ORDEN = ['baja', 'media', 'alta', 'bloqueado'];

    /**
     * Itera todos los movimientos pendientes, calcula su nivel y, si corresponde,
     * crea registros en `alerta_movimientos` y envía notificaciones por correo.
     */
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

    /**
     * Mapea días hábiles a nivel de urgencia. Devuelve null si aún no alcanza el nivel mínimo (< 1 día).
     *
     * @param int $dias Días hábiles transcurridos desde el envío del movimiento.
     */
    private function determinarNivel(int $dias): ?string
    {
        if ($dias > 10) return 'bloqueado';
        if ($dias >= 7)  return 'alta';
        if ($dias >= 4)  return 'media';
        if ($dias >= 1)  return 'baja';
        return null;
    }

    /**
     * Determina si corresponde generar una nueva alerta comparando el nivel previo con el actual.
     * Devuelve false si el nivel no es 'media', 'alta' o 'bloqueado', o si ya se notificó este nivel.
     *
     * @param string|null $ultimo Último nivel registrado en `ultimo_nivel_alerta`; null si es el primero.
     * @param string      $actual Nivel calculado para el ciclo actual.
     */
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

    /**
     * Crea registros de alerta en BD para los destinatarios del movimiento y,
     * si el nivel es 'bloqueado', envía `VencimientoMovimientoNotification` por correo.
     *
     * Los destinatarios son: el usuario específico (`destinatario_user_id`) si está asignado,
     * o todos los usuarios aprobados y habilitados del área destino.
     *
     * @param Movimiento $movimiento Movimiento que generó la escalada.
     * @param string     $nivel      Nivel calculado ('media', 'alta' o 'bloqueado').
     * @param int        $dias       Días hábiles transcurridos (se pasa a la notificación de vencimiento).
     */
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

    /**
     * Cuenta los días de lunes a viernes entre `$inicio` (exclusive) y `$fin` (inclusive).
     * El día de envío no se contabiliza: el primer día hábil es el día siguiente al envío.
     *
     * @param Carbon               $inicio Fecha de envío del movimiento.
     * @param \Carbon\CarbonInterface $fin  Momento actual (now()).
     */
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
