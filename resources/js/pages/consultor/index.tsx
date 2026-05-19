import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Bell,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    Eye,
    FolderOpen,
    GitBranch,
    MessageSquare,
    RefreshCw,
    Reply,
    User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import ConsultorController from '@/actions/App/Http/Controllers/Consultor/ConsultorController';
import { show as documentoShow } from '@/actions/App/Http/Controllers/User/DocumentoController';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboard } from '@/routes';

// ============================================================================
// TIPOS
// ============================================================================

type MovimientoOrigen = {
    id_movimiento: number;
    comentario: string | null;
    documento: { id_documento: number | null; numero_oficio: string | null; asunto?: string | null } | null;
};

type MovimientoItem = {
    id_movimiento: number;
    documento: {
        id_documento: number | null;
        numero_oficio: string | null;
        asunto?: string | null;
        palabra_clave: string | null;
        tipo: string | null;
        recibido: string | null;
        movimiento_origen_id: number | null;
        movimiento_origen: MovimientoOrigen | null;
    } | null;
    de_area: { nombre: string | null } | null;
    a_area: { nombre: string | null } | null;
    remitente: { nombre: string | null; apellido: string | null; area: { nombre: string | null } | null } | null;
    destinatario: { nombre: string | null; apellido: string | null } | null;
    comentario: string | null;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    estado: 'pendiente' | 'recibido';
    respuesta_enviada: boolean;
    puede_recordar: boolean;
    recordatorio_disponible_at: string | null;
    dias_transcurridos: number;
    vencido?: boolean;
};

type ExpedienteGroup = {
    expediente_id: number | null;
    codigo_expediente: string;
    asunto_resumen: string;
    estado: 'abierto' | 'cerrado';
    prioridad: string;
    pendientes: number;
    vencidos?: number;
    total_movimientos: number;
    ultima_fecha_envio: string | null;
    movimientos: MovimientoItem[];
    has_more?: boolean;
    total_movimientos_count: number;
};

type Resumen = {
    total_expedientes: number;
    total_movimientos: number;
    expedientes_activos: number;
    expedientes_cerrados: number;
    expedientes_vencidos: number;
    total_vencidos: number;
};

type PaginationLinkItem = { url: string | null; label: string; active: boolean };

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
    expedientes: PaginatedExpedientes;
    tab: string;
    resumen: Resumen;
};

// ============================================================================
// UTILIDADES
// ============================================================================

const cn = (...classes: (string | boolean | undefined | null)[]): string =>
    classes.filter(Boolean).join(' ');

const formatDate = (value: string | null): string => {
    if (!value) {
return '-';
}

    return new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Guayaquil',
    });
};

const formatTime = (value: string | null): string => {
    if (!value) {
return '-';
}

    return new Date(value).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil',
    });
};

const getFullName = (nombre: string | null, apellido: string | null): string =>
    [nombre, apellido].filter(Boolean).join(' ') || '-';

const getOficioIdentifier = (doc: MovimientoItem['documento']): string => {
    if (!doc) {
return '-';
}

    return doc.numero_oficio ?? `#${doc.id_documento ?? '-'}`;
};

const getOficioTitle = (mov: MovimientoItem): string => {
    const doc = mov.documento;

    if (!doc) {
return `Movimiento #${mov.id_movimiento}`;
}

    if (doc.asunto?.trim()) {
return doc.asunto;
}

    if (doc.movimiento_origen_id && doc.movimiento_origen) {
        const origen = doc.movimiento_origen.documento;

        if (origen?.asunto?.trim()) {
return `Respuesta a: ${origen.asunto}`;
}

        if (origen?.numero_oficio) {
return `Respuesta a oficio ${origen.numero_oficio}`;
}

        return `Respuesta a Mov. #${doc.movimiento_origen_id}`;
    }

    return `Oficio ${getOficioIdentifier(doc)}`;
};

// ============================================================================
// COOLDOWN DEL BOTÓN RECORDAR
// ============================================================================

function RecordatorioCooldown({ disponibleAt }: { disponibleAt: string }) {
    const calcularRestante = () => {
        const diff = new Date(disponibleAt).getTime() - Date.now();

        if (diff <= 0) {
return null;
}

        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);

        return { h, m };
    };

    const [restante, setRestante] = useState(calcularRestante);

    useEffect(() => {
        const id = setInterval(() => {
            const r = calcularRestante();
            setRestante(r);

            if (!r) {
clearInterval(id);
}
        }, 60_000);

        return () => clearInterval(id);
    }, [disponibleAt]);

    const hora = new Date(disponibleAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

    const label = restante
        ? `${restante.h > 0 ? `${restante.h}h ` : ''}${restante.m}m restantes`
        : 'Disponible';

    return (
        <div className="flex flex-col items-end gap-0.5">
            <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] cursor-not-allowed"
                disabled
            >
                <Clock className="mr-1 h-3 w-3" />
                Recordar
            </Button>
            <span className="text-[10px] text-muted-foreground">
                Disponible a las {hora} &middot; {label}
            </span>
        </div>
    );
}

