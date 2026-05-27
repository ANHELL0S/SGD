<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use Smalot\PdfParser\Parser as PdfParser;
use thiagoalessio\TesseractOCR\TesseractOCR;

/**
 * Extrae texto de imágenes y PDFs combinando dos rutas de procesamiento:
 *
 * - PDFs digitales: PdfParser lee el texto embebido directamente (rápido, sin OCR).
 * - PDFs escaneados e imágenes: Imagick renderiza cada página a PNG y Tesseract
 *   realiza el reconocimiento óptico de caracteres.
 *
 * El umbral de 20 caracteres distingue PDFs digitales reales de aquellos que solo
 * contienen fuentes o artefactos embebidos sin texto significativo.
 */
class OcrService
{
    /**
     * @param string $tesseractExecutable Ruta al binario de Tesseract; cadena vacía usa el PATH del sistema.
     * @param string $language            Código de idioma ISO 639 (ej. 'spa', 'eng').
     * @param int    $imageDpi            DPI declarado al procesar imágenes sueltas.
     * @param int    $pdfDpi             DPI de rasterización al convertir páginas PDF a PNG.
     */
    public function __construct(
        private readonly string $tesseractExecutable,
        private readonly string $language,
        private readonly int $imageDpi,
        private readonly int $pdfDpi,
    ) {}

    /**
     * Process an image or PDF file and return extracted text.
     */
    public function extractText(string $absolutePath): string
    {
        if (! is_file($absolutePath)) {
            throw new RuntimeException("OCR file does not exist: {$absolutePath}");
        }

        return match (strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION))) {
            'png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp' => $this->extractFromImage($absolutePath),
            'pdf' => $this->extractFromPdf($absolutePath),
            default => throw new RuntimeException('Unsupported file extension for OCR. Use an image or PDF file.'),
        };
    }

    /**
     * Extrae texto de un archivo de imagen usando Tesseract directamente.
     *
     * @param string $absolutePath Ruta absoluta al archivo de imagen (PNG, JPG, TIFF, etc.).
     */
    protected function extractFromImage(string $absolutePath): string
    {
        $runner = new TesseractOCR($absolutePath);

        if ($this->tesseractExecutable !== '') {
            $runner->executable($this->tesseractExecutable);
        }

        $text = $runner
            ->lang($this->language)
            ->config('user_defined_dpi', (string) $this->imageDpi)
            ->run();

        return trim($text);
    }

    /**
     * Orquesta la extracción de texto de un PDF eligiendo la ruta óptima:
     * intenta primero la extracción directa de texto embebido (digital) y,
     * si el resultado es vacío, delega al motor OCR por páginas (escaneado).
     *
     * @param string $absolutePath Ruta absoluta al archivo PDF.
     */
    protected function extractFromPdf(string $absolutePath): string
    {
        // Fast path: extract embedded text directly (digital PDFs, no OCR needed)
        $text = $this->extractTextFromDigitalPdf($absolutePath);

        if ($text !== '') {
            return $text;
        }

        // Slow path: PDF is scanned — render pages and run Tesseract OCR
        return $this->extractFromScannedPdf($absolutePath);
    }

    /**
     * Intenta leer el texto embebido de un PDF digital con PdfParser.
     * Devuelve cadena vacía si el PDF está escaneado, está dañado o produce menos
     * de 20 caracteres (umbral para descartar artefactos de fuentes embebidas).
     *
     * @param string $absolutePath Ruta absoluta al archivo PDF.
     */
    private function extractTextFromDigitalPdf(string $absolutePath): string
    {
        try {
            $parser = new PdfParser;
            $pdf = $parser->parseFile($absolutePath);
            $text = trim($pdf->getText());

            // Require a minimum amount of real text to avoid treating
            // PDFs with only embedded fonts/artifacts as digital.
            if (mb_strlen($text) < 20) {
                return '';
            }

            return $text;
        } catch (\Throwable) {
            return '';
        }
    }

    /**
     * Convierte cada página del PDF a PNG mediante Imagick y aplica Tesseract por página.
     * El directorio temporal se elimina en el bloque `finally` aunque falle una página.
     *
     * @param  string $absolutePath Ruta absoluta al PDF escaneado.
     * @throws \RuntimeException Si la extensión Imagick no está disponible.
     */
    private function extractFromScannedPdf(string $absolutePath): string
    {
        if (! extension_loaded('imagick')) {
            throw new RuntimeException('PDF OCR requires the Imagick PHP extension.');
        }

        $tempDirectory = storage_path('app/ocr-temp/'.Str::uuid());
        File::ensureDirectoryExists($tempDirectory);

        $imagickClass = 'Imagick';
        $imagick = new $imagickClass;
        $imagick->setResolution($this->pdfDpi, $this->pdfDpi);
        $imagick->readImage($absolutePath);

        try {
            $texts = [];

            foreach ($imagick as $index => $page) {
                $imagePath = "{$tempDirectory}/page-{$index}.png";

                $page->setImageFormat('png');
                $page->writeImage($imagePath);

                $pageText = $this->extractFromImage($imagePath);

                if ($pageText !== '') {
                    $texts[] = $pageText;
                }
            }

            return trim(implode(PHP_EOL.PHP_EOL, $texts));
        } finally {
            $imagick->clear();
            $imagick->destroy();
            File::deleteDirectory($tempDirectory);
        }
    }
}
