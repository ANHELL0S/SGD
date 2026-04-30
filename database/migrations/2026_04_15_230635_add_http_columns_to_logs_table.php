<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $addMetodoHttp = ! Schema::hasColumn('logs', 'metodo_http');
        $addEndpoint = ! Schema::hasColumn('logs', 'endpoint');
        $addStatusCode = ! Schema::hasColumn('logs', 'status_code');
        $addTiempoRespuesta = ! Schema::hasColumn('logs', 'tiempo_respuesta');
        $addRequestPayload = ! Schema::hasColumn('logs', 'request_payload');
        $addResponsePayload = ! Schema::hasColumn('logs', 'response_payload');

        Schema::table('logs', function (Blueprint $table) use (
            $addMetodoHttp,
            $addEndpoint,
            $addStatusCode,
            $addTiempoRespuesta,
            $addRequestPayload,
            $addResponsePayload
        ): void {
            if ($addMetodoHttp) {
                $table->string('metodo_http', 10)->nullable();
                $table->index('metodo_http');
            }

            if ($addEndpoint) {
                $table->string('endpoint', 255)->nullable();
            }

            if ($addStatusCode) {
                $table->integer('status_code')->nullable();
                $table->index('status_code');
            }

            if ($addTiempoRespuesta) {
                $table->integer('tiempo_respuesta')->nullable();
            }

            if ($addRequestPayload) {
                $table->longText('request_payload')->nullable();
            }

            if ($addResponsePayload) {
                $table->longText('response_payload')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $dropMetodoHttp = Schema::hasColumn('logs', 'metodo_http');
        $dropEndpoint = Schema::hasColumn('logs', 'endpoint');
        $dropStatusCode = Schema::hasColumn('logs', 'status_code');
        $dropTiempoRespuesta = Schema::hasColumn('logs', 'tiempo_respuesta');
        $dropRequestPayload = Schema::hasColumn('logs', 'request_payload');
        $dropResponsePayload = Schema::hasColumn('logs', 'response_payload');

        Schema::table('logs', function (Blueprint $table) use (
            $dropMetodoHttp,
            $dropEndpoint,
            $dropStatusCode,
            $dropTiempoRespuesta,
            $dropRequestPayload,
            $dropResponsePayload
        ): void {
            if ($dropMetodoHttp) {
                $table->dropColumn('metodo_http');
            }

            if ($dropEndpoint) {
                $table->dropColumn('endpoint');
            }

            if ($dropStatusCode) {
                $table->dropColumn('status_code');
            }

            if ($dropTiempoRespuesta) {
                $table->dropColumn('tiempo_respuesta');
            }

            if ($dropRequestPayload) {
                $table->dropColumn('request_payload');
            }

            if ($dropResponsePayload) {
                $table->dropColumn('response_payload');
            }
        });
    }
};
