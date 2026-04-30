<?php

namespace App\Broadcasting;

use App\Models\User;

class MovimientoAreaChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user, int $areaId): bool
    {
        return $user->rol === 'admin' || $user->area_id === $areaId;
    }
}
