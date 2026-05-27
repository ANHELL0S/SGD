<?php

namespace App\Jobs;

use App\Models\Documento;
use App\Services\OcrService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Job asíncrono que extrae texto de un PDF mediante OCR y lo persiste en `contenido_ocr`.
 *
 * Se encola al crear o actualizar el archivo de un documento. Si el documento ya no
 * existe cuando el job se ejecuta, se descarta silenciosamente.
 * El texto vacío se guarda como `null` para que las búsquedas full-text no indexen cadenas vacías.
 * Los errores se registran en el canal `errores` y se relanzán para que la cola reintente
 * (hasta `$tries = 2` veces) y mueva el job a la tabla `failed_jobs` si agota los intentos.
 */
class ProcesarOcrDocumentoJob implements ShouldQueue
{
    use Queueable;

    /** Máximo de intentos antes de mover el job a `failed_jobs`. */
    public int $tries = 2;

    /** Tiempo máximo de ejecución en segundos antes de que el worker mate el proceso. */
    public int $timeout = 300;

    /**
     * @param int    $documentoId ID del documento al que se le asignará el texto OCR.
     * @param string $archivoPath Ruta relativa dentro de `storage/app/public/`.
     */
    public function __construct(
        public readonly int $documentoId,
        public readonly string $archivoPath,
    ) {}

    /**
     * Ejecuta la extracción OCR y actualiza el campo `contenido_ocr` del documento.
     *
     * @param OcrService $ocrService Inyectado automáticamente por el contenedor de Laravel.
     */
    public function handle(OcrService $ocrService): void
    {
        $documento = Documento::find($this->documentoId);

        if ($documento === null) {
            return;
        }

        $absolutePath = storage_path('app/public/'.$this->archivoPath);

        try {
            $text = $ocrService->extractText($absolutePath);
            $documento->update([
                'contenido_ocr' => $text !== '' ? $text : null,
            ]);
        } catch (Throwable $exception) {
            Log::channel('errores')->error('OCR falló en job', [
                'id_documento' => $this->documentoId,
                'archivo' => $this->archivoPath,
                'exception_class' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }
}
