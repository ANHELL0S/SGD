<?php

namespace App\Notifications;

use App\Models\Movimiento;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VencimientoMovimientoNotification extends Notification implements ShouldQueue
{
    use Queueable;

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
