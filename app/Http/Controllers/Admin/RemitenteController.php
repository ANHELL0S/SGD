<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRemitenteRequest;
use App\Models\Remitente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RemitenteController extends Controller
{
    /**
     * Muestra la lista de remitentes activos y eliminados.
     */
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 5);

        if (! in_array($perPage, [5, 7, 10], true)) {
            $perPage = 5;
        }

        // Remitentes Activos con paginación
        $remitentesActivos = Remitente::query()
            ->select(['id_remitente', 'nombre', 'email', 'estado', 'created_at'])
            ->withExists(['documentos as has_documentos'])
            ->whereNull('deleted_at')
            ->orderByDesc('id_remitente')
            ->paginate($perPage)
            ->through(function (Remitente $remitente): array {
                return [
                    'id_remitente' => $remitente->id_remitente,
                    'nombre' => $remitente->nombre,
                    'email' => $remitente->email,
                    'estado' => $remitente->estado,
                    'can_delete' => ! $remitente->has_documentos,
                    'delete_block_reason' => $remitente->has_documentos
                        ? 'No se puede eliminar este remitente porque tiene documentos asociados.'
                        : null,
                ];
            })
            ->withQueryString();

        $deletedPerPage = (int) $request->integer('deleted_per_page', 5);
        if (! in_array($deletedPerPage, [5, 7, 10], true)) {
            $deletedPerPage = 5;
        }

        return Inertia::render('admin/remitentes/index', [
            'remitentes' => $remitentesActivos,
            'filters' => [
                'per_page' => (string) $perPage,
                'deleted_per_page' => (string) $deletedPerPage,
            ],
            'remitentesEliminados' => Inertia::optional(fn () => Remitente::onlyTrashed()
                ->select(['id_remitente', 'nombre', 'deleted_at'])
                ->orderByDesc('deleted_at')
                ->paginate($deletedPerPage, ['*'], 'deleted_page')
                ->through(fn (Remitente $remitente) => [
                    'id_remitente' => $remitente->id_remitente,
                    'nombre' => $remitente->nombre,
                    'deleted_at' => $remitente->deleted_at,
                ])
                ->withQueryString()
            ),
        ]);
    }

    /**
     * Crea un remitente desde un formulario embebido y devuelve JSON.
     */
    public function quickStore(StoreRemitenteRequest $request): JsonResponse
    {
        $remitente = Remitente::create($request->validated());

        return response()->json([
            'id_remitente' => $remitente->id_remitente,
            'nombre'       => $remitente->nombre,
        ], 201);
    }

    /**
     * Crea un nuevo remitente.
     */
    public function store(StoreRemitenteRequest $request): RedirectResponse
    {
        Remitente::create($request->validated());

        return to_route('admin.remitentes.index')
            ->with('success', 'Remitente creado correctamente.');
    }

    /**
     * Actualiza un remitente existente.
     */
    public function update(StoreRemitenteRequest $request, Remitente $remitente): RedirectResponse
    {
        $remitente->update($request->validated());

        return to_route('admin.remitentes.index')
            ->with('warning', 'Remitente actualizado correctamente.');
    }

    /**
     * Elimina (Soft Delete) un remitente si no tiene dependencias.
     */
    public function destroy(Remitente $remitente): RedirectResponse
    {
        // Verificar si el remitente ya está eliminado (soft delete)
        if ($remitente->trashed()) {
            return back()->withErrors([
                'remitente' => 'Este remitente ya se encuentra eliminado.',
            ]);
        }

        if ($remitente->documentos()->exists()) {
            return back()->withErrors([
                'remitente' => 'No se puede eliminar este remitente porque tiene documentos asociados.',
            ]);
        }

        $remitente->delete();

        return to_route('admin.remitentes.index');
    }

    /**
     * Restaura un remitente eliminado.
     */
    public function restore(int $id_remitente): RedirectResponse
    {
        $remitente = Remitente::onlyTrashed()->findOrFail($id_remitente);
        $remitente->restore();

        return to_route('admin.remitentes.index')
            ->with('success', 'Remitente restaurado correctamente.');
    }

    /**
     * Elimina permanentemente un remitente (force delete).
     */
    public function forceDelete(int $id_remitente): RedirectResponse
    {
        $remitente = Remitente::onlyTrashed()->findOrFail($id_remitente);

        // Verificar si tiene documentos antes de eliminar permanentemente
        if ($remitente->documentos()->exists()) {
            return back()->withErrors([
                'remitente' => 'No se puede eliminar permanentemente este remitente porque tiene documentos asociados.',
            ]);
        }

        $remitente->forceDelete();

        return to_route('admin.remitentes.index')
            ->with('error', 'Remitente eliminado permanentemente.');
    }
}
