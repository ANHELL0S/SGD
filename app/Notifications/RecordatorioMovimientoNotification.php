<?php

namespace App\Notifications;

use App\Models\Documento;
use App\Models\Movimiento;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Recordatorio enviado al responsable de un movimiento pendiente de respuesta.
 *
 * Lo dispara un consultor manualmente desde la vista de movimientos pendientes.
 * El correo identifica al consultor que envía el recordatorio e incluye el número
 * de días hábiles transcurridos desde el envío para dar contexto de urgencia.
 */
class RecordatorioMovimientoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param Documento  $documento  Documento al que pertenece el movimiento pendiente.
     * @param Movimiento $movimiento Movimiento cuya respuesta se está solicitando.
     * @param User       $consultor  Usuario que disparó el recordatorio (aparece en el cuerpo del correo).
     */
    public function __construct(
        private readonly Documento $documento,
        private readonly Movimiento $movimiento,
        private readonly User $consultor,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $numero     = $this->documento->numero_oficio ?? 'S/N';
        $asunto     = $this->documento->asunto ?? $this->documento->numero_oficio ?? 'Sin asunto';
        $deArea     = $this->movimiento->deArea?->nombre  ?? 'Área desconocida';
        $aArea      = $this->movimiento->aArea?->nombre   ?? 'Área desconocida';
        $fechaEnvio = Carbon::parse($this->movimiento->fecha_envio)->format('d/m/Y H:i');
        $dias       = $this->movimiento->fecha_envio
            ? (int) Carbon::parse($this->movimiento->fecha_envio)->diffInWeekdays(now())
            : 0;

        $consultorNombre = trim("{$this->consultor->nombre} {$this->consultor->apellido}");
        $destinatario    = trim("{$notifiable->nombre} {$notifiable->apellido}");

        $mail = (new MailMessage)
            ->subject("Recordatorio: oficio {$numero} pendiente de respuesta")
            ->greeting("Estimado/a {$destinatario},")
            ->line("**{$consultorNombre}** te está recordando que tienes el siguiente oficio esperando tu respuesta:")
            ->line("**N° Oficio:** {$numero}")
            ->line("**Asunto:** {$asunto}")
            ->line("**De:** {$deArea} &rarr; **Para:** {$aArea}")
            ->line("**Enviado el:** {$fechaEnvio}");

        if ($dias > 0) {
            $mail->line("**Días hábiles transcurridos:** {$dias}");
        }

        if ($this->movimiento->comentario) {
            $mail->line("**Motivo del envío:** {$this->movimiento->comentario}");
        }

        return $mail
            ->action('Ver oficio', url("/user/movimientos/{$this->movimiento->id_movimiento}"))
            ->salutation('Sistema de Gestión de Oficios');
    }
}
