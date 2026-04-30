<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAreaRequest;
use App\Models\Area;
use App\Models\Movimiento;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AreaController extends Controller
{

    public function restore(int $id_area): RedirectResponse
    {
        $area = Area::onlyTrashed()->findOrFail($id_area);
        $area->restore();

        return to_route('admin.areas.index');
    }

    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 5);
        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        $deletedPerPage = (int) $request->integer('deleted_per_page', 5);
        if (! in_array($deletedPerPage, [5, 7, 10], true)) {
            $deletedPerPage = 5;
        }

        $areasActivas = Area::query()
            ->select(['id_area', 'nombre', 'created_at'])
            ->withExists([
                'usuarios as has_usuarios',
                'documentos as has_documentos',
                'movimientosSalida as has_movimientos_salida',
                'movimientosEntrada as has_movimientos_entrada',
                'expedientes as has_expedientes',
            ])
            ->whereNull('deleted_at')
            ->orderByDesc('id_area')
            ->paginate($perPage)
            ->through(function (Area $area): array {
                $hasDependencies = $area->has_usuarios
                    || $area->has_documentos
                    || $area->has_movimientos_salida
                    || $area->has_movimientos_entrada
                    || $area->has_expedientes;

                return [
                    'id_area' => $area->id_area,
                    'nombre' => $area->nombre,
                    'can_delete' => ! $hasDependencies,
                    'delete_block_reason' => $hasDependencies
                        ? 'No se puede eliminar esta área porque tiene oficios o movimientos asociados.'
                        : null,
                ];
            })
            ->withQueryString();

        return Inertia::render('admin/areas/index', [
            'areas' => $areasActivas,
            'filters' => [
                'per_page' => (string) $perPage,
                'deleted_per_page' => (string) $deletedPerPage,
            ],
            'areasEliminadas' => Inertia::optional(fn () => Area::onlyTrashed()
                ->select(['id_area', 'nombre', 'deleted_at'])
                ->orderByDesc('deleted_at')
                ->paginate($deletedPerPage, ['*'], 'deleted_page')
                ->through(fn (Area $area) => [
                    'id_area' => $area->id_area,
                    'nombre' => $area->nombre,
                    'deleted_at' => $area->deleted_at,
                ])
                ->withQueryString()
            ),
        ]);
    }

    public function store(StoreAreaRequest $request): RedirectResponse
    {
        Area::create($request->validated());

        return to_route('admin.areas.index');
    }

    public function update(StoreAreaRequest $request, Area $area): RedirectResponse
    {
        $area->update($request->validated());

        return to_route('admin.areas.index');
    }


    public function destroy(Area $area): RedirectResponse
    {
        $hasRelatedRecords = $area->usuarios()->exists()
            || $area->documentos()->exists()
            || $area->expedientes()->exists()
            || Movimiento::query()
                ->where('de_area_id', $area->id_area)
                ->orWhere('a_area_id', $area->id_area)
                ->exists();

        if ($hasRelatedRecords) {
            return back()->withErrors([
                'area' => 'No se puede eliminar esta area porque tiene registros asociados.',
            ]);
        }

        $area->delete();

        return to_route('admin.areas.index');
    }

    /**
     * Elimina permanentemente un área ya eliminada (soft deleted)
     */
    public function forceDelete(int $id_area): RedirectResponse
    {
        $area = Area::onlyTrashed()->findOrFail($id_area);

        if ($area->expedientes()->exists()) {
            return back()->withErrors([
                'area' => 'No se puede eliminar permanentemente esta área porque tiene expedientes asociados.',
            ]);
        }

        $area->forceDelete();
        return to_route('admin.areas.index');
    }


}
