<?php

namespace App\Broadcasting;

use App\Models\User;

/**
 * Autorización para el canal privado `areas.{areaId}.movimientos`.
 *
 * Los administradores pueden suscribirse a cualquier área; los demás usuarios
 * solo acceden al canal de su propia área (`user.area_id === areaId`).
 */
class MovimientoAreaChannel
{
    /**
     * Decide si el usuario puede suscribirse al canal del área indicada.
     *
     * @param  User $user   Usuario autenticado que solicita la suscripción.
     * @param  int  $areaId ID de área extraído del nombre del canal.
     */
    public function join(User $user, int $areaId): bool
    {
        return $user->rol === 'admin' || $user->area_id === $areaId;
    }
}
