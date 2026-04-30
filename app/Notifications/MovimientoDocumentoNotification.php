<?php

namespace App\Notifications;

use App\Models\Documento;
use App\Models\Movimiento;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MovimientoDocumentoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly Documento $documento,
        private readonly Movimiento $movimiento,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $numero = $this->documento->numero_oficio ?? 'S/N';
        $asunto = $this->documento->asunto ?? 'Sin asunto';
        $tipo = ucfirst($this->documento->tipo ?? 'desconocido');
        $deArea = $this->movimiento->deArea?->nombre ?? 'Área desconocida';
        $aArea = $this->movimiento->aArea?->nombre ?? 'Área desconocida';
        $fechaEnvio = Carbon::parse($this->movimiento->fecha_envio)->format('d/m/Y H:i');
        $comentario = $this->movimiento->comentario;
        $nombreDestinatario = trim("{$notifiable->nombre} {$notifiable->apellido}");

        $mail = (new MailMessage)
            ->subject("Nuevo oficio recibido: {$numero}")
            ->greeting("Estimado/a {$nombreDestinatario},")
            ->line("Se le ha enviado un oficio desde **{$deArea}** hacia **{$aArea}**.")
            ->line("**N° Oficio:** {$numero}")
            ->line("**Asunto:** {$asunto}")
            ->line("**Tipo:** {$tipo}")
            ->line("**Fecha de envío:** {$fechaEnvio}");

        if ($comentario !== null && $comentario !== '') {
            $mail->line("**Comentario:** {$comentario}");
        }

        return $mail->salutation('Sistema de Gestión de Oficios');
    }
}
