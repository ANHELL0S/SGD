import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Check,
    CheckCircle,
    Lock,
    Loader2,
    LockOpen,
    MessageSquare,
    RefreshCw,
    Reply,
    User,
    Mail,
    MailOpen,
    Eye,
    ArrowRight,
    Calendar,
    GitBranch,
    FolderOpen,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import MovimientoController, {
    responder as responderMovimiento,
} from '@/actions/App/Http/Controllers/User/MovimientoController';
import {
    cerrar as cerrarExpediente,
    abrir as abrirExpediente,
} from '@/actions/App/Http/Controllers/User/ExpedienteController';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboard } from '@/routes';


// ============================================================================
// TIPOS
// ============================================================================

type MovimientoOrigen = {
    id_movimiento: number;
    comentario: string | null;
    documento: {
        id_documento: number | null;
        numero_oficio: string | null;
        asunto?: string | null;
    } | null;
};

type ExpedienteInfo = {
    id_expediente: number;
    codigo: string;
    estado: 'abierto' | 'cerrado';
};

type MovimientoItem = {
    id_movimiento: number;
    expediente?: ExpedienteInfo | null;
    documento: {
        id_documento: number | null;
        numero_oficio: string | null;
        asunto?: string | null;
        palabra_clave: string | null;
        tipo: string | null;
        recibido: string | null;
        documento_padre_id: number | null;
        movimiento_origen_id: number | null;
        hilo_id: number | null;
        conversacion_cerrada_at: string | null;
        padre: {
            id_documento: number | null;
            numero_oficio: string | null;
            asunto?: string | null;
        } | null;
        movimiento_origen: MovimientoOrigen | null;
    } | null;
    de_area: { nombre: string | null } | null;
    a_area: { nombre: string | null } | null;
    remitente: {
        nombre: string | null;
        apellido: string | null;
        area: { nombre: string | null } | null;
    } | null;
    destinatario: {
        nombre: string | null;
        apellido: string | null;
    } | null;
    comentario: string | null;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    direccion: 'salida' | 'entrada';
    estado: 'pendiente' | 'recibido';
    respuesta_enviada: boolean;
    puede_marcar_recibido: boolean;
    puede_responder: boolean;
    dias_transcurridos: number;
    bloqueado: boolean;
};

type ExpedienteGroup = {
    expediente_id: number;
    codigo_expediente: string;
    asunto_resumen: string;
    estado: 'abierto' | 'cerrado';
    prioridad: string;
    area_creadora_id: number | null;
    tiene_respuesta: boolean;
    total_movimientos: number;
    salidas: number;
    entradas: number;
    pendientes: number;
    recibidos: number;
    ultima_fecha_envio: string | null;
    movimientos: MovimientoItem[];
    has_more?: boolean;
    total_movimientos_count: number;
};

type Resumen = {
    total_movimientos: number;
    expedientes_activos: number;
    expedientes_cerrados: number;
    expedientes_vencidos: number;
};

type PaginationLinkItem = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedExpedientes = {
    data: ExpedienteGroup[];
    links: PaginationLinkItem[];
    current_page: number;
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
};

type Props = {
    expedientesActivos: PaginatedExpedientes;
    expedientesCerrados: PaginatedExpedientes | null;
    expedientesVencidos: PaginatedExpedientes | null;
    resumen: Resumen;
    filters?: {
        busqueda_activos?: string;
        busqueda_cerrados?: string;
        busqueda_vencidos?: string;
        per_page?: string;
        tab?: string;
    };
};

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

const priorityConfig = {
    alta: { bar: 'bg-[var(--destructive)]', label: 'Alta' },
    media: { bar: 'bg-[var(--warning)]', label: 'Media' },
    baja: { bar: 'bg-[var(--primary)]', label: 'Baja' },
} as const;

const directionConfig = {
    entrada: {
        dotColor: 'bg-blue-400',
        icon: Mail,
        label: 'Entrada',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
    },
    salida: {
        dotColor: 'bg-[var(--secundary-foreground)]/50',
        icon: MailOpen,
        label: 'Salida',
        badgeClass: 'border-[var(--secundary-foreground)]/20 bg-[var(--secundary-foreground)]/10 text-[var(--secundary-foreground)]/70',
    },
} as const;

// ============================================================================
// FUNCIONES UTILITARIAS
// ============================================================================

const cn = (...classes: (string | boolean | undefined | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};

const formatDate = (value: string | null): string => {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Guayaquil',
    });
};

const formatTime = (value: string | null): string => {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Guayaquil',
    });
};

const getFullName = (
    nombre: string | null,
    apellido: string | null,
): string => {
    return [nombre, apellido].filter(Boolean).join(' ') || '-';
};

