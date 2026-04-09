<?php

use Tests\TestCase;

uses(TestCase::class);

test('application timezone is set to america guayaquil', function () {
    expect(config('app.timezone'))->toBe('America/Guayaquil');
});
