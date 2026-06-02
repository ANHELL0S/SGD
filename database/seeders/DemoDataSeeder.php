<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Documento;
use App\Models\Expediente;
use App\Models\Movimiento;
use App\Models\Remitente;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── Áreas ──────────────────────────────────────────────────
        [$secGen, $dirAdmin, $dirFin, $depLegal, $rrhh, $tech] = collect([
            'Secretaría General',
            'Dirección Administrativa',
            'Dirección Financiera',
            'Departamento Legal',
            'Recursos Humanos',
            'Tecnología e Innovación',
        ])->map(fn ($nombre) => Area::firstOrCreate(['nombre' => $nombre]))->values()->all();

        // ── Remitentes ─────────────────────────────────────────────
        [$minEdu, $contraloria, $iess, $prefectura, $minSalud] = collect([
            ['nombre' => 'Ministerio de Educación',       'email' => 'despacho@educacion.gob.ec'],
            ['nombre' => 'Contraloría General del Estado', 'email' => 'info@contraloria.gob.ec'],
            ['nombre' => 'IESS',                           'email' => 'atencion@iess.gob.ec'],
            ['nombre' => 'Prefectura Provincial',          'email' => 'secretaria@prefectura.gob.ec'],
            ['nombre' => 'Ministerio de Salud Pública',    'email' => 'despacho@salud.gob.ec'],
        ])->map(fn ($d) => Remitente::firstOrCreate(
            ['nombre' => $d['nombre']],
            ['email' => $d['email'], 'estado' => true]
        ))->values()->all();

        // ── Usuarios (uno por área + uno extra en Admin) ────────────
        [$maria, $carlos, $ana, $luis, $patricia, $roberto, $sofia] = collect([
            ['nombre' => 'María',    'apellido' => 'González', 'cedula' => '170123456701', 'email' => 'mgonzalez@empresa.ec', 'area' => $secGen],
            ['nombre' => 'Carlos',   'apellido' => 'Ramírez',  'cedula' => '170234567802', 'email' => 'cramirez@empresa.ec',  'area' => $dirAdmin],
            ['nombre' => 'Ana',      'apellido' => 'Torres',   'cedula' => '170345678903', 'email' => 'atorres@empresa.ec',   'area' => $dirFin],
            ['nombre' => 'Luis',     'apellido' => 'Morales',  'cedula' => '170456789004', 'email' => 'lmorales@empresa.ec',  'area' => $depLegal],
            ['nombre' => 'Patricia', 'apellido' => 'Vega',     'cedula' => '170567890105', 'email' => 'pvega@empresa.ec',     'area' => $rrhh],
            ['nombre' => 'Roberto',  'apellido' => 'Castillo', 'cedula' => '170678901206', 'email' => 'rcastillo@empresa.ec', 'area' => $tech],
            ['nombre' => 'Sofía',    'apellido' => 'Herrera',  'cedula' => '170789012307', 'email' => 'sherrera@empresa.ec',  'area' => $dirAdmin],
        ])->map(fn ($d) => User::firstOrCreate(
            ['cedula' => $d['cedula']],
            [
                'nombre'            => $d['nombre'],
                'apellido'          => $d['apellido'],
                'email'             => $d['email'],
                'password'          => Hash::make('User1234.'),
                'rol'               => 'user',
                'estado'            => 'aprobado',
                'habilitado'        => true,
                'email_verified_at' => now(),
                'area_id'           => $d['area']->id_area,
            ]
        ))->values()->all();

        // ── Expedientes ────────────────────────────────────────────
        $exp1 = Expediente::firstOrCreate(
            ['codigo_expediente' => 'EXP-202601-0001'],
            [
                'asunto_resumen'   => 'Revisión y aprobación del presupuesto anual institucional para el ejercicio fiscal 2026',
                'estado'           => 'abierto',
                'fecha_inicio'     => Carbon::parse('2026-01-15'),
                'prioridad'        => 'alta',
                'area_creadora_id' => $dirFin->id_area,
            ]
        );

        $exp2 = Expediente::firstOrCreate(
            ['codigo_expediente' => 'EXP-202602-0001'],
            [
                'asunto_resumen'   => 'Revisión y renovación de contratos del personal administrativo y operativo',
                'estado'           => 'abierto',
                'fecha_inicio'     => Carbon::parse('2026-02-03'),
                'prioridad'        => 'media',
                'area_creadora_id' => $rrhh->id_area,
            ]
        );

        $exp3 = Expediente::firstOrCreate(
            ['codigo_expediente' => 'EXP-202603-0001'],
            [
                'asunto_resumen'   => 'Actualización e implementación del nuevo sistema de gestión tecnológica institucional',
                'estado'           => 'abierto',
                'fecha_inicio'     => Carbon::parse('2026-03-10'),
                'prioridad'        => 'urgente',
                'area_creadora_id' => $tech->id_area,
            ]
        );

        $exp4 = Expediente::firstOrCreate(
            ['codigo_expediente' => 'EXP-202604-0001'],
            [
                'asunto_resumen'   => 'Proceso disciplinario interno por incumplimiento de normativa institucional',
                'estado'           => 'cerrado',
                'fecha_inicio'     => Carbon::parse('2026-04-01'),
                'prioridad'        => 'alta',
                'area_creadora_id' => $depLegal->id_area,
            ]
        );

        $exp5 = Expediente::firstOrCreate(
            ['codigo_expediente' => 'EXP-202605-0001'],
            [
                'asunto_resumen'   => 'Auditoría administrativa interna del primer semestre 2026',
                'estado'           => 'abierto',
                'fecha_inicio'     => Carbon::parse('2026-05-20'),
                'prioridad'        => 'baja',
                'area_creadora_id' => $dirAdmin->id_area,
            ]
        );

        // ══════════════════════════════════════════════════════════════
        // EXP-1 — Presupuesto Anual (abierto, alta)
        // Flujo: SecGen → DirFin → DepLegal → DirAdmin (pendiente 4 días)
        // ══════════════════════════════════════════════════════════════
        $doc1 = Documento::create([
            'numero_oficio'    => 'OF-2026-001',
            'asunto'           => 'Solicitud de aprobación del presupuesto anual 2026',
            'fecha_oficio'     => Carbon::parse('2026-01-15'),
            'remitente_id'     => $minEdu->id_remitente,
            'tipo'             => 'externo',
            'palabra_clave'    => 'PRESUPUESTO',
            'archivo'          => 'documentos/demo_001.pdf',
            'area_actual_id'   => $dirAdmin->id_area,
            'area_creadora_id' => $secGen->id_area,
            'user_id'          => $maria->id_user,
            'recibido'         => 'en_revision',
            'expediente_id'    => $exp1->id_expediente,
        ]);

        // Cerrado hace 24 días
        Movimiento::create([
            'documento_id'         => $doc1->id_documento,
            'expediente_id'        => $exp1->id_expediente,
            'de_area_id'           => $secGen->id_area,
            'a_area_id'            => $dirFin->id_area,
            'enviado_por'          => $maria->id_user,
            'destinatario_user_id' => $ana->id_user,
            'comentario'           => 'Se remite para análisis y elaboración del informe de presupuesto.',
            'fecha_envio'          => now()->subDays(25),
            'fecha_recepcion'      => now()->subDays(24),
        ]);

        // Cerrado hace 13 días
        Movimiento::create([
            'documento_id'         => $doc1->id_documento,
            'expediente_id'        => $exp1->id_expediente,
            'de_area_id'           => $dirFin->id_area,
            'a_area_id'            => $depLegal->id_area,
            'enviado_por'          => $ana->id_user,
            'destinatario_user_id' => $luis->id_user,
            'comentario'           => 'Análisis financiero listo. Se remite al Departamento Legal para revisión normativa.',
            'fecha_envio'          => now()->subDays(14),
            'fecha_recepcion'      => now()->subDays(13),
        ]);

        // Pendiente 4 días (rango 4-7)
        Movimiento::create([
            'documento_id'  => $doc1->id_documento,
            'expediente_id' => $exp1->id_expediente,
            'de_area_id'    => $depLegal->id_area,
            'a_area_id'     => $dirAdmin->id_area,
            'enviado_por'   => $luis->id_user,
            'comentario'    => 'Revisado por Legal. Se remite a Dirección Administrativa para aprobación final.',
            'fecha_envio'   => now()->subDays(4),
            'fecha_recepcion' => null,
        ]);

        // ══════════════════════════════════════════════════════════════
        // EXP-2 — Contratos Personal (abierto, media)
        // Flujo: RRHH → DepLegal (cerrado) → DirAdmin (pendiente 6 días)
        // ══════════════════════════════════════════════════════════════
        $doc2 = Documento::create([
            'numero_oficio'    => 'OF-2026-002',
            'asunto'           => 'Informe de situación de contratos vigentes y vencimientos programados',
            'fecha_oficio'     => Carbon::parse('2026-02-10'),
            'remitente_id'     => $iess->id_remitente,
            'tipo'             => 'interno',
            'palabra_clave'    => 'CONTRATOS',
            'archivo'          => 'documentos/demo_002.pdf',
            'area_actual_id'   => $dirAdmin->id_area,
            'area_creadora_id' => $rrhh->id_area,
            'user_id'          => $patricia->id_user,
            'recibido'         => 'en_revision',
            'expediente_id'    => $exp2->id_expediente,
        ]);

        // Cerrado hace 9 días
        Movimiento::create([
            'documento_id'         => $doc2->id_documento,
            'expediente_id'        => $exp2->id_expediente,
            'de_area_id'           => $rrhh->id_area,
            'a_area_id'            => $depLegal->id_area,
            'enviado_por'          => $patricia->id_user,
            'comentario'           => 'Se solicita revisión legal de los contratos próximos a vencer.',
            'fecha_envio'          => now()->subDays(10),
            'fecha_recepcion'      => now()->subDays(9),
        ]);

        // Pendiente 6 días (rango 4-7)
        Movimiento::create([
            'documento_id'         => $doc2->id_documento,
            'expediente_id'        => $exp2->id_expediente,
            'de_area_id'           => $depLegal->id_area,
            'a_area_id'            => $dirAdmin->id_area,
            'enviado_por'          => $luis->id_user,
            'destinatario_user_id' => $carlos->id_user,
            'comentario'           => 'Revisión legal completada. Se remite para aprobación y firma de renovaciones.',
            'fecha_envio'          => now()->subDays(6),
            'fecha_recepcion'      => null,
        ]);

        // ══════════════════════════════════════════════════════════════
        // EXP-3 — Sistema Tecnológico (abierto, urgente)
        // Flujo largo: Tech → SecGen (cerrado) → DirFin (cerrado) →
        //              DepLegal (VENCIDO 13 días) + doc extra reciente 2 días
        // ══════════════════════════════════════════════════════════════
        $doc3 = Documento::create([
            'numero_oficio'    => 'OF-2026-003',
            'asunto'           => 'Propuesta técnica para implementación de sistema de gestión documental',
            'fecha_oficio'     => Carbon::parse('2026-03-10'),
            'remitente_id'     => $contraloria->id_remitente,
            'tipo'             => 'externo',
            'palabra_clave'    => 'TECNOLOGÍA',
            'archivo'          => 'documentos/demo_003.pdf',
            'area_actual_id'   => $depLegal->id_area,
            'area_creadora_id' => $tech->id_area,
            'user_id'          => $roberto->id_user,
            'recibido'         => 'subido',
            'expediente_id'    => $exp3->id_expediente,
        ]);

        // Cerrado hace 18 días
        Movimiento::create([
            'documento_id'    => $doc3->id_documento,
            'expediente_id'   => $exp3->id_expediente,
            'de_area_id'      => $tech->id_area,
            'a_area_id'       => $secGen->id_area,
            'enviado_por'     => $roberto->id_user,
            'comentario'      => 'Propuesta técnica lista para revisión de Secretaría General.',
            'fecha_envio'     => now()->subDays(20),
            'fecha_recepcion' => now()->subDays(18),
        ]);

        // Cerrado hace 13 días
        Movimiento::create([
            'documento_id'         => $doc3->id_documento,
            'expediente_id'        => $exp3->id_expediente,
            'de_area_id'           => $secGen->id_area,
            'a_area_id'            => $dirFin->id_area,
            'enviado_por'          => $maria->id_user,
            'destinatario_user_id' => $ana->id_user,
            'comentario'           => 'Aprobado por Secretaría. Se verifica disponibilidad presupuestaria.',
            'fecha_envio'          => now()->subDays(15),
            'fecha_recepcion'      => now()->subDays(13),
        ]);

        // VENCIDO — 13 días sin respuesta
        Movimiento::create([
            'documento_id'    => $doc3->id_documento,
            'expediente_id'   => $exp3->id_expediente,
            'de_area_id'      => $dirFin->id_area,
            'a_area_id'       => $depLegal->id_area,
            'enviado_por'     => $ana->id_user,
            'comentario'      => 'Fondos disponibles confirmados. Se remite a Legal para revisión de términos contractuales.',
            'fecha_envio'     => now()->subDays(13),
            'fecha_recepcion' => null,
        ]);

        // Segundo documento del EXP-3: solicitud de cotizaciones (reciente 2 días)
        $doc3b = Documento::create([
            'numero_oficio'    => 'OF-2026-004',
            'asunto'           => 'Solicitud de cotizaciones para adquisición de equipamiento tecnológico',
            'fecha_oficio'     => Carbon::parse('2026-05-29'),
            'remitente_id'     => $prefectura->id_remitente,
            'tipo'             => 'interno',
            'palabra_clave'    => 'REQUERIMIENTO',
            'archivo'          => 'documentos/demo_004.pdf',
            'area_actual_id'   => $secGen->id_area,
            'area_creadora_id' => $tech->id_area,
            'user_id'          => $roberto->id_user,
            'recibido'         => 'subido',
            'expediente_id'    => $exp3->id_expediente,
        ]);

        // Pendiente 2 días (rango 2-3, reciente)
        Movimiento::create([
            'documento_id'         => $doc3b->id_documento,
            'expediente_id'        => $exp3->id_expediente,
            'de_area_id'           => $tech->id_area,
            'a_area_id'            => $secGen->id_area,
            'enviado_por'          => $roberto->id_user,
            'destinatario_user_id' => $maria->id_user,
            'comentario'           => 'Se solicita autorización para iniciar proceso de adquisición de equipos.',
            'fecha_envio'          => now()->subDays(2),
            'fecha_recepcion'      => null,
        ]);

        // ══════════════════════════════════════════════════════════════
        // EXP-4 — Proceso Disciplinario (CERRADO)
        // Todos los movimientos tienen fecha_recepcion
        // ══════════════════════════════════════════════════════════════
        $doc4 = Documento::create([
            'numero_oficio'    => 'OF-2026-005',
            'asunto'           => 'Apertura de proceso disciplinario por incumplimiento de normativa interna',
            'fecha_oficio'     => Carbon::parse('2026-04-01'),
            'remitente_id'     => $prefectura->id_remitente,
            'tipo'             => 'interno',
            'palabra_clave'    => 'PROCESO LEGAL',
            'archivo'          => 'documentos/demo_005.pdf',
            'area_actual_id'   => $secGen->id_area,
            'area_creadora_id' => $depLegal->id_area,
            'user_id'          => $luis->id_user,
            'recibido'         => 'respondido',
            'expediente_id'    => $exp4->id_expediente,
        ]);

        Movimiento::create([
            'documento_id'         => $doc4->id_documento,
            'expediente_id'        => $exp4->id_expediente,
            'de_area_id'           => $depLegal->id_area,
            'a_area_id'            => $rrhh->id_area,
            'enviado_por'          => $luis->id_user,
            'comentario'           => 'Se notifica apertura de proceso disciplinario para seguimiento de RRHH.',
            'fecha_envio'          => now()->subDays(55),
            'fecha_recepcion'      => now()->subDays(54),
        ]);

        Movimiento::create([
            'documento_id'         => $doc4->id_documento,
            'expediente_id'        => $exp4->id_expediente,
            'de_area_id'           => $rrhh->id_area,
            'a_area_id'            => $secGen->id_area,
            'enviado_por'          => $patricia->id_user,
            'destinatario_user_id' => $maria->id_user,
            'comentario'           => 'Se remite informe de RRHH con antecedentes del caso para resolución final.',
            'fecha_envio'          => now()->subDays(45),
            'fecha_recepcion'      => now()->subDays(44),
        ]);

        Movimiento::create([
            'documento_id'            => $doc4->id_documento,
            'expediente_id'           => $exp4->id_expediente,
            'de_area_id'              => $secGen->id_area,
            'a_area_id'               => $depLegal->id_area,
            'enviado_por'             => $maria->id_user,
            'destinatario_user_id'    => $luis->id_user,
            'comentario'              => 'Resolución emitida. Se archiva expediente.',
            'respuesta_comentario'    => 'Expediente cerrado. Se aplicaron las medidas correctivas correspondientes.',
            'fecha_envio'             => now()->subDays(30),
            'fecha_recepcion'         => now()->subDays(28),
        ]);

        // ══════════════════════════════════════════════════════════════
        // EXP-5 — Auditoría Administrativa (abierto, baja)
        // Flujo: DirAdmin → SecGen (cerrado 8 días) → RRHH (crítico 8 días)
        // ══════════════════════════════════════════════════════════════
        $doc5 = Documento::create([
            'numero_oficio'    => 'OF-2026-006',
            'asunto'           => 'Notificación de inicio de auditoría administrativa primer semestre 2026',
            'fecha_oficio'     => Carbon::parse('2026-05-20'),
            'remitente_id'     => $contraloria->id_remitente,
            'tipo'             => 'externo',
            'palabra_clave'    => 'AUDITORÍA',
            'archivo'          => 'documentos/demo_006.pdf',
            'area_actual_id'   => $rrhh->id_area,
            'area_creadora_id' => $dirAdmin->id_area,
            'user_id'          => $carlos->id_user,
            'recibido'         => 'recibido',
            'expediente_id'    => $exp5->id_expediente,
        ]);

        // Cerrado — recibido a los 1 día
        Movimiento::create([
            'documento_id'    => $doc5->id_documento,
            'expediente_id'   => $exp5->id_expediente,
            'de_area_id'      => $dirAdmin->id_area,
            'a_area_id'       => $secGen->id_area,
            'enviado_por'     => $carlos->id_user,
            'comentario'      => 'Se notifica inicio de auditoría. Coordinación con todas las dependencias.',
            'fecha_envio'     => now()->subDays(9),
            'fecha_recepcion' => now()->subDays(8),
        ]);

        // Crítico — 8 días sin respuesta (rango 8-9)
        Movimiento::create([
            'documento_id'         => $doc5->id_documento,
            'expediente_id'        => $exp5->id_expediente,
            'de_area_id'           => $secGen->id_area,
            'a_area_id'            => $rrhh->id_area,
            'enviado_por'          => $maria->id_user,
            'destinatario_user_id' => $patricia->id_user,
            'comentario'           => 'Se remite a RRHH para preparación de documentación requerida por auditoría.',
            'fecha_envio'          => now()->subDays(8),
            'fecha_recepcion'      => null,
        ]);

        // ══════════════════════════════════════════════════════════════
        // Documentos independientes (sin expediente)
        // ══════════════════════════════════════════════════════════════

        // Reciente 3 días — SecGen → DirAdmin
        $doc6 = Documento::create([
            'numero_oficio'    => 'OF-2026-007',
            'asunto'           => 'Solicitud de información estadística institucional para informe anual',
            'fecha_oficio'     => Carbon::parse('2026-05-29'),
            'remitente_id'     => $minSalud->id_remitente,
            'tipo'             => 'externo',
            'palabra_clave'    => 'SOLICITUD',
            'archivo'          => 'documentos/demo_007.pdf',
            'area_actual_id'   => $dirAdmin->id_area,
            'area_creadora_id' => $secGen->id_area,
            'user_id'          => $maria->id_user,
            'recibido'         => 'subido',
        ]);

        Movimiento::create([
            'documento_id'    => $doc6->id_documento,
            'de_area_id'      => $secGen->id_area,
            'a_area_id'       => $dirAdmin->id_area,
            'enviado_por'     => $maria->id_user,
            'comentario'      => 'Se solicita elaboración de estadísticas institucionales requeridas por el Ministerio.',
            'fecha_envio'     => now()->subDays(3),
            'fecha_recepcion' => null,
        ]);

        // 5 días — DirAdmin → Tech
        $doc7 = Documento::create([
            'numero_oficio'    => 'OF-2026-008',
            'asunto'           => 'Circular: actualización de procedimientos de archivo y gestión documental',
            'fecha_oficio'     => Carbon::parse('2026-05-26'),
            'remitente_id'     => $minEdu->id_remitente,
            'tipo'             => 'interno',
            'palabra_clave'    => 'GESTIÓN',
            'archivo'          => 'documentos/demo_008.pdf',
            'area_actual_id'   => $tech->id_area,
            'area_creadora_id' => $dirAdmin->id_area,
            'user_id'          => $carlos->id_user,
            'recibido'         => 'subido',
        ]);

        Movimiento::create([
            'documento_id'         => $doc7->id_documento,
            'de_area_id'           => $dirAdmin->id_area,
            'a_area_id'            => $tech->id_area,
            'enviado_por'          => $carlos->id_user,
            'destinatario_user_id' => $roberto->id_user,
            'comentario'           => 'Se remite para implementación y capacitación al personal de Tecnología.',
            'fecha_envio'          => now()->subDays(5),
            'fecha_recepcion'      => null,
        ]);

        // 7 días — DirFin → SecGen
        $doc8 = Documento::create([
            'numero_oficio'    => 'OF-2026-009',
            'asunto'           => 'Informe de ejecución presupuestaria del primer trimestre 2026',
            'fecha_oficio'     => Carbon::parse('2026-05-24'),
            'remitente_id'     => $contraloria->id_remitente,
            'tipo'             => 'interno',
            'palabra_clave'    => 'PRESUPUESTO',
            'archivo'          => 'documentos/demo_009.pdf',
            'area_actual_id'   => $secGen->id_area,
            'area_creadora_id' => $dirFin->id_area,
            'user_id'          => $ana->id_user,
            'recibido'         => 'subido',
        ]);

        Movimiento::create([
            'documento_id'         => $doc8->id_documento,
            'de_area_id'           => $dirFin->id_area,
            'a_area_id'            => $secGen->id_area,
            'enviado_por'          => $ana->id_user,
            'destinatario_user_id' => $maria->id_user,
            'comentario'           => 'Se remite informe de ejecución presupuestaria trimestral para conocimiento de Secretaría.',
            'fecha_envio'          => now()->subDays(7),
            'fecha_recepcion'      => null,
        ]);

        // VENCIDO — 14 días sin respuesta (>12 días)
        $doc9 = Documento::create([
            'numero_oficio'    => 'OF-2026-010',
            'asunto'           => 'Requerimiento de informes de gestión administrativa trimestral',
            'fecha_oficio'     => Carbon::parse('2026-05-15'),
            'remitente_id'     => $contraloria->id_remitente,
            'tipo'             => 'externo',
            'palabra_clave'    => 'REQUERIMIENTO',
            'archivo'          => 'documentos/demo_010.pdf',
            'area_actual_id'   => $dirFin->id_area,
            'area_creadora_id' => $secGen->id_area,
            'user_id'          => $sofia->id_user,
            'recibido'         => 'subido',
        ]);

        Movimiento::create([
            'documento_id'         => $doc9->id_documento,
            'de_area_id'           => $secGen->id_area,
            'a_area_id'            => $dirFin->id_area,
            'enviado_por'          => $sofia->id_user,
            'destinatario_user_id' => $ana->id_user,
            'comentario'           => 'Requerimiento urgente de Contraloría. Se necesita informe a la brevedad.',
            'fecha_envio'          => now()->subDays(14),
            'fecha_recepcion'      => null,
        ]);

        // 9 días — RRHH → DirAdmin (crítico, rango 8-9)
        $doc10 = Documento::create([
            'numero_oficio'    => 'OF-2026-011',
            'asunto'           => 'Solicitud de aprobación de plan de capacitación institucional 2026',
            'fecha_oficio'     => Carbon::parse('2026-05-22'),
            'remitente_id'     => $iess->id_remitente,
            'tipo'             => 'interno',
            'palabra_clave'    => 'GESTIÓN',
            'archivo'          => 'documentos/demo_011.pdf',
            'area_actual_id'   => $dirAdmin->id_area,
            'area_creadora_id' => $rrhh->id_area,
            'user_id'          => $patricia->id_user,
            'recibido'         => 'subido',
        ]);

        Movimiento::create([
            'documento_id'    => $doc10->id_documento,
            'de_area_id'      => $rrhh->id_area,
            'a_area_id'       => $dirAdmin->id_area,
            'enviado_por'     => $patricia->id_user,
            'comentario'      => 'Se solicita aprobación del plan de capacitación para el segundo semestre.',
            'fecha_envio'     => now()->subDays(9),
            'fecha_recepcion' => null,
        ]);
    }
}
