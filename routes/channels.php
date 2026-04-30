<?php

use App\Broadcasting\MovimientoAreaChannel;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('areas.{areaId}.movimientos', MovimientoAreaChannel::class);
