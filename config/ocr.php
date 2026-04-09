<?php

return [
    'tesseract_executable' => env('TESSERACT_EXECUTABLE', '/usr/bin/tesseract'),
    'language' => env('OCR_LANGUAGE', 'spa'),
    'image_dpi' => (int) env('OCR_IMAGE_DPI', 300),
    'pdf_dpi' => (int) env('OCR_PDF_DPI', 300),
];
