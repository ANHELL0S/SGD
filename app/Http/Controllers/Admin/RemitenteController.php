<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRemitenteRequest;
use App\Models\Remitente;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RemitenteController extends Controller
{
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        return Inertia::render('admin/remitentes/index', [
            'remitentes' => Remitente::query()
                ->select(['id_remitente', 'nombre', 'estado', 'created_at'])
                ->orderBy('nombre')
                ->paginate($perPage)
                ->withQueryString(),
            'filters' => [
                'per_page' => (string) $perPage,
            ],
        ]);
    }

    public function store(StoreRemitenteRequest $request): RedirectResponse
    {
        Remitente::create($request->validated());

        return to_route('admin.remitentes.index');
    }

    public function update(StoreRemitenteRequest $request, Remitente $remitente): RedirectResponse
    {
        $remitente->update($request->validated());

        return to_route('admin.remitentes.index');
    }

    public function destroy(Remitente $remitente): RedirectResponse
    {
        if ($remitente->documentos()->exists()) {
            return back()->withErrors([
                'remitente' => 'No se puede eliminar este remitente porque tiene documentos asociados.',
            ]);
        }

        $remitente->delete();

        return to_route('admin.remitentes.index');
    }
}
