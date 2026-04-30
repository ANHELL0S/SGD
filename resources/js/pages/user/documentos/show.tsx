import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    History,
    Reply,
    Send,
    User,
    Download,
    Printer,
    ExternalLink,
    Building2,
    Activity,
    ScanText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import {
    marcarRecibido,
    responder as responderMovimiento,
    store as storeMovimiento,
} from '@/actions/App/Http/Controllers/User/MovimientoController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';

// ============================================================================
// TIPOS
// ============================================================================

type DocumentoDetalle = {
    id_documento: number;
    numero_oficio: string | null;
    asunto: string | null;
    fecha_oficio: string | null;
    remitente: { nombre: string } | null;
    area: { nombre: string } | null;
    user: { nombre: string; apellido: string | null } | null;
    tipo: string;
    palabra_clave: string;
    archivo: string;
    contenido_ocr: string | null;
    recibido: string;
    created_at: string;
    updated_at: string;
};

type Movimiento = {
    id_movimiento: number;
    de_area_id: number;
    a_area_id: number;
    destinatario_user_id: number | null;
    comentario: string | null;
    fecha_envio: string;
    fecha_recepcion: string | null;
    de_area: { nombre: string } | null;
    a_area: { nombre: string } | null;
    destinatario: { nombre: string; apellido: string | null } | null;
    remitente: { nombre: string; apellido: string | null } | null;
};

type Area = {
    id_area: number;
    nombre: string;
};

type UsuarioDestino = {
    id_user: number;
    nombre: string;
    apellido: string | null;
    area_id: number | null;
};

type Props = {
    documento: DocumentoDetalle;
    areas: Area[];
    usuariosDestino: UsuarioDestino[];
    movimientos: Movimiento[];
    canEnviar: boolean;
    userAreaId: number | null;
    userId: number | null;
};

// ============================================================================
// UTILIDADES
// ============================================================================

const PROJECT_TIME_ZONE = 'America/Guayaquil';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const formatDate = (value: string | null): string => {
    if (!value) return '-';
    const date = DATE_REGEX.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric',
        timeZone: PROJECT_TIME_ZONE,
    });
};

const formatDateShort = (value: string | null): string => {
    if (!value) return '-';
    const date = DATE_REGEX.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric',
        timeZone: PROJECT_TIME_ZONE,
    });
};

const getFileUrl = (archivo: string): string => `/storage/${archivo}`;
const isPdfFile = (archivo: string): boolean => archivo.toLowerCase().endsWith('.pdf');
const formatFullName = (nombre: string, apellido: string | null | undefined): string =>
    `${nombre} ${apellido ?? ''}`.trim();

