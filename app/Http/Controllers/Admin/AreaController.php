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
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        return Inertia::render('admin/areas/index', [
            'areas' => Area::query()
                ->select(['id_area', 'nombre', 'created_at'])
                ->orderBy('nombre')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => [
                'per_page' => (string) $perPage,
            ],
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
}
