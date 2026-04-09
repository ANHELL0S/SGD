<?php

use App\Services\OcrService;

test('throws when the input file does not exist', function () {
    $service = new OcrService('/usr/bin/tesseract', 'spa', 300, 300);

    expect(fn () => $service->extractText('/tmp/non-existing-ocr-file.png'))
        ->toThrow(RuntimeException::class, 'OCR file does not exist');
});

test('throws when file extension is unsupported', function () {
    $directory = sys_get_temp_dir().'/ocr-tests';
    $filePath = $directory.'/unsupported.txt';

    if (! is_dir($directory)) {
        mkdir($directory, 0777, true);
    }

    file_put_contents($filePath, 'not an image');

    $service = new OcrService('/usr/bin/tesseract', 'spa', 300, 300);

    try {
        expect(fn () => $service->extractText($filePath))
            ->toThrow(RuntimeException::class, 'Unsupported file extension for OCR');
    } finally {
        if (is_file($filePath)) {
            unlink($filePath);
        }
    }
});