const getOficioIdentifier = (
    documento: MovimientoItem['documento'],
): string => {
    if (!documento) {
        return '-';
    }

    return documento.numero_oficio ?? `#${documento.id_documento ?? '-'}`;
};

const getOficioTitle = (movimiento: MovimientoItem): string => {
    const documento = movimiento.documento;

    if (!documento) {
        return `Movimiento #${movimiento.id_movimiento}`;
    }

    if (documento.asunto && documento.asunto.trim() !== '') {
        return documento.asunto;
    }

    if (documento.movimiento_origen_id && documento.movimiento_origen) {
        const docOrigen = documento.movimiento_origen.documento;
        if (docOrigen?.asunto && docOrigen.asunto.trim() !== '') {
            return `Respuesta a: ${docOrigen.asunto}`;
        }
        if (docOrigen?.numero_oficio) {
            return `Respuesta a oficio ${docOrigen.numero_oficio}`;
        }
        return `Respuesta a Mov. #${documento.movimiento_origen_id}`;
    }

    const padreAsunto = documento.padre?.asunto;
    const padreNumero = documento.padre?.numero_oficio;
    const padreId = documento.padre?.id_documento;

    if (
        documento.documento_padre_id &&
        (padreAsunto || padreNumero || padreId)
    ) {
        if (padreAsunto && padreAsunto.trim() !== '') {
            return `Respuesta de: ${padreAsunto}`;
        }
        return `Respuesta de oficio ${padreNumero ?? `#${padreId}`}`;
    }

    return `Oficio ${getOficioIdentifier(documento)}`;
};

const isExpedienteCerrado = (movimiento: MovimientoItem): boolean => {
    return movimiento.expediente?.estado === 'cerrado';
};

const isNotificacionActiva = (movimiento: MovimientoItem): boolean => {
    if (isExpedienteCerrado(movimiento)) {
        return false;
    }

    return movimiento.puede_responder;
};

// ============================================================================
// HOOKS PERSONALIZADOS
// ============================================================================

const useMovimientosRealTime = (
    areaId: number | null | undefined,
    role: string | undefined,
) => {
    useEffect(() => {
        if (role !== 'user' || !areaId) {
            return;
        }

        const globalWithEcho = globalThis as typeof globalThis & {
            Echo?: {
                private: (channel: string) => {
                    listen: (event: string, callback: () => void) => unknown;
                    stopListening?: (event: string) => unknown;
                };
                leaveChannel?: (channel: string) => unknown;
            };
        };

        const echo = globalWithEcho.Echo;

        if (!echo) {
            return;
        }

        const eventName = '.documento.movimiento.actualizado';
        const channel = echo.private(`areas.${areaId}.movimientos`);

        channel.listen(eventName, () => {
            router.reload({ only: ['expedientesActivos', 'resumen'] });
        });

        return () => {
            channel.stopListening?.(eventName);
            echo.leaveChannel?.(`private-areas.${areaId}.movimientos`);
        };
    }, [areaId, role]);
};

// ============================================================================
// FUNCIÓN DE TIEMPO RELATIVO COMPLETA
// ============================================================================

const getRelativeTime = (fecha: string | null): string => {
    if (!fecha) return '';

    const now = new Date();
    const then = new Date(fecha);
    let diff = Math.max(0, now.getTime() - then.getTime());

    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(diff / 60000) % 60;
    const horas = Math.floor(diff / 3600000) % 24;
    const dias = Math.floor(diff / 86400000);
    const semanas = Math.floor(dias / 7);
    const meses = Math.floor(dias / 30);
    const años = Math.floor(dias / 365);

    if (segundos < 60) return 'hace unos segundos';
    if (años > 0) return `hace ${años} año${años > 1 ? 's' : ''}`;
    if (meses > 0) return `hace ${meses} mes${meses > 1 ? 'es' : ''}`;
    if (semanas > 0) return `hace ${semanas} semana${semanas > 1 ? 's' : ''}`;
    if (dias > 0) {
        if (horas > 0 && minutos > 0) {
            return `hace ${dias} día${dias > 1 ? 's' : ''}, ${horas} hora${horas > 1 ? 's' : ''}, ${minutos} min`;
        }
        if (horas > 0) {
            return `hace ${dias} día${dias > 1 ? 's' : ''}, ${horas} hora${horas > 1 ? 's' : ''}`;
        }
        return `hace ${dias} día${dias > 1 ? 's' : ''}`;
    }
    if (horas > 0) {
        if (minutos > 0) {
            return `hace ${horas} hora${horas > 1 ? 's' : ''}, ${minutos} min`;
        }
        return `hace ${horas} hora${horas > 1 ? 's' : ''}`;
    }
    if (minutos > 0) return `hace ${minutos} min`;
    return 'hace un momento';
};

