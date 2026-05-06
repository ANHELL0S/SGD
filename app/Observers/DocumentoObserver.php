<?php

namespace App\Observers;

use App\Models\Documento;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DocumentoObserver
{
    public function created(Documento $documento): void
    {
        // EXCLUDED.total referencia el valor del INSERT (1), evitando hard-code en el SET
        DB::statement(
            'INSERT INTO estadisticas_documentos (user_id, fecha, total, updated_at)
             VALUES (?, ?, 1, NOW())
             ON CONFLICT (user_id, fecha) DO UPDATE
             SET total      = estadisticas_documentos.total + EXCLUDED.total,
                 updated_at = NOW()',
            [
                $documento->user_id,
                $documento->fecha_oficio->toDateString(),
            ]
        );
    }

    public function deleted(Documento $documento): void
    {
        // GREATEST evita que un desincronismo puntual deje total negativo
        $affected = DB::affectingStatement(
            'UPDATE estadisticas_documentos
             SET total      = GREATEST(0, total - 1),
                 updated_at = NOW()
             WHERE user_id = ? AND fecha = ?',
            [
                $documento->user_id,
                $documento->fecha_oficio->toDateString(),
            ]
        );

        // 0 filas afectadas = la fila de stats no existía, señal de desincronización
        if ($affected === 0) {
            Log::channel('documentos')->warning('estadisticas_documentos: fila ausente al decrementar', [
                'id_documento' => $documento->id_documento,
                'user_id'      => $documento->user_id,
                'fecha'        => $documento->fecha_oficio->toDateString(),
            ]);
        }
    }

    public function restored(Documento $documento): void
    {
        // Idéntico al INSERT de created: restaurar es volver a existir
        DB::statement(
            'INSERT INTO estadisticas_documentos (user_id, fecha, total, updated_at)
             VALUES (?, ?, 1, NOW())
             ON CONFLICT (user_id, fecha) DO UPDATE
             SET total      = estadisticas_documentos.total + EXCLUDED.total,
                 updated_at = NOW()',
            [
                $documento->user_id,
                $documento->fecha_oficio->toDateString(),
            ]
        );
    }
}
