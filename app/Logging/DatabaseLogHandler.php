<?php

namespace App\Logging;

use App\Models\LogSistema;
use Illuminate\Support\Facades\Auth;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;
use Throwable;

class DatabaseLogHandler extends AbstractProcessingHandler
{
    protected function write(LogRecord $record): void
    {
        try {
            LogSistema::query()->create([
                'tipo' => strtolower($record->level->getName()),
                'mensaje' => $record->message,
                'contexto' => $this->normalizeArray($record->context),
                'user_id' => $this->resolveUserId($record->context),
            ]);
        } catch (Throwable) {
            // Avoid recursive logging failures if database logging itself fails.
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function resolveUserId(array $context): ?int
    {
        $contextUserId = $context['user_id'] ?? null;

        if (is_numeric($contextUserId)) {
            return (int) $contextUserId;
        }

        $id = Auth::id();

        return is_numeric($id) ? (int) $id : null;
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function normalizeArray(array $context): array
    {
        $normalized = [];

        foreach ($context as $key => $value) {
            $normalized[$key] = $this->normalizeValue($value);
        }

        return $normalized;
    }

    private function normalizeValue(mixed $value): mixed
    {
        if (is_array($value)) {
            return array_map(fn (mixed $item): mixed => $this->normalizeValue($item), $value);
        }

        if ($value instanceof Throwable) {
            return [
                'exception' => $value::class,
                'message' => $value->getMessage(),
                'code' => $value->getCode(),
            ];
        }

        if (is_object($value)) {
            if (method_exists($value, '__toString')) {
                return (string) $value;
            }

            return [
                'object' => $value::class,
            ];
        }

        if (is_resource($value)) {
            return 'resource';
        }

        return $value;
    }
}
