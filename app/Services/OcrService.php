<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use thiagoalessio\TesseractOCR\TesseractOCR;

class OcrService
{
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

    protected function extractFromPdf(string $absolutePath): string
    {
        if (! extension_loaded('imagick')) {
            throw new RuntimeException('PDF OCR requires the Imagick PHP extension.');
        }

        $tempDirectory = storage_path('app/ocr-temp/'.Str::uuid());
        File::ensureDirectoryExists($tempDirectory);

        $imagickClass = 'Imagick';
        $imagick = new $imagickClass();
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
