<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Evento de broadcast que notifica en tiempo real cambios sobre documentos y movimientos.
 *
 * Implementa `ShouldBroadcast` para emitir a través de la cola (no bloquea la request)
 * y `ShouldRescue` para que un fallo de broadcast no interrumpa la petición HTTP.
 * Se emite en un canal privado por cada área involucrada en el movimiento, permitiendo
 * que los clientes de esa área refresquen su UI automáticamente vía Laravel Echo.
 */
class DocumentoMovimientoActualizado implements ShouldBroadcast, ShouldRescue
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param string  $accion   Acción que desencadenó el evento (ej. 'creado', 'actualizado').
     * @param mixed[] $payload  Datos adicionales que el cliente necesita para refrescar la UI.
     * @param int[]   $areaIds  IDs de las áreas cuyos canales recibirán el evento.
     */
    public function __construct(
        public readonly string $accion,
        public readonly array $payload,
        public readonly array $areaIds,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        foreach (array_unique(array_filter($this->areaIds)) as $areaId) {
            $channels[] = new PrivateChannel('areas.'.$areaId.'.movimientos');
        }

        return $channels;
    }

    /**
     * Nombre estable para suscripción con Laravel Echo.
     */
    public function broadcastAs(): string
    {
        return 'documento.movimiento.actualizado';
    }

    /**
     * Payload mínimo para refrescar UI en tiempo real.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'accion' => $this->accion,
            ...$this->payload,
        ];
    }
}