// ============================================================================
// COMPONENTES INTERNOS
// ============================================================================

interface ResumenCardsProps {
    resumen: Resumen;
}

const ResumenCards = ({ resumen }: ResumenCardsProps) => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5"></div>
);

interface MovimientoActionsProps {
    movimiento: MovimientoItem;
    processing: boolean;
    compact?: boolean;
    expedienteEstado: 'abierto' | 'cerrado';
}

const MovimientoActions = ({
    movimiento,
    processing,
    compact = false,
    expedienteEstado,
}: MovimientoActionsProps) => {
    const buttonSize = compact ? 'h-6 px-2 text-[11px]' : 'h-8 text-xs';
    const cerrado = expedienteEstado === 'cerrado';

    return (
        <div className="ml-auto flex items-center gap-2">
            {movimiento.documento?.id_documento && (
                <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className={buttonSize}
                >
                    <Link
                        href={MovimientoController.show.url(
                            movimiento.id_movimiento,
                        )}
                    >
                        <Eye className="mr-1 h-3 w-3" />
                        {compact ? 'Ver' : 'Ver documento'}
                    </Link>
                </Button>
            )}

            {!cerrado && movimiento.bloqueado && (
                <Badge
                    variant="outline"
                    className="border-[var(--border)] bg-[var(--secundary-foreground)] px-1.5 text-[10px] text-[var(--secundary-foreground)]/70"
                >
                    Plazo vencido
                </Badge>
            )}

            {!cerrado && movimiento.puede_responder && (
                <Button
                    asChild
                    size="sm"
                    className={`${buttonSize} bg-blue-600 text-white hover:bg-blue-700`}
                >
                    <Link
                        href={responderMovimiento.url(movimiento.id_movimiento)}
                    >
                        <Reply className="mr-1 h-3 w-3" />
                        Responder
                    </Link>
                </Button>
            )}
        </div>
    );
};

interface MovimientoCardProps {
    movimiento: MovimientoItem;
    processing: boolean;
    compact?: boolean;
    showNotificationDot?: boolean;
    expedienteEstado: 'abierto' | 'cerrado';
    className?: string;
}

