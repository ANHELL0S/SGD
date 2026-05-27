<?php

namespace App\Notifications;

use App\Models\Movimiento;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Alerta de vencimiento enviada cuando un movimiento supera los 10 días hábiles sin respuesta.
 *
 * La despacha el comando `movimientos:check-alertas` al detectar que el nivel del movimiento
 * escala a 'bloqueado'. Informa al destinatario del oficio, la fecha de envío y el número
 * exacto de días hábiles sin atender para motivar una respuesta inmediata.
 */
class VencimientoMovimientoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param Movimiento $movimiento  Movimiento en estado bloqueado que originó la alerta.
     * @param int        $diasHabiles Días hábiles transcurridos desde el envío (> 10).
     */
    public function __construct(
        private readonly Movimiento $movimiento,
        private readonly int $diasHabiles,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $numero     = $this->movimiento->documento?->numero_oficio ?? 'S/N';
        $asunto     = $this->movimiento->documento?->asunto
                        ?? $this->movimiento->documento?->numero_oficio
                        ?? 'Sin asunto';
        $deArea     = $this->movimiento->deArea?->nombre ?? 'Área desconocida';
        $aArea      = $this->movimiento->aArea?->nombre  ?? 'Área desconocida';
        $fechaEnvio = Carbon::parse($this->movimiento->fecha_envio)->format('d/m/Y');
        $destinatario = trim("{$notifiable->nombre} {$notifiable->apellido}");

        return (new MailMessage)
            ->subject("La solicitud \"{$asunto}\" ha vencido")
            ->greeting("Estimado/a {$destinatario},")
            ->line("La siguiente solicitud ha superado el tiempo máximo de respuesta sin ser atendida:")
            ->line("## \"{$asunto}\"")
            ->line("**N° Oficio:** {$numero}")
            ->line("**De:** {$deArea} &rarr; **Para:** {$aArea}")
            ->line("**Fecha de envío:** {$fechaEnvio}")
            ->line("**Días hábiles sin respuesta:** {$this->diasHabiles}")
            ->line("Por favor, atiende esta solicitud a la brevedad posible.")
            ->action('Ver solicitud', url("/user/movimientos/{$this->movimiento->id_movimiento}"))
            ->salutation('Sistema de Gestión de Oficios');
    }
}
