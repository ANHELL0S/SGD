<?php

namespace App\Jobs;

use App\Models\Documento;
use App\Services\OcrService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcesarOcrDocumentoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 300;

    public function __construct(
        public readonly int $documentoId,
        public readonly string $archivoPath,
    ) {}

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