const sortMovimientosByDate = (movimientos: Movimiento[]): Movimiento[] =>
    [...movimientos].sort((a, b) => {
        const diff = new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime();
        return diff !== 0 ? diff : a.id_movimiento - b.id_movimiento;
    });

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
    subido:      { label: 'Subido',      className: 'border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm' },
    recibido:    { label: 'Recibido',    className: 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm' },
    enviado:     { label: 'Enviado',     className: 'border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm' },
    en_revision: { label: 'En revisión', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    aprobado:    { label: 'Aprobado',    className: 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm' },
    rechazado:   { label: 'Rechazado',   className: 'border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive shadow-sm backdrop-blur-sm' },
    respondido:  { label: 'Respondido',  className: 'border-purple-200 bg-purple-50 text-purple-700' },
};

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

function TimelineItem({
    mov, isLast, canInteract, processingRecepcion, onReceive,
}: {
    mov: Movimiento;
    isLast: boolean;
    canInteract: boolean;
    processingRecepcion: boolean;
    onReceive: (id: number) => void;
}) {
    const isReceived = !!mov.fecha_recepcion;

    return (
        <div className="flex gap-3 relative">
            {!isLast && (
                <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border/40" />
            )}
            <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border ${
                isReceived ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}>
                {isReceived
                    ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    : <Clock className="h-3.5 w-3.5 text-amber-500" />
                }
            </div>

            <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{mov.de_area?.nombre ?? '-'}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-foreground">{mov.a_area?.nombre ?? '-'}</span>
                    {!isReceived && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 ml-auto">
                            Pendiente
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {mov.remitente ? formatFullName(mov.remitente.nombre, mov.remitente.apellido) : 'Sistema'}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateShort(mov.fecha_envio)}
                    </span>
                    {isReceived && (
                        <span className="text-[11px] text-emerald-600 font-medium">
                            Recibido {formatDateShort(mov.fecha_recepcion)}
                        </span>
                    )}
                </div>

                {mov.comentario && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 rounded px-2 py-1 border-l-2 border-border italic">
                        {mov.comentario}
                    </p>
                )}

                {canInteract && (
                    <div className="flex gap-2 mt-2">
                        {!isReceived && (
                            <Button
                                type="button" size="sm" variant="outline"
                                className="h-7 text-xs"
                                disabled={processingRecepcion}
                                onClick={() => onReceive(mov.id_movimiento)}
                            >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Marcar recibido
                            </Button>
                        )}
                        <Button asChild size="sm" className="h-7 text-xs bg-[var(--primary)]/60 hover:bg-blue-700 text-white">
                            <Link href={responderMovimiento.url(mov.id_movimiento)}>
                                <Reply className="h-3 w-3 mr-1" />
                                Responder
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SendSheet({
    canSend, open, onOpenChange, areas, usuariosDestino,
    formData, errors, processing, onFieldChange, onSubmit,
}: {
    canSend: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    areas: Area[];
    usuariosDestino: UsuarioDestino[];
    formData: { a_area_id: string; destinatario_user_id: string; comentario: string };
    errors: Record<string, string>;
    processing: boolean;
    onFieldChange: (field: string, value: string) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
    const usuariosFiltrados = usuariosDestino.filter(
        (u) => String(u.area_id ?? '') === formData.a_area_id
    );

    return (
        <Sheet open={open} onOpenChange={(next) => { if (canSend) onOpenChange(next); }}>
            <SheetTrigger asChild>
                <Button
                    size="sm"
                    disabled={!canSend}
                    className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:bg-muted disabled:text-muted-foreground"
                    title={!canSend ? 'No tienes permisos para enviar desde tu área actual.' : undefined}
                >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar a otra área
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>Enviar oficio</SheetTitle>
                    <SheetDescription>Selecciona el área destino y el motivo del envío.</SheetDescription>
                </SheetHeader>
                <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={onSubmit}>
                    <div className="flex-1 space-y-5 px-5 py-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="a_area_id">Área destino</Label>
                            <Select
                                value={formData.a_area_id}
                                onValueChange={(v) => { onFieldChange('a_area_id', v); onFieldChange('destinatario_user_id', ''); }}
                            >
                                <SelectTrigger id="a_area_id" className="w-full">
                                    <SelectValue placeholder="Selecciona un área" />
                                </SelectTrigger>
                                <SelectContent >
                                    {areas.map((area) => (
                                        <SelectItem key={area.id_area} value={String(area.id_area)} >
                                            {area.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.a_area_id && <p className="text-xs text-red-600">{errors.a_area_id}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="destinatario_user_id">
                                Usuario destino
                            </Label>
                            <Select
                                value={formData.destinatario_user_id}
                                onValueChange={(v) => onFieldChange('destinatario_user_id', v)}
                                disabled={!formData.a_area_id}
                            >
                                <SelectTrigger id="destinatario_user_id" className="w-full">
                                    <SelectValue placeholder="Selecciona un usuario" />
                                </SelectTrigger>
                                <SelectContent>
                                    {usuariosFiltrados.map((u) => (
                                        <SelectItem key={u.id_user} value={String(u.id_user)}>
                                            {formatFullName(u.nombre, u.apellido)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.destinatario_user_id && <p className="text-xs text-red-600">{errors.destinatario_user_id}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="comentario">
                                Comentario / motivo <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="comentario"
                                placeholder="Ej: Para revisión, Para firma, etc."
                                required rows={5}
                                value={formData.comentario}
                                onChange={(e) => onFieldChange('comentario', e.target.value)}
                                className="resize-none"
                            />
                            {errors.comentario && <p className="text-xs text-red-600">{errors.comentario}</p>}
                        </div>
                    </div>
                    <SheetFooter>
                        <Button
                            type="submit"
                            disabled={processing || !formData.a_area_id || !formData.destinatario_user_id || !formData.comentario.trim()}
                            className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/80 disabled:opacity-50"
                        >
                            {processing ? 'Enviando...' : 'Confirmar envío'}
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Show({
    documento, areas, usuariosDestino, movimientos, canEnviar, userAreaId, userId,
}: Props) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const page = usePage();
    const queryParams = new URLSearchParams(page.url.split('?')[1] ?? '');

    const [isSendSheetOpen, setIsSendSheetOpen] = useState<boolean>(
        canEnviar && queryParams.get('send') === '1'
    );

    const { data, setData, post, processing, errors, reset } = useForm({
        id_documento: documento.id_documento,
        a_area_id: '',
        destinatario_user_id: '',
        comentario: '',
    });

    const { patch, processing: processingRecepcion } = useForm({});

    useEffect(() => {
        if (flash?.success) toast.success(flash.success, { id: 'flash-success' });
    }, [flash?.success]);

    const allMovimientos = sortMovimientosByDate(movimientos);
    const hasOcr = !!documento.contenido_ocr?.trim();

    const handleSubmitMovimiento = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canEnviar) return;
        post(storeMovimiento.url(), {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                reset('a_area_id', 'destinatario_user_id', 'comentario');
                setIsSendSheetOpen(false);
            },
        });
    };

    const handleReceiveMovimiento = (idMovimiento: number) => {
        patch(marcarRecibido.url(idMovimiento), {
            preserveScroll: true,
            onSuccess: () => toast.success('El oficio fue marcado como recibido.'),
        });
    };

    const pageTitle = documento.numero_oficio
        ? `Oficio ${documento.numero_oficio}`
        : `Documento #${documento.id_documento}`;

    const estado = ESTADO_CONFIG[documento.recibido] ?? { label: documento.recibido, className: 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]' };

    return (
        <>
            <Head title={pageTitle} />

            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 space-y-4">

                {/* ── Header ── */}
                <div className="flex items-start gap-3">
                    <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0 mt-0.5">
                        <Link href={DocumentoController.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex gap-2 flex-wrap">
                            <h1 className="text-xl font-semibold leading-tight">{pageTitle}</h1>
                            <div className='flex items-center gap-1 ml-auto'>
                            <Badge variant="outline" className={`text-xs ${estado.className}`}>
                                {estado.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                                {documento.tipo}
                            </Badge>
                            </div>
                        </div>

                        <div className='inline-flex items-center gap-1 mt-1'>
                        {documento.asunto && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{documento.asunto}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">-</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {documento.area?.nombre ?? 'Sin área'} · {formatDateShort(documento.created_at)}
                        </p>
                        </div>
                    </div>
                    {canEnviar && (
                        <SendSheet
                            canSend={canEnviar}
                            open={isSendSheetOpen}
                            onOpenChange={setIsSendSheetOpen}
                            areas={areas}
                            usuariosDestino={usuariosDestino}
                            formData={data}
                            errors={errors}
                            processing={processing}
                            onFieldChange={setData}
                            onSubmit={handleSubmitMovimiento}
                        />
                    )}
                </div>

                {/* ── Grid principal ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-stretch h-[calc(100vh-11rem)] min-h-[600px]">

                    {/* Visor PDF */}
                    <div className="rounded-xl border bg-card overflow-hidden sticky top-4">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate">
                                    {documento.archivo.split('/').pop()}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    title="Abrir en nueva pestaña"
                                    onClick={() => window.open(getFileUrl(documento.archivo), '_blank')}
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    title="Descargar"
                                    onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = getFileUrl(documento.archivo);
                                        a.download = documento.archivo.split('/').pop() || 'documento';
                                        a.click();
                                    }}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                                {isPdfFile(documento.archivo) && (
                                    <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        title="Imprimir"
                                        onClick={() => {
                                            const w = window.open(getFileUrl(documento.archivo), '_blank');
                                            if (w) w.print();
                                        }}
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="bg-muted/20 h-[calc(100vh-11rem)] min-h-[500px]">
                            {isPdfFile(documento.archivo) ? (
                                <iframe
                                    title="Oficio original"
                                    src={getFileUrl(documento.archivo)}
                                    className="w-full h-full"
                                />
                            ) : (
                                <img
                                    src={getFileUrl(documento.archivo)}
                                    alt="Oficio original"
                                    className="w-full h-full object-contain"
                                />
                            )}
                        </div>
                    </div>

                    {/* Panel lateral con tabs */}
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <Tabs defaultValue="datos">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                                <TabsList className="h-7 bg-transparent p-0 gap-0.5">
                                    <TabsTrigger
                                        value="datos"
                                        className="h-7 px-2.5 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                        <FileText className="h-3 w-3" />
                                        Datos
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="historial"
                                        className="h-7 px-2.5 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                        <History className="h-3 w-3" />
                                        Historial
                                        {movimientos.length > 0 && (
                                            <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
                                                {movimientos.length}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    {hasOcr && (
                                        <TabsTrigger
                                            value="ocr"
                                            className="h-7 px-2.5 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                        >
                                            <ScanText className="h-3 w-3" />
                                            OCR
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </div>


                            {/* Tab: Datos */}
                            <TabsContent value="datos" className="m-0">
                                <ScrollArea className="h-[calc(100vh-14rem)] min-h-[550px]">
                                    <div className="px-4 py-1">
                                        <InfoRow icon={FileText} label="Número de oficio">
                                            {documento.numero_oficio ?? '-'}
                                        </InfoRow>
                                        {documento.asunto && (
                                            <InfoRow icon={FileText} label="Asunto">
                                                {documento.asunto}
                                            </InfoRow>
                                        )}
                                        <InfoRow icon={Activity} label="Tipo">
                                            <span className="capitalize">{documento.tipo}</span>
                                        </InfoRow>
                                        <InfoRow icon={Calendar} label="Fecha del oficio">
                                            {formatDate(documento.fecha_oficio)}
                                        </InfoRow>
                                        <InfoRow icon={User} label="Remitente">
                                            {documento.remitente?.nombre ?? '-'}
                                        </InfoRow>
                                        <InfoRow icon={Building2} label="Área actual">
                                                {documento.area?.nombre ?? '-'}
                                        </InfoRow>
                                        <InfoRow icon={User} label="Subido por">
                                            {documento.user
                                                ? formatFullName(documento.user.nombre, documento.user.apellido)
                                                : '-'}
                                        </InfoRow>
                                        <InfoRow icon={Calendar} label="Fecha de registro">
                                            {formatDate(documento.created_at)}
                                        </InfoRow>
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* Tab: Historial */}
                            <TabsContent value="historial" className="m-0">
                                <ScrollArea className="h-[calc(100vh-14rem)] min-h-[400px]">
                                    <div className="px-4 pt-3 pb-2">
                                        {allMovimientos.length > 0 ? (
                                            allMovimientos.map((mov, index) => (
                                                <TimelineItem
                                                    key={mov.id_movimiento}
                                                    mov={mov}
                                                    isLast={index === allMovimientos.length - 1}
                                                    canInteract={
                                                        userAreaId === mov.a_area_id &&
                                                        (mov.destinatario_user_id === null || userId === mov.destinatario_user_id)
                                                    }
                                                    processingRecepcion={processingRecepcion}
                                                    onReceive={handleReceiveMovimiento}
                                                />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                                <History className="h-8 w-8 opacity-30 mb-2" />
                                                <p className="text-sm">Sin movimientos registrados</p>
                                                <p className="text-xs opacity-70 mt-0.5">El oficio aún no ha sido enviado</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* Tab: OCR */}
                            {hasOcr && (
                                <TabsContent value="ocr" className="m-0">
                                    <ScrollArea className="h-[calc(100vh-14rem)] min-h-[400px]">
                                        <div className="px-4 py-3">
                                            <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                                {documento.contenido_ocr}
                                            </p>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            )}
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
        { title: 'Mis documentos', href: DocumentoController.index.url() },
        { title: 'Detalle del oficio', href: '#' },
    ],
};