// ============================================================================
// COMPONENTE CARD DE MOVIMIENTO
// ============================================================================

function MovimientoCard({
    movimiento,
    expedienteEstado,
    onRecordar,
    recordandoId,
}: {
    movimiento: MovimientoItem;
    expedienteEstado: 'abierto' | 'cerrado';
    onRecordar: (id: number) => void;
    recordandoId: number | null;
}) {
    const cerrado = expedienteEstado === 'cerrado';
    const dias = movimiento.dias_transcurridos;
    const vencido = movimiento.vencido;

    const lineColor = (() => {
        if (cerrado) {
return 'bg-[var(--chart-4)]';
}

        if (vencido) {
return 'bg-[var(--destructive)]';
}

        if (dias >= 7) {
return 'bg-[var(--destructive)]';
}

        if (dias >= 4) {
return 'bg-[var(--warning)]';
}

        if (dias >= 0) {
return 'bg-[var(--primary)]';
}

        return '';
    })();

    const urgencyLabel = (() => {
        if (cerrado) {
return 'Cerrado';
}

        if (vencido) {
return 'Bloqueado';
}

        if (dias >= 7) {
return 'Alta';
}

        if (dias >= 4) {
return 'Media';
}

        if (dias >= 1) {
return 'Baja';
}

        return '';
    })();

    return (
        <Card className={cn(
            'relative overflow-hidden border bg-card transition-all duration-200 hover:shadow-md',
            movimiento.puede_recordar && !cerrado && !vencido && 'border-amber-200/60 shadow-sm',
        )}>
            {lineColor && (
                <div className={cn('absolute top-0 bottom-0 left-0 w-1', lineColor)} />
            )}
            <CardContent className="p-0">
                <div className={cn('space-y-2 py-3', lineColor ? 'pr-3 pl-4' : 'px-3')}>

                    {/* Fila 1: título + badges */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight">
                                {getOficioTitle(movimiento)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {getOficioIdentifier(movimiento.documento)}
                                {movimiento.documento?.palabra_clave && (
                                    <span className="text-muted-foreground/50"> · {movimiento.documento.palabra_clave}</span>
                                )}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            {movimiento.estado === 'pendiente' && !cerrado ? (
                                <Badge variant="outline" className={cn(
                                    "text-[10px]",
                                    vencido
                                        ? "bg-gray-100 border-gray-300 text-gray-600"
                                        : "bg-amber-50 border-amber-200 text-amber-700"
                                )}>
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                    {vencido ? "Bloqueado" : "Pendiente"}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[var(--chart-4)] px-1.5 text-[10px]">
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                    Recibido
                                </Badge>
                            )}
                            {!cerrado && urgencyLabel && urgencyLabel !== 'Bloqueado' && (
                                <Badge variant="outline" className={cn(
                                    "text-[10px]",
                                    dias >= 7
                                        ? "border-[var(--destructive)] bg-[var(--destructive)/10] text-[var(--destructive)]"
                                        : dias >= 4
                                        ? "border-[var(--border)] bg-[var(--chart-3)]/10 text-[var(--chart-3)]/70"
                                        : "border-[var(--border)] bg-[var(--background)] text-[var(--secundary-foreground)]/60"
                                )}>
                                    {urgencyLabel} · {dias}d
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Fila 2: ruta áreas + usuarios + fecha */}
                    <div className="flex flex-col gap-1 rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate text-muted-foreground">{movimiento.de_area?.nombre ?? '-'}</span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium text-foreground">{movimiento.a_area?.nombre ?? '-'}</span>
                            <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {formatDate(movimiento.fecha_envio)}
                                <span className="text-muted-foreground/60">{formatTime(movimiento.fecha_envio)}</span>
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

                    {/* Comentario */}
                    {movimiento.comentario?.trim() && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{movimiento.comentario.trim()}</span>
                        </div>
                    )}

                    {/* Origen si es respuesta */}
                    {movimiento.documento?.movimiento_origen && (
                        <div className="rounded border-l-2 border-[var(--border)] bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                    En respuesta a:{' '}
                                    {movimiento.documento.movimiento_origen.documento?.asunto?.trim()
                                        || (movimiento.documento.movimiento_origen.documento?.numero_oficio
                                            ? `Oficio ${movimiento.documento.movimiento_origen.documento.numero_oficio}`
                                            : `Movimiento #${movimiento.documento.movimiento_origen.id_movimiento}`
                                        )
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Footer: badges + acciones */}
                    <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                        <div className="flex gap-1.5">
                            {movimiento.documento?.movimiento_origen_id && (
                                <Badge variant="outline" className="border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-1.5 text-[10px]">
                                    <Reply className="mr-1 h-3 w-3" />
                                    Respuesta
                                </Badge>
                            )}
                            {movimiento.respuesta_enviada && (
                                <Badge variant="outline" className="border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] px-1.5 text-[10px]">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Respondido
                                </Badge>
                            )}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            {movimiento.documento?.id_documento && (
                                <Button
                                    asChild
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                >
                                    <a href={documentoShow.url(movimiento.documento!.id_documento!)}>
                                        <Eye className="mr-1 h-3 w-3" />
                                        Ver
                                    </a>
                                </Button>
                            )}
                            {!cerrado && !vencido && (movimiento.puede_recordar || movimiento.recordatorio_disponible_at) && (
                                movimiento.puede_recordar ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                                        disabled={recordandoId === movimiento.id_movimiento}
                                        onClick={() => onRecordar(movimiento.id_movimiento)}
                                    >
                                        <Bell className="mr-1 h-3 w-3" />
                                        {recordandoId === movimiento.id_movimiento ? 'Enviando...' : 'Recordar'}
                                    </Button>
                                ) : (
                                    <RecordatorioCooldown disponibleAt={movimiento.recordatorio_disponible_at!} />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Index({ expedientes, tab, resumen }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string | null; error?: string | null } };

    useEffect(() => {
        if (flash?.success) {
toast.success(flash.success);
}

        if (flash?.error)   {
toast.error(flash.error);
}
    }, [flash?.success, flash?.error]);

    const [recordandoId, setRecordandoId] = useState<number | null>(null);
    const [perPage, setPerPage] = useState(String(expedientes.per_page ?? 5));
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        router.reload({ only: ['expedientes', 'resumen'] });
        setTimeout(() => setRefreshing(false), 1500);
    };

    const paginationLinks = expedientes.links ?? [];
    const previousLink    = paginationLinks[0] ?? null;
    const nextLink        = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks       = paginationLinks.slice(1, -1);

    const goToUrl = (url: string | null): void => {
        if (!url) {
return;
}

        router.visit(url, { preserveScroll: true, preserveState: false, replace: true });
    };

    const changeTab = (newTab: string): void => {
        router.get(ConsultorController.index.url(), { tab: newTab, per_page: perPage, page: 1 }, {
            preserveScroll: true, preserveState: false, replace: true,
        });
    };

    const changePerPage = (value: string): void => {
        setPerPage(value);
        router.get(ConsultorController.index.url(), { tab, per_page: value, page: 1 }, {
            preserveScroll: true, preserveState: false, replace: true,
        });
    };

    const handleRecordar = (movimientoId: number): void => {
        setRecordandoId(movimientoId);
        router.post(
            ConsultorController.recordar.url(movimientoId),
            {},
            {
                preserveScroll: true,
                onFinish: () => setRecordandoId(null),
            },
        );
    };

    const renderExpedientes = (
        grupos: ExpedienteGroup[],
        emptyTitle: string,
        emptySubtitle: string,
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
            <Accordion type="multiple" defaultValue={[]} className="space-y-2">
                {grupos.map((expediente) => (
                    <AccordionItem
                        key={expediente.expediente_id ?? 'sin-exp'}
                        value={String(expediente.expediente_id ?? 'sin-exp')}
                        className="rounded-lg border bg-card px-4"
                    >
                        <AccordionTrigger className="py-3 hover:no-underline">
                            <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                                <div className="relative shrink-0">
                                    <FolderOpen className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                                    {expediente.asunto_resumen}
                                </span>
                                <div className="ml-auto flex shrink-0 items-center gap-3 text-xs">
                                    <span className="text-muted-foreground/60">
                                        {expediente.total_movimientos} mov.
                                    </span>
                                    {expediente.pendientes > 0 && (
                                        <Badge variant="outline" className="border-chart-3/30 bg-background/20 px-2.5 py-0.5 text-xs font-bold text-chart-3/80 shadow-sm backdrop-blur-sm">
                                            {expediente.pendientes} pendiente{expediente.pendientes !== 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                    <Badge
                                        variant="outline"
                                        className={expediente.estado === 'abierto' ? 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}
                                    >
                                        {expediente.estado === 'abierto' ? 'Activo' : 'Cerrado'}
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>

                        <AccordionContent>
                            <div className="space-y-3 pb-2">
                                {expediente.movimientos.map((movimiento) => (
                                    <MovimientoCard
                                        key={movimiento.id_movimiento}
                                        movimiento={movimiento}
                                        expedienteEstado={expediente.estado}
                                        onRecordar={handleRecordar}
                                        recordandoId={recordandoId}
                                    />
                                ))}
                                {expediente.has_more && (
                                    <p className="text-xs text-muted-foreground/60 text-center py-1">
                                        +{expediente.total_movimientos_count - expediente.movimientos.length} movimientos más
                                    </p>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    };

    return (
        <>
            <Head title="Consultor — Expedientes" />

            <div className="mx-auto w-full space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Vista consultor</h2>
                        <p className="text-sm text-muted-foreground">
                            {resumen.total_expedientes} expedientes · {resumen.total_movimientos} movimientos
                            {resumen.total_vencidos > 0 && (
                                <span className="ml-2 text-red-600 font-medium">
                                    · {resumen.total_vencidos} vencido{resumen.total_vencidos !== 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            refreshing ? 'duration-[1500ms] rotate-[360deg]' : 'duration-0',
                        )} />
                        Actualizar
                    </Button>
                </div>

                {/* Resumen rápido */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Total expedientes', value: resumen.total_expedientes, color: 'text-foreground' },
                        { label: 'Activos', value: resumen.expedientes_activos, color: 'text-[var(--chart-4)]' },
                        { label: 'Cerrados', value: resumen.expedientes_cerrados, color: 'text-[gray-500]' },
                        { label: 'Vencidos', value: resumen.total_vencidos, color: 'text-[var(--destructive)]' },
                    ].map((item) => (
                        <div key={item.label} className="rounded-lg border bg-card px-4 py-3">
                            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs arriba de la paginación */}
                <Tabs value={tab} onValueChange={changeTab}>
                    <TabsList className="mb-3">
                        <TabsTrigger value="activos" className="gap-2">
                            Activos
                            {resumen.expedientes_activos > 0 && (
                                <span className="rounded-full border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm">
                                    {resumen.expedientes_activos}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="cerrados" className="gap-2">
                            Cerrados
                            {resumen.expedientes_cerrados > 0 && (
                                <span className="rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                                    {resumen.expedientes_cerrados}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="vencidos" className="gap-2">
                            Vencidos
                            {resumen.expedientes_vencidos > 0 && (
                                <span className="rounded-full border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive shadow-sm backdrop-blur-sm">
                                    {resumen.expedientes_vencidos}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <Separator className=' ' />

                    {/* Paginación superior */}
                    {expedientes.total > 0 && (
                        <div className="flex flex-wrap mt-3 items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-muted-foreground">Mostrar</Label>
                                <Select value={perPage} onValueChange={changePerPage}>
                                    <SelectTrigger className="h-8 w-[70px] text-[13px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="7">7</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>


                            <div className="flex-1" />
                            <div className="flex items-center">
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={previousLink?.url ?? '#'}
                                                onClick={(e) => {
 e.preventDefault(); goToUrl(previousLink?.url ?? null); 
}}
                                                className={!previousLink?.url ? 'pointer-events-none opacity-40' : ''}
                                            />
                                        </PaginationItem>
                                        {pageLinks.map((link) => (
                                            <PaginationItem key={`${link.label}-${link.url ?? 'null'}`}>
                                                <PaginationLink
                                                    href={link.url ?? '#'}
                                                    isActive={link.active}
                                                    onClick={(e) => {
 e.preventDefault(); goToUrl(link.url); 
}}
                                                    className={!link.url ? 'pointer-events-none opacity-40' : ''}
                                                >
                                                    {link.label
                                                        .replace('&laquo;', '').replace('&raquo;', '')
                                                        .replace('pagination.previous', '')
                                                        .replace('pagination.next', '')}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext
                                                href={nextLink?.url ?? '#'}
                                                onClick={(e) => {
 e.preventDefault(); goToUrl(nextLink?.url ?? null); 
}}
                                                className={!nextLink?.url ? 'pointer-events-none opacity-40' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                    )}

                    <TabsContent value={tab} className="mt-4">
                        {renderExpedientes(
                            expedientes.data,
                            tab === 'cerrados' ? 'No hay expedientes cerrados' :
                            tab === 'vencidos' ? 'No hay expedientes con movimientos vencidos' :
                            'No hay expedientes activos',
                            tab === 'cerrados' ? 'Los expedientes completados aparecerán aquí' :
                            tab === 'vencidos' ? 'Todos los movimientos están dentro del plazo' :
                            'Todos los expedientes están cerrados o vencidos',
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Expedientes', href: ConsultorController.index.url() },
    ],
};
