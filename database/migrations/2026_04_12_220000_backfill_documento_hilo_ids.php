<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('documentos', 'hilo_id')) {
            return;
        }

        $rows = DB::table('documentos')
            ->select('id_documento', 'documento_padre_id', 'hilo_id')
            ->get();

        $documents = [];

        foreach ($rows as $row) {
            $documents[(int) $row->id_documento] = [
                'parent' => $row->documento_padre_id !== null ? (int) $row->documento_padre_id : null,
                'hilo' => $row->hilo_id !== null ? (int) $row->hilo_id : null,
            ];
        }

        $resolvedRoots = [];

        $resolveRoot = function (int $documentId, array $path = []) use (&$resolveRoot, &$resolvedRoots, $documents): int {
            if (isset($resolvedRoots[$documentId])) {
                return $resolvedRoots[$documentId];
            }

            if (in_array($documentId, $path, true)) {
                $resolvedRoots[$documentId] = $documentId;

                return $documentId;
            }

            if (! isset($documents[$documentId])) {
                $resolvedRoots[$documentId] = $documentId;

                return $documentId;
            }

            $parentId = $documents[$documentId]['parent'];

            if ($parentId === null) {
                $resolvedRoots[$documentId] = $documentId;

                return $documentId;
            }

            $rootId = $resolveRoot($parentId, [...$path, $documentId]);
            $resolvedRoots[$documentId] = $rootId;

            return $rootId;
        };

        foreach (array_keys($documents) as $documentId) {
            $expectedRootId = $resolveRoot($documentId);
            $currentHiloId = $documents[$documentId]['hilo'];

            if ($currentHiloId !== $expectedRootId) {
                DB::table('documentos')
                    ->where('id_documento', $documentId)
                    ->update(['hilo_id' => $expectedRootId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op: this is a data correction migration.
    }
};