const MovimientoCard = ({
    movimiento,
    processing,
    compact = false,
    showNotificationDot = false,
    expedienteEstado,
    className,
}: MovimientoCardProps) => {
    const dias = movimiento.dias_transcurridos;
    const bloqueado = movimiento.bloqueado;
    const expedienteCerrado = expedienteEstado === 'cerrado';
    const isActive =
        !expedienteCerrado &&
        !bloqueado &&
        (isNotificacionActiva(movimiento) || showNotificationDot);
    const DirectionIcon = directionConfig[movimiento.direccion].icon;

    // Color de la línea lateral basado en días hábiles transcurridos
    const getLineColor = () => {
        if (expedienteCerrado) return 'bg-[var(--chart-4)]'; // Color para expediente cerrado
        if (bloqueado) return 'bg-gray-400';   // >10 días
        if (dias >= 7) return 'bg-[var(--destructive)]';    // Alta: 7-10 días
        if (dias >= 4) return 'bg-[var(--warning)]'; // Media: 4-6 días
        if (dias >= 0) return 'bg-[var(--primary)]';   // Baja: 1-3 días
        return '';                              // <1 día: sin color
    };

    const lineColor = getLineColor();

    const urgencyLabel = (() => {
        if (expedienteCerrado) return 'Cerrado';
        if (bloqueado) return 'Bloqueado';
        if (dias >= 7) return 'Alta';
        if (dias >= 4) return 'Media';
        if (dias >= 1) return 'Baja';
        return '';
    })();

    // Tooltip para la línea lateral
    const tooltipText = (() => {
        if (expedienteCerrado) return 'Expediente cerrado';
        if (bloqueado) return `Plazo vencido — ${dias} días hábiles sin respuesta`;
        if (dias < 1) return getRelativeTime(movimiento.fecha_envio);
        return `${dias} día(s) hábil(es) sin respuesta · Prioridad ${urgencyLabel}`;
    })();

    // Tiempo transcurrido para el badge
    const tiempoTranscurrido = getRelativeTime(movimiento.fecha_envio);

    return (
        <Card
            className={cn(
                'relative overflow-hidden rounded-md border bg-card shadow-none transition-all duration-200 hover:shadow-sm',
                isActive && 'border-[var(--border)]/50',
                expedienteCerrado && 'bg-gray-50/50 dark:bg-muted/10',
                bloqueado && 'bg-gray-50/30 dark:bg-muted/5 opacity-80',
                className,
            )}
        >
            {/* Línea lateral izquierda - indica prioridad */}
            {lineColor && (
                <div
                    className={cn(
                        'absolute top-0 bottom-0 left-0 w-1',
                        lineColor,
                    )}
                    title={tooltipText}
                />
            )}

            <CardContent className="p-0">
                <div
                    className={cn(
                        'space-y-1',
                        lineColor ? 'pr-3 pl-4' : 'px-3',
                    )}
                >
                    {/* Fila 1: icono dirección + título + badges */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                            <div
                                className={cn(
                                    'mt-0.5 shrink-0 rounded p-1',
                                    movimiento.direccion === 'entrada'
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                                        : 'bg-[var(--secundary-foreground)]/10 text-[var(--secundary-foreground)]/50',
                                )}
                            >
                                <DirectionIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm leading-tight font-semibold">
                                    {getOficioTitle(movimiento)}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {getOficioIdentifier(movimiento.documento)}
                                    {movimiento.documento?.palabra_clave && (
                                        <span className="text-muted-foreground/50">
                                            {' '}
                                            ·{' '}
                                            {movimiento.documento.palabra_clave}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            {/* Badge de tiempo transcurrido */}
                            {!expedienteCerrado && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'px-1.5 py-0 text-[10px]',
                                        bloqueado
                                            ? 'border-[var(--border)] bg-[var(--secundary-foreground)]/10 text-[var(--secundary-foreground)]/70'
                                            : 'border-[var(--border)] bg-[var(--secundary-foreground)]/10 text-[var(--secundary-foreground)]/70',
                                    )}
                                >
                                    {bloqueado
                                        ? `Vencido (${tiempoTranscurrido})`
                                        : tiempoTranscurrido}
                                </Badge>
                            )}
                            {/* Badge de estado */}
                            {movimiento.direccion === 'salida' ? (
                                <Badge
                                    variant="outline"
                                    className={
                                        movimiento.estado === 'recibido'
                                            ? 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400'
                                            : 'border-[var(--secundary-foreground)]/20 bg-[var(--secundary-foreground)]/10 text-[var(--secundary-foreground)]/70'
                                    }
                                >
                                    {movimiento.estado === 'recibido' ? 'Recibido' : 'Enviado'}
                                </Badge>
                            ) : (
                                movimiento.puede_responder ? (
                                    <Badge
                                        variant="outline"
                                        className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                    >
                                        Pendiente
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800"
                                    >
                                        Recibido
                                    </Badge>
                                )


                            )}
                        </div>
                    </div>

                    {/* Fila 2: ruta (área + usuario) + fecha */}
                    <div className="flex flex-col gap-1 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-muted-foreground">
                                {movimiento.de_area?.nombre ?? '-'}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium text-foreground">
                                {movimiento.a_area?.nombre ?? '-'}
                            </span>
                            <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {formatDate(movimiento.fecha_envio)}
                                <span className="text-muted-foreground/60">
                                    {formatTime(movimiento.fecha_envio)}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/80">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                                {getFullName(movimiento.remitente?.nombre ?? null, movimiento.remitente?.apellido ?? null)}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                                {movimiento.destinatario?.nombre
                                    ? getFullName(movimiento.destinatario.nombre, movimiento.destinatario.apellido)
                                    : <span className="italic text-muted-foreground/60">{movimiento.a_area?.nombre ?? 'Área destino'}</span>
                                }
                            </span>
                        </div>
                    </div>

                    {/* Fila 3: recepción + comentario */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {movimiento.fecha_recepcion && (
                            <span className="flex shrink-0 items-center gap-1 text-chart-4">
                                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                Recibido{' '}
                                {formatTime(movimiento.fecha_recepcion)}
                            </span>
                        )}
                        {movimiento.comentario?.trim() && (
                            <span className="flex min-w-0 items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                <span className="line-clamp-1 truncate">
                                    {movimiento.comentario.trim()}
                                </span>
                            </span>
                        )}
                    </div>

                    {/* Origen (si es respuesta a otro movimiento) */}
                    {movimiento.documento?.movimiento_origen && (
                        <div className="rounded border-l-2 border-blue-300 bg-blue-50/50 px-2 py-1 text-xs dark:border-blue-700 dark:bg-blue-950/30">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                    En respuesta a:{' '}
                                    {movimiento.documento.movimiento_origen
                                        .documento?.asunto &&
                                    movimiento.documento.movimiento_origen.documento.asunto.trim() !==
                                        ''
                                        ? movimiento.documento.movimiento_origen
                                              .documento.asunto
                                        : movimiento.documento.movimiento_origen
                                                .documento?.numero_oficio
                                          ? `Oficio ${movimiento.documento.movimiento_origen.documento.numero_oficio}`
                                          : `Movimiento #${movimiento.documento.movimiento_origen.id_movimiento}`}
                                    {movimiento.documento.movimiento_origen
                                        .comentario && (
                                        <span className="text-muted-foreground/70 italic">
                                            {' '}
                                            — "
                                            {
                                                movimiento.documento
                                                    .movimiento_origen
                                                    .comentario
                                            }
                                            "
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Footer: badges de estado + acciones */}
                    <div className="flex flex-wrap items-center gap-2 border-t pt-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {movimiento.documento?.movimiento_origen_id && (
                                <Badge
                                    variant="outline"
                                    className="border-purple-200 bg-purple-50 px-1.5 text-[10px] text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-400"
                                >
                                    <Reply className="mr-1 h-3 w-3" />
                                    Respuesta
                                </Badge>
                            )}
                            {movimiento.respuesta_enviada && (
                                <Badge
                                    variant="outline"
                                    className="rounded-full border-chart-4/10 bg-background/10 px-2.5 py-0.5 text-xs font-bold text-chart-4  backdrop-blur-sm"
                                >
                                    <Check className="mr-1 h-3 w-3" />
                                    Respondido
                                </Badge>
                            )}
                        </div>
                        <div className="ml-auto">
                            <MovimientoActions
                                movimiento={movimiento}
                                processing={processing}
                                compact={compact}
                                expedienteEstado={expedienteEstado}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Index({ expedientesActivos, expedientesCerrados, expedientesVencidos, resumen, filters }: Props) {
    const { auth } = usePage().props as {
        auth?: { user?: { rol?: string; area_id?: number | null } | null };
    };

    useMovimientosRealTime(auth?.user?.area_id, auth?.user?.rol);

    // ── Estado por tab ────────────────────────────────────────────────────────
    const [activosState, setActivosState]     = useState<ExpedienteGroup[]>(expedientesActivos.data);
    const [cerradosState, setCerradosState]   = useState<ExpedienteGroup[]>(expedientesCerrados?.data ?? []);
    const [vencidosState, setVencidosState]   = useState<ExpedienteGroup[]>(expedientesVencidos?.data ?? []);
    const [cerradosLoaded, setCerradosLoaded] = useState(!!expedientesCerrados);
    const [cerradosLoading, setCerradosLoading] = useState(false);
    const [vencidosLoaded, setVencidosLoaded] = useState(!!expedientesVencidos);
    const [vencidosLoading, setVencidosLoading] = useState(false);
    const [loadingExpediente, setLoadingExpediente] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState(filters?.tab === 'cerrados' ? 'cerrados' : filters?.tab === 'vencidos' ? 'vencidos' : 'activos');
    const [perPage, setPerPage] = useState(filters?.per_page ?? String(expedientesActivos.per_page ?? 5));
    const [busquedaActivos,  setBusquedaActivos]  = useState(filters?.busqueda_activos  ?? '');
    const [busquedaCerrados, setBusquedaCerrados] = useState(filters?.busqueda_cerrados ?? '');
    const [busquedaVencidos, setBusquedaVencidos] = useState(filters?.busqueda_vencidos ?? '');
    const busqueda = activeTab === 'cerrados' ? busquedaCerrados : activeTab === 'vencidos' ? busquedaVencidos : busquedaActivos;
    const [refreshing, setRefreshing] = useState(false);
    const openValuesRef = useRef<Record<string, string[]>>({});
    const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sincronizar estados locales cuando cambian las props (paginación, recarga)
    useEffect(() => { setActivosState(expedientesActivos.data); }, [expedientesActivos.data]);
    useEffect(() => {
        if (expedientesCerrados) setCerradosState(expedientesCerrados.data);
        setCerradosLoading(false);
    }, [expedientesCerrados]);
    useEffect(() => {
        if (expedientesVencidos) setVencidosState(expedientesVencidos.data);
        setVencidosLoading(false);
    }, [expedientesVencidos]);

    // ── Paginación por tab ────────────────────────────────────────────────────
    const getPag = (pag: PaginatedExpedientes | null) => {
        const links = pag?.links ?? [];
        return { prev: links[0] ?? null, next: links[links.length - 1] ?? null, pages: links.slice(1, -1) };
    };
    const activosPag  = getPag(expedientesActivos);
    const cerradosPag = getPag(expedientesCerrados);
    const vencidosPag = getPag(expedientesVencidos);

    const currentPag   = activeTab === 'cerrados' ? cerradosPag  : activeTab === 'vencidos' ? vencidosPag  : activosPag;
    const currentPagData = activeTab === 'cerrados' ? expedientesCerrados : activeTab === 'vencidos' ? expedientesVencidos : expedientesActivos;

    const goToPaginationUrl = (url: string | null): void => {
        if (!url) return;
        router.visit(url, { preserveScroll: true, preserveState: true, replace: true });
    };

    const changePerPage = (value: string): void => {
        setPerPage(value);
        router.get(
            MovimientoController.index.url(),
            {
                per_page: value,
                activos_page: 1,
                ...(busquedaActivos  ? { busqueda_activos:  busquedaActivos  } : {}),
                ...(busquedaCerrados ? { busqueda_cerrados: busquedaCerrados } : {}),
                ...(busquedaVencidos ? { busqueda_vencidos: busquedaVencidos } : {}),
            },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const handleBusqueda = (value: string): void => {
        if (activeTab === 'activos')  setBusquedaActivos(value);
        else if (activeTab === 'cerrados') setBusquedaCerrados(value);
        else setBusquedaVencidos(value);

        if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
        busquedaTimer.current = setTimeout(() => {
            const ba = activeTab === 'activos'  ? value : busquedaActivos;
            const bc = activeTab === 'cerrados' ? value : busquedaCerrados;
            const bv = activeTab === 'vencidos' ? value : busquedaVencidos;
            router.get(
                MovimientoController.index.url(),
                {
                    per_page: perPage,
                    tab: activeTab,
                    ...(activeTab === 'activos'  ? { activos_page:  1 } : {}),
                    ...(activeTab === 'cerrados' ? { cerrados_page: 1 } : {}),
                    ...(activeTab === 'vencidos' ? { vencidos_page: 1 } : {}),
                    ...(ba ? { busqueda_activos:  ba } : {}),
                    ...(bc ? { busqueda_cerrados: bc } : {}),
                    ...(bv ? { busqueda_vencidos: bv } : {}),
                },
                { preserveScroll: true, preserveState: true, replace: true },
            );
        }, 1500);
    };

    const handleTabChange = (tab: string): void => {
        setActiveTab(tab);
        if (tab === 'cerrados' && !cerradosLoaded) {
            setCerradosLoaded(true);
            setCerradosLoading(true);
            router.reload({ only: ['expedientesCerrados'] });
        }
        if (tab === 'vencidos' && !vencidosLoaded) {
            setVencidosLoaded(true);
            setVencidosLoading(true);
            router.reload({ only: ['expedientesVencidos'] });
        }
    };

    const refreshMovimientos = (): void => {
        setRefreshing(true);
        const only: string[] = ['expedientesActivos', 'resumen'];
        if (cerradosLoaded) only.push('expedientesCerrados');
        if (vencidosLoaded) only.push('expedientesVencidos');
        router.reload({ only });
        setTimeout(() => setRefreshing(false), 1500);
    };

    // ── Ver más movimientos de un grupo ──────────────────────────────────────
    const handleVerMas = async (
        expedienteId: number,
        offset: number,
        setState: React.Dispatch<React.SetStateAction<ExpedienteGroup[]>>,
    ): Promise<void> => {
        setLoadingExpediente(expedienteId);
        try {
            const params = new URLSearchParams({ grupo: `exp:${expedienteId}`, offset: String(offset), limit: '2' });
            const res = await fetch(`/user/movimientos-cargar-mas?${params.toString()}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setState((prev) =>
                prev.map((e) =>
                    e.expediente_id !== expedienteId
                        ? e
                        : { ...e, movimientos: [...e.movimientos, ...data.movimientos], has_more: data.has_more },
                ),
            );
        } catch {
            toast.error('No se pudo cargar más movimientos');
        } finally {
            setLoadingExpediente(null);
        }
    };

    const handleOcultar = (
        expedienteId: number,
        setState: React.Dispatch<React.SetStateAction<ExpedienteGroup[]>>,
    ) => {
        setState((prev) =>
            prev.map((exp) =>
                exp.expediente_id === expedienteId
                    ? { ...exp, movimientos: exp.movimientos.slice(0, 2), has_more: true }
                    : exp,
            ),
        );
    };

    const handleAccordionChange = (tabKey: string, newValues: string[]) => {
        const prev = openValuesRef.current[tabKey] ?? [];
        const added = newValues.find((v) => !prev.includes(v));
        openValuesRef.current[tabKey] = newValues;
        if (added) {
            setTimeout(() => {
                const item = document.getElementById(`exp-${added}`);
                const content = item?.querySelector('[data-slot="accordion-content"]') ?? item;
                content?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 320);
        }
    };

    // ── Render de la lista de expedientes ────────────────────────────────────
    const renderExpedientes = (
        grupos: ExpedienteGroup[],
        setState: React.Dispatch<React.SetStateAction<ExpedienteGroup[]>>,
        emptyTitle: string,
        emptySubtitle: string,
        tabKey: string,
    ) => {
        if (grupos.length === 0) {
            return (
                <div className="rounded-lg border border-dashed bg-muted/20 p-12 text-center">
                    <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-3 text-sm font-medium text-muted-foreground">{emptyTitle}</p>
                    <p className="text-xs text-muted-foreground/60">{emptySubtitle}</p>
                </div>
            );
        }

        return (
            <Accordion type="multiple" defaultValue={[]} className="space-y-2 " onValueChange={(v) => handleAccordionChange(tabKey, v)}>
                {grupos.map((expediente, index) => (
                    <AccordionItem
                        id={`exp-${expediente.expediente_id}`}
                        key={expediente.expediente_id}
                        value={String(expediente.expediente_id)}
                        className="animate-slide-in-up rounded-lg border bg-card px-4"
                        style={{ animationDelay: `${index * 70}ms` }}
                    >
                        <AccordionTrigger className="py-3 hover:no-underline">
                            <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                                <div className="relative shrink-0">
                                    <FolderOpen className="h-4 w-4 text-blue-600" />
                                    {(() => {
                                        const notifCount = expediente.estado === 'abierto'
                                            ? expediente.movimientos.filter(isNotificacionActiva).length
                                            : 0;
                                        return notifCount > 0 ? (
                                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white leading-none">
                                                {notifCount}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                                <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                                    {expediente.asunto_resumen}
                                </span>
                                <div className="ml-auto flex shrink-0 items-center gap-4 text-xs">
                                    <Badge
                                        variant="outline"
                                        className={
                                            expediente.estado === 'abierto'
                                                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                                : 'bg-[var(--secundary-foreground)] text-[var(--secundary-foreground)]/70'
                                        }
                                    >
                                        {expediente.estado === 'abierto' ? 'Activo' : 'Cerrado'}
                                    </Badge>
                                    {expediente.estado === 'abierto' && expediente.tiene_respuesta && auth?.user?.area_id === expediente.area_creadora_id && (
                                        <Button
                                            type="button" size="sm" variant="outline"
                                            className="h-6 border-red-200 bg-red-50 px-2 text-[11px] text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
                                            onClick={(e) => { e.stopPropagation(); router.patch(cerrarExpediente.url(expediente.expediente_id)); }}
                                        >
                                            <Lock className="mr-1 h-3 w-3" />
                                            Cerrar Conversación
                                        </Button>
                                    )}
                                    {expediente.estado === 'cerrado' && auth?.user?.area_id === expediente.area_creadora_id && (
                                        <Button
                                            type="button" size="sm" variant="outline"
                                            className="h-6 border-green-200 bg-green-50 px-2 text-[11px] text-green-700 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-950/60"
                                            onClick={(e) => { e.stopPropagation(); router.patch(abrirExpediente.url(expediente.expediente_id)); }}
                                        >
                                            <LockOpen className="mr-1 h-3 w-3" />
                                            Abrir Conversación
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>

                        <AccordionContent>
                            <div className="space-y-3 pb-2">
                                {expediente.movimientos.map((movimiento) => (
                                    <MovimientoCard
                                        key={movimiento.id_movimiento}
                                        movimiento={movimiento}
                                        processing={false}
                                        expedienteEstado={expediente.estado}
                                        showNotificationDot={movimiento.puede_responder && expediente.estado === 'abierto'}
                                    />
                                ))}

                                {(expediente.has_more || expediente.movimientos.length > 2) && (
                                    <div className="flex gap-2 pt-2">
                                        {expediente.has_more && (
                                            <Button
                                                type="button" size="sm" variant="outline"
                                                disabled={loadingExpediente === expediente.expediente_id}
                                                onClick={() => handleVerMas(expediente.expediente_id, expediente.movimientos.length, setState)}
                                            >
                                                {loadingExpediente === expediente.expediente_id ? <Spinner className="mr-2" /> : null}
                                                Ver más movimientos
                                            </Button>
                                        )}
                                        {expediente.movimientos.length > 2 && (
                                            <Button
                                                type="button" size="sm" variant="ghost"
                                                onClick={() => handleOcultar(expediente.expediente_id, setState)}
                                            >
                                                Ocultar
                                            </Button>
                                        )}
                                    </div>
                                )}

                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    };

    const LoadingTab = () => (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando...</span>
        </div>
    );

    return (
        <>
            <Head title="Mis movimientos" />

            <div className="mx-auto w-full space-y-6 p-8">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl leading-tight font-semibold">Mis movimientos por expediente</h2>
                        <p className="text-xs text-muted-foreground">
                            Aquí podrás revisar el estado de tus movimientos, responder a los pendientes y gestionar tus expedientes activos.
                        </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={refreshMovimientos}>
                        <RefreshCw className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            refreshing ? 'duration-[1500ms] rotate-[360deg]' : 'duration-0',
                        )} />
                        Actualizar
                    </Button>
                </div>

                {/* Leyenda */}
                <div className="space-y-1.5 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-medium text-foreground">Línea lateral (días hábiles):</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-blue-400" />Baja: 1-3 días</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-orange-400" />Media: 4-6 días</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-red-500" />Alta: 7-10 días</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-gray-400" />&gt; 10 días (bloqueado)</span>
                        <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-green-500" />Expediente cerrado</span>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="space-y-4">
                        {/* Fila 1: tabs + buscador */}
                        <div className="flex items-center">
                            <TabsList>
                                <TabsTrigger value="activos" className="gap-2 text-xs">
                                    Activos
                                    {resumen.expedientes_activos > 0 && (
                                        <span className="rounded-full border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm">
                                            {resumen.expedientes_activos}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="cerrados" className="gap-2 text-xs">
                                    Cerrados
                                    {resumen.expedientes_cerrados > 0 && (
                                        <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                            {resumen.expedientes_cerrados}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="vencidos" className="gap-2 text-xs">
                                    Vencidos
                                    {resumen.expedientes_vencidos > 0 && (
                                        <span className="rounded-full border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                                            {resumen.expedientes_vencidos}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <div className="mx-4 h-6 border-l border-border/50" />

                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-muted-foreground">Total:</Label>
                                <span className="text-xs text-muted-foreground">
                                    {resumen.expedientes_activos + resumen.expedientes_cerrados + resumen.expedientes_vencidos}
                                </span>
                            </div>

                            {/* Buscador */}
                            <div className="group relative ml-auto flex items-center">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary transition-colors group-focus-within:text-blue-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por asunto..."
                                    value={busqueda}
                                    onChange={(e) => handleBusqueda(e.target.value)}
                                    className="h-9 w-[300px] rounded-lg border border-border/50 bg-background pl-10 pr-8 text-[12px] shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-0"
                                />
                                {busqueda && (
                                    <button
                                        type="button"
                                        onClick={() => handleBusqueda('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <Separator className="mx-auto !w-[90%] bg-border/40" />

                        {/* Fila 2: select + paginación del tab activo */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-muted-foreground">Mostrar</Label>
                                <Select value={perPage} onValueChange={changePerPage}>
                                    <SelectTrigger className="!h-8 w-[65px] text-[12px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="7">7</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Label className="text-xs font-medium text-muted-foreground">Por página</Label>
                            </div>

                            <Pagination className="mx-0 w-auto justify-end">
                                <PaginationContent>
                                    <p className="ml-2 text-xs text-muted-foreground">
                                        {(currentPagData?.total ?? 0) > 0
                                            ? `${currentPagData?.from ?? 0}–${currentPagData?.to ?? 0} de ${currentPagData?.total ?? 0}`
                                            : '0 resultados'}
                                    </p>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={currentPag.prev?.url ?? '#'}
                                            onClick={(e) => { e.preventDefault(); goToPaginationUrl(currentPag.prev?.url ?? null); }}
                                            className={!currentPag.prev?.url ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    {currentPag.pages.map((link: PaginationLinkItem) => (
                                        <PaginationItem key={`${link.label}-${link.url ?? 'null'}`}>
                                            <PaginationLink
                                                href={link.url ?? '#'}
                                                isActive={link.active}
                                                onClick={(e) => { e.preventDefault(); goToPaginationUrl(link.url); }}
                                                className={!link.url ? 'pointer-events-none opacity-50' : ''}
                                            >
                                                {link.label.replace('&laquo;', '').replace('&raquo;', '').replace('pagination.previous', '').replace('pagination.next', '')}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            href={currentPag.next?.url ?? '#'}
                                            onClick={(e) => { e.preventDefault(); goToPaginationUrl(currentPag.next?.url ?? null); }}
                                            className={!currentPag.next?.url ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>

                    <TabsContent value="activos" className="mt-4 ">
                        {renderExpedientes(activosState, setActivosState, 'No tienes expedientes activos', 'Los expedientes activos aparecerán aquí.', 'activos')}
                    </TabsContent>
                    <TabsContent value="cerrados" className="mt-4">
                        {cerradosLoading ? <LoadingTab /> : renderExpedientes(cerradosState, setCerradosState, 'No tienes expedientes cerrados', 'Los expedientes cerrados aparecerán aquí.', 'cerrados')}
                    </TabsContent>
                    <TabsContent value="vencidos" className="mt-4">
                        {vencidosLoading ? <LoadingTab /> : renderExpedientes(vencidosState, setVencidosState, 'No tienes expedientes vencidos', 'Los expedientes vencidos aparecerán aquí.', 'vencidos')}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Mis movimientos', href: MovimientoController.index.url() },
    ],
};
