import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    ExternalLink,
    FileIcon,
    FileText,
    History,
    Printer,
    Send,
    User,
} from 'lucide-react';

import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import MovimientoController from '@/actions/App/Http/Controllers/User/MovimientoController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboard } from '@/routes';

// ============================================================================
// TIPOS
// ============================================================================

type Movimiento = {
    id_movimiento: number;
    documento_id: number;
    de_area_id: number;
    a_area_id: number;
    enviado_por: number;
    comentario: string | null;
    respuesta_comentario: string | null;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    created_at: string;
    updated_at: string;
    deArea: { id_area: number; nombre: string | null } | null;
    aArea: { id_area: number; nombre: string | null } | null;
    remitente: { id_user: number; nombre: string | null; apellido: string | null } | null;
};

type Documento = {
    id_documento: number;
    numero_oficio: string | null;
    fecha_oficio: string | null;
    asunto: string | null;
    palabra_clave: string | null;
    tipo: string | null;
    recibido: string | null;
    archivo: string | null;
    area_actual_id: number;
    area_creadora_id: number | null;
    user_id: number;
    area: { id_area: number; nombre: string | null } | null;
    remitente: { id_remitente: number; nombre: string | null } | null;
    user: { id_user: number; nombre: string | null; apellido: string | null } | null;
};

type MovimientoHistorial = {
    id_movimiento: number;
    documento_id: number;
    de_area_id: number;
    a_area_id: number;
    enviado_por: number;
    comentario: string | null;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    deArea: { id_area: number; nombre: string | null } | null;
    aArea: { id_area: number; nombre: string | null } | null;
    remitente: { id_user: number; nombre: string | null; apellido: string | null } | null;
};

type Props = {
    movimiento: Movimiento;
    documento: Documento | null;
    movimientos: MovimientoHistorial[];
    canEnviar: boolean;
};

// ============================================================================
// UTILIDADES
// ============================================================================

const PROJECT_TIME_ZONE = 'America/Guayaquil';

const formatDate = (value: string | null): string => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric',
        timeZone: PROJECT_TIME_ZONE,
    });
};

const formatDateShort = (value: string | null): string => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric',
        timeZone: PROJECT_TIME_ZONE,
    });
};

const formatTime = (value: string | null): string => {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit',
        timeZone: PROJECT_TIME_ZONE,
    });
};

const getFullName = (nombre: string | null, apellido: string | null): string =>
    [nombre, apellido].filter(Boolean).join(' ') || '-';

const getFileUrl = (archivo: string): string => `/storage/${archivo}`;

const isPdfFile = (archivo: string): boolean =>
    archivo.toLowerCase().endsWith('.pdf');

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function InfoRow({ icon: Icon, label, children }: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                <div className="text-sm text-foreground break-words">{children}</div>
            </div>
        </div>
    );
}

