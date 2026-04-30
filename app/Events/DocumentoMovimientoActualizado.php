<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentoMovimientoActualizado implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
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