function TimelineItem({ mov, isLast }: { mov: MovimientoHistorial; isLast: boolean }) {
    const isReceived = !!mov.fecha_recepcion;

    return (
        <div className="flex gap-3 relative">
            {!isLast && (
                <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border/40" />
            )}
            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border ${
                isReceived
                    ? 'bg-chart-4/10 border-chart-4/20 dark:bg-chart-4/40'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
            }`}>
                {isReceived
                    ? <CheckCircle className="h-3.5 w-3.5 text-chart-4/60 dark:text-emerald-400" />
                    : <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                }
            </div>

            <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{mov.deArea?.nombre ?? '-'}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-foreground">{mov.aArea?.nombre ?? '-'}</span>
                    {!isReceived && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 ml-auto dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                            Pendiente
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {getFullName(mov.remitente?.nombre ?? null, mov.remitente?.apellido ?? null)}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateShort(mov.fecha_envio)}
                    </span>
                    {isReceived && (
                        <span className="text-[11px] text-chart-4/60 font-medium">
                            Recibido {formatDateShort(mov.fecha_recepcion)}
                        </span>
                    )}
                </div>
                {mov.comentario && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 rounded px-2 py-1 border-l-2 border-border italic">
                        {mov.comentario}
                    </p>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Show({ movimiento, documento, movimientos, canEnviar }: Props) {
    const isPending = !movimiento.fecha_recepcion;
    const pageTitle = documento?.numero_oficio
        ? `Oficio N° ${documento.numero_oficio}`
        : `Documento #${documento?.id_documento ?? movimiento.documento_id}`;

    const handleDownload = () => {
        if (!documento?.archivo) return;
        const link = document.createElement('a');
        link.href = getFileUrl(documento.archivo);
        link.download = documento.archivo.split('/').pop() || 'documento.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        if (documento?.archivo && isPdfFile(documento.archivo)) {
            const win = window.open(getFileUrl(documento.archivo), '_blank');
            if (win) win.print();
        }
    };

    return (
        <>
            <Head title={pageTitle} />

            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 space-y-4">

                {/* ── Header ── */}
                <div className="flex items-start gap-3">
                    <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0 mt-0.5">
                        <Link href={MovimientoController.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex gap-2 flex-wrap items-center">
                            <h1 className="text-xl font-semibold leading-tight">{pageTitle}</h1>
                            <div className="flex items-center gap-1 ml-auto">
                                <Badge
                                    variant="outline"
                                    className={isPending
                                        ? 'border-amber-200 bg-amber-50 text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                        : 'border-chart-4/20 bg-chart-4/10 text-chart-4/70 text-xs'
                                    }
                                >
                                    {isPending ? 'Pendiente' : 'Recibido'}
                                </Badge>
                                {documento?.tipo && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {documento.tipo}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {movimiento.deArea?.nombre ?? '-'}
                            {' → '}
                            {movimiento.aArea?.nombre ?? '-'}
                            {movimiento.fecha_envio && ` · ${formatDateShort(movimiento.fecha_envio)}`}
                        </p>
                    </div>
                </div>

                {/* ── Grid principal ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-stretch h-[calc(100vh-11rem)] min-h-[600px]">

                    {/* Visor PDF */}
                    <div className="rounded-xl border bg-card overflow-hidden sticky top-4">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate">
                                    {documento?.archivo
                                        ? documento.archivo.split('/').pop()
                                        : 'Sin archivo adjunto'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                {documento?.archivo && (
                                    <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        title="Abrir en nueva pestaña"
                                        onClick={() => window.open(getFileUrl(documento.archivo!), '_blank')}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    title="Descargar"
                                    onClick={handleDownload}
                                    disabled={!documento?.archivo}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                                {documento?.archivo && isPdfFile(documento.archivo) && (
                                    <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        title="Imprimir"
                                        onClick={handlePrint}
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="bg-muted/20 h-[calc(100vh-11rem)] min-h-[500px]">
                            {documento?.archivo ? (
                                isPdfFile(documento.archivo) ? (
                                    <iframe
                                        title="Vista previa del documento"
                                        src={getFileUrl(documento.archivo)}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <img
                                        src={getFileUrl(documento.archivo)}
                                        alt="Vista previa del documento"
                                        className="w-full h-full object-contain"
                                    />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                                    <FileIcon className="h-12 w-12 opacity-30" />
                                    <p className="text-sm">Sin archivo adjunto</p>
                                    {documento && (
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={DocumentoController.show.url(documento.id_documento)}>
                                                Ver documento
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel lateral con tabs */}
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <Tabs defaultValue="movimiento">
                            <div className="border-b bg-muted/20">
                                <TabsList className="h-8 w-full rounded-none bg-transparent p-0">
                                    <TabsTrigger
                                        value="movimiento"
                                        className="flex-1 h-8 text-xs gap-1.5 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                        <Send className="h-3 w-3" />
                                        Movimiento
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="datos"
                                        className="flex-1 h-8 text-xs gap-1.5 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                        <FileText className="h-3 w-3" />
                                        Documento
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="historial"
                                        className="flex-1 h-8 text-xs gap-1.5 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                        <History className="h-3 w-3" />
                                        Historial
                                        {movimientos.length > 0 && (
                                            <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                                                {movimientos.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Tab: Movimiento actual */}
                            <TabsContent value="movimiento" className="m-0">
                                <ScrollArea className="h-[calc(100vh-14rem)] min-h-[550px]">
                                    <div className="px-4 py-1">
                                        <InfoRow icon={Building2} label="Origen">
                                            {movimiento.deArea?.nombre ?? '-'}
                                        </InfoRow>
                                        <InfoRow icon={Building2} label="Destino">
                                            <span className="font-medium">{movimiento.aArea?.nombre ?? '-'}</span>
                                        </InfoRow>
                                        <InfoRow icon={User} label="Enviado por">
                                            {getFullName(movimiento.remitente?.nombre ?? null, movimiento.remitente?.apellido ?? null)}
                                        </InfoRow>
                                        <InfoRow icon={Calendar} label="Fecha de envío">
                                            {formatDate(movimiento.fecha_envio)}
                                            {movimiento.fecha_envio && (
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    {formatTime(movimiento.fecha_envio)}
                                                </span>
                                            )}
                                        </InfoRow>
                                        {movimiento.fecha_recepcion && (
                                            <InfoRow icon={CheckCircle} label="Fecha de recepción">
                                                <span className="text-chart-4/80 font-medium">
                                                    {formatDate(movimiento.fecha_recepcion)}
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        {formatTime(movimiento.fecha_recepcion)}
                                                    </span>
                                                </span>
                                            </InfoRow>
                                        )}
                                        {movimiento.comentario && (
                                            <div className="py-2.5 border-b border-border/50">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Comentario</p>
                                                        <p className="text-sm bg-muted/40 rounded px-2 py-1.5 border-l-2 border-border italic">
                                                            {movimiento.comentario}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {movimiento.respuesta_comentario && (
                                            <div className="py-2.5 border-b border-border/50">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 mt-0.5">
                                                        <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Respuesta</p>
                                                        <p className="text-sm bg-emerald-50/60 dark:bg-emerald-950/20 rounded px-2 py-1.5 border-l-2 border-emerald-300 dark:border-emerald-700">
                                                            {movimiento.respuesta_comentario}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* Tab: Datos del documento */}
                            <TabsContent value="datos" className="m-0">
                                <ScrollArea className="h-[calc(100vh-14rem)] min-h-[550px]">
                                    <div className="px-4 py-1">
                                        <InfoRow icon={FileText} label="Número de oficio">
                                            {documento?.numero_oficio ?? '-'}
                                        </InfoRow>
                                        {documento?.asunto && (
                                            <InfoRow icon={FileText} label="Asunto">
                                                {documento.asunto}
                                            </InfoRow>
                                        )}
                                        <InfoRow icon={FileText} label="Tipo">
                                            <span className="capitalize">{documento?.tipo ?? '-'}</span>
                                        </InfoRow>
                                        <InfoRow icon={FileText} label="Palabra clave">
                                            {documento?.palabra_clave ?? '-'}
                                        </InfoRow>
                                        <InfoRow icon={Calendar} label="Fecha del oficio">
                                            {formatDate(documento?.fecha_oficio ?? null)}
                                        </InfoRow>
                                        <InfoRow icon={User} label="Remitente">
                                            {documento?.remitente?.nombre ?? '-'}
                                        </InfoRow>
                                        <InfoRow icon={Building2} label="Área actual">
                                            {documento?.area?.nombre ?? '-'}
                                        </InfoRow>
                                        <InfoRow icon={User} label="Subido por">
                                            {documento?.user
                                                ? getFullName(documento.user.nombre, documento.user.apellido)
                                                : '-'}
                                        </InfoRow>
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* Tab: Historial */}
                            <TabsContent value="historial" className="m-0">
                                <ScrollArea className="h-[calc(100vh-14rem)] min-h-[400px]">
                                    <div className="px-4 pt-3 pb-2">
                                        {movimientos.length > 0 ? (
                                            movimientos.map((mov, index) => (
                                                <TimelineItem
                                                    key={mov.id_movimiento}
                                                    mov={mov}
                                                    isLast={index === movimientos.length - 1}
                                                />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                                <History className="h-8 w-8 opacity-30 mb-2" />
                                                <p className="text-sm">Sin historial de movimientos</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>

                </div>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Mis movimientos', href: MovimientoController.index.url() },
        { title: 'Detalles del movimiento', href: '#' },
    ],
};
