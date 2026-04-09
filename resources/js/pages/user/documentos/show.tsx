import { Head, Link, useForm, usePage } from '@inertiajs/react';
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
    User
} from 'lucide-react';
import { useState } from 'react';
import DocumentoController, {
    edit as editDocumento,
} from '@/actions/App/Http/Controllers/User/DocumentoController';
import {
    marcarRecibido,
    responder as responderMovimiento,
    store as storeMovimiento,
} from '@/actions/App/Http/Controllers/User/MovimientoController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';

// ============================================================================
// Types
// ============================================================================

type DocumentoDetalle = {
    id_documento: number;
    numero_oficio: string | null;
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
    comentario: string | null;
    fecha_envio: string;
    fecha_recepcion: string | null;
    de_area: { nombre: string } | null;
    a_area: { nombre: string } | null;
    remitente: { nombre: string; apellido: string | null } | null;
};

type Area = {
    id_area: number;
    nombre: string;
};

type Props = {
    documento: DocumentoDetalle;
    areas: Area[];
    movimientos: Movimiento[];
    canEnviar: boolean;
    userAreaId: number | null;
};

type MovimientoGrupo = {
    motivo: string;
    movimientos: Movimiento[];
    ultimaFechaEnvio: string;
};

// ============================================================================
// Constants & Utilities
// ============================================================================

const PROJECT_TIME_ZONE = 'America/Guayaquil';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const formatDate = (value: string | null): string => {
    if (!value) {
return '-';
}

    const date = DATE_REGEX.test(value)
        ? new Date(`${value}T12:00:00`)
        : new Date(value);

    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: PROJECT_TIME_ZONE,
    });
};

const getFileUrl = (archivo: string): string => `/storage/${archivo}`;

const isPdfFile = (archivo: string): boolean =>
    archivo.toLowerCase().endsWith('.pdf');

const formatFullName = (
    nombre: string,
    apellido: string | null | undefined,
): string => `${nombre} ${apellido ?? ''}`.trim();

const getEstadoBadgeVariant = (estado: string): 'default' | 'secondary' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
        subido: 'secondary',
        enviado: 'default',
        recibido: 'outline',
    };

    return variants[estado] || 'secondary';
};

const groupMovimientosByMotivo = (
    movimientos: Movimiento[],
): MovimientoGrupo[] => {
    const groups = movimientos.reduce<Record<string, MovimientoGrupo>>(
        (acc, movimiento) => {
            const motivo = movimiento.comentario?.trim() || 'Sin motivo';

            if (!acc[motivo]) {
                acc[motivo] = {
                    motivo,
                    movimientos: [],
                    ultimaFechaEnvio: movimiento.fecha_envio,
                };
            }

            acc[motivo].movimientos.push(movimiento);

            const movimientoDate = new Date(movimiento.fecha_envio);
            const ultimaDate = new Date(acc[motivo].ultimaFechaEnvio);

            if (movimientoDate > ultimaDate) {
                acc[motivo].ultimaFechaEnvio = movimiento.fecha_envio;
            }

            return acc;
        },
        {},
    );

    return Object.values(groups).sort(
        (a, b) =>
            new Date(b.ultimaFechaEnvio).getTime() -
            new Date(a.ultimaFechaEnvio).getTime(),
    );
};

const sortMovimientosByDate = (movimientos: Movimiento[]): Movimiento[] => {
    return [...movimientos].sort((a, b) => {
        const dateDiff =
            new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime();

        return dateDiff !== 0 ? dateDiff : a.id_movimiento - b.id_movimiento;
    });
};

// ============================================================================
// Sub-components
// ============================================================================

interface DocumentInfoCardProps {
    documento: DocumentoDetalle;
}

const DocumentInfoCard = ({ documento }: DocumentInfoCardProps) => (
    <Card className="flex h-full flex-col border-none">
        <CardHeader className="pb-3">
            <CardDescription>
                Registrado el {formatDate(documento.created_at)}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
            <div className="space-y-3">
                <InfoRow label="Tipo" value={documento.tipo} />
                <InfoRow label="Número" value={documento.numero_oficio ?? '-'} />
                <InfoRow label="Fecha del oficio" value={formatDate(documento.fecha_oficio)} />
                <InfoRow
                    label="Remitente"
                    value={documento.remitente?.nombre ?? '-'}
                />
                <InfoRow label="Área actual" value={documento.area?.nombre ?? '-'} />
                <InfoRow label="Palabra clave" value={documento.palabra_clave} />

                <Separator className="my-2" />

                <InfoRow label="Subido por">
                    <span className="text-sm">
                        {documento.user
                            ? formatFullName(documento.user.nombre, documento.user.apellido)
                            : '-'}
                    </span>
                </InfoRow>
                <InfoRow label="Última actualización" value={formatDate(documento.updated_at)} />

                <div className="pt-2">
                    <Badge variant={getEstadoBadgeVariant(documento.recibido)} className="capitalize">
                        {documento.recibido.replaceAll('_', ' ')}
                    </Badge>
                </div>
            </div>
        </CardContent>
    </Card>
);

interface InfoRowProps {
    label: string;
    value?: string | null;
    children?: React.ReactNode;
}

const InfoRow = ({ label, value, children }: InfoRowProps) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {children ?? <span className="text-sm">{value ?? '-'}</span>}
    </div>
);

interface DocumentViewerCardProps {
    archivo: string;
    titulo?: string;
}

const DocumentViewerCard = ({ archivo, titulo = "Documento original" }: DocumentViewerCardProps) => {
    const fileUrl = getFileUrl(archivo);

    return (
        <Card className="flex h-full flex-col border-none">
                <CardContent className="flex-1 p-0">
                <div className="h-full overflow-hidden rounded-b-lg bg-muted/30">
                    {isPdfFile(archivo) ? (
                        <iframe
                            title="Oficio original"
                            src={fileUrl}
                            className="h-full w-full"
                        />
                    ) : (
                        <img
                            src={fileUrl}
                            alt="Oficio original"
                            className="h-full w-full object-contain"
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

interface SendSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    areas: Area[];
    formData: { a_area_id: string; comentario: string };
    errors: Record<string, string>;
    processing: boolean;
    onFieldChange: (field: string, value: string) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const SendSheet = ({
    open,
    onOpenChange,
    areas,
    formData,
    errors,
    processing,
    onFieldChange,
    onSubmit,
}: SendSheetProps) => (
   <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetTrigger asChild>
        <Button className="bg-blue-600 text-white hover:bg-blue-700" size="sm">
            <Send className="size-4" />
            Enviar a otra área
        </Button>
    </SheetTrigger>

    <SheetContent side="right">
        <SheetHeader>
            <SheetTitle>Enviar oficio</SheetTitle>
            <SheetDescription>
                Selecciona el área de destino y el motivo del envío.
            </SheetDescription>
        </SheetHeader>

        <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={onSubmit}>
            <div className="flex-1 space-y-5 px-5 py-5">

                <div className="space-y-1.5">
                    <Label htmlFor="a_area_id">Área destino</Label>
                    <Select
                        value={formData.a_area_id}
                        onValueChange={(value) => onFieldChange('a_area_id', value)}
                    >
                        <SelectTrigger id="a_area_id" className="w-full">
                            <SelectValue placeholder="Selecciona un área" />
                        </SelectTrigger>
                        <SelectContent>
                            {areas.map((area) => (
                                <SelectItem key={area.id_area} value={String(area.id_area)}>
                                    {area.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.a_area_id && (
                        <p className="text-xs text-red-600">{errors.a_area_id}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="comentario">
                        Comentario / motivo <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        id="comentario"
                        placeholder="Ej: Para revisión, Para firma, etc."
                        required
                        rows={5}
                        value={formData.comentario}
                        onChange={(e) => onFieldChange('comentario', e.target.value)}
                        className="resize-none"
                    />
                    {errors.comentario && (
                        <p className="text-xs text-red-600">{errors.comentario}</p>
                    )}
                </div>

            </div>

            <SheetFooter>
                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                    {processing ? 'Enviando...' : 'Confirmar envío'}
                </Button>
                    <Button type="button" variant="outline" className="w-full">
                        Cancelar
                    </Button>
            </SheetFooter>
        </form>
    </SheetContent>
</Sheet>
);

// ============================================================================
// Main Component
// ============================================================================

export default function Show({
    documento,
    areas,
    movimientos,
    canEnviar,
    userAreaId,
}: Props) {
    const { flash } = usePage().props as {
        flash?: { success?: string | null };
    };

    const page = usePage();
    const queryParams = new URLSearchParams(page.url.split('?')[1] ?? '');

    const canOpenSendSheet = canEnviar && documento.recibido === 'subido';
    const [isSendSheetOpen, setIsSendSheetOpen] = useState<boolean>(
        canOpenSendSheet && queryParams.get('send') === '1',
    );

    const { data, setData, post, processing, errors, reset } = useForm({
        id_documento: documento.id_documento,
        a_area_id: '',
        comentario: '',
    });

    const { patch, processing: processingRecepcion } = useForm({});

    const movimientosGrupos = groupMovimientosByMotivo(movimientos);

    const handleSubmitMovimiento = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        post(storeMovimiento.url(), {
            preserveScroll: true,
            onSuccess: () => reset('a_area_id', 'comentario'),
        });
    };

    const handleReceiveMovimiento = (idMovimiento: number): void => {
        patch(marcarRecibido.url(idMovimiento), { preserveScroll: true });
    };

    const pageTitle = `Oficio ${documento.numero_oficio ?? documento.id_documento}`;

    return (
        <>
            <Head title={pageTitle} />

            <div className="mx-auto w-full max-w-screen-2xl space-y-4 p-4 md:p-6">
                {/* Alert de éxito */}
                {flash?.success && (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Operación completada</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Header con acciones */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl">
                            {documento.numero_oficio ?? `Oficio #${documento.id_documento}`}
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {canOpenSendSheet ? (
                            <SendSheet
                                open={isSendSheetOpen}
                                onOpenChange={setIsSendSheetOpen}
                                areas={areas}
                                formData={data}
                                errors={errors}
                                processing={processing}
                                onFieldChange={setData}
                                onSubmit={handleSubmitMovimiento}
                            />
                        ) : canEnviar ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-not-allowed text-slate-400"
                                title="Este oficio ya fue enviado"
                                disabled
                            >
                                <Send className="mr-2 size-4" />
                                Enviar a otra área
                            </Button>
                        ) : null}

                        <Button asChild variant="outline" size="sm">
                            <Link href={DocumentoController.index.url()}>
                                <ArrowLeft className="mr-2 size-4" />
                                Volver
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Layout de dos columnas: Info + PDF */}
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Columna izquierda: Información del documento */}
                    <div className="lg:col-span-1">
                        <DocumentInfoCard documento={documento} />
                    </div>

                    {/* Columna derecha: PDF Viewer */}
                    <div className="lg:col-span-2">
                        <DocumentViewerCard archivo={documento.archivo} />
                    </div>
                </div>

                {/* Sección inferior: OCR y Trazabilidad */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* OCR Card */}
                    <Card className="flex h-full flex-col border-none">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="size-4 text-muted-foreground" />
                                Texto extraído (OCR)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Contenido detectado automáticamente en el documento
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {documento.contenido_ocr?.trim() ? (
                                <ScrollArea className="h-[280px] rounded-md border bg-muted/20 p-3">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {documento.contenido_ocr}
                                    </p>
                                </ScrollArea>
                            ) : (
                                <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed bg-muted/10">
                                    <div className="text-center">
                                        <FileText className="mx-auto size-8 text-muted-foreground/50" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            No se pudo extraer texto
                                        </p>
                                        <p className="text-xs text-muted-foreground/70">
                                            El archivo no contiene texto reconocible
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Trazabilidad Card */}
                    <Card className="flex h-full flex-col border-none">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <History className="size-4 text-muted-foreground" />
                                Historial de movimientos
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {movimientosGrupos.length > 0
                                    ? `${movimientos.length} movimiento${movimientos.length !== 1 ? 's' : ''} registrado${movimientos.length !== 1 ? 's' : ''}`
                                    : 'Seguimiento del oficio entre áreas'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ScrollArea className="h-[280px] pr-2">
                                {movimientosGrupos.length > 0 ? (
                                    <div className="space-y-3">
                                        {movimientosGrupos.map((grupo) => (
                                            <div
                                                key={grupo.motivo}
                                                className="rounded-lg border bg-card"
                                            >
                                                {/* Cabecera del grupo */}
                                                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            {grupo.movimientos.length}
                                                        </Badge>
                                                        <span className="text-sm font-medium line-clamp-1">
                                                            {grupo.motivo}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        Último: {formatDate(grupo.ultimaFechaEnvio)}
                                                    </span>
                                                </div>

                                                {/* Movimientos del grupo */}
                                                <div className="divide-y">
                                                    {sortMovimientosByDate(grupo.movimientos).map((mov) => (
                                                        <div
                                                            key={mov.id_movimiento}
                                                            className="space-y-2 p-3 hover:bg-muted/20 transition-colors"
                                                        >
                                                            {/* Ruta del movimiento */}
                                                            <div className="flex items-center gap-1.5 text-sm">
                                                                <span className="font-medium text-foreground">
                                                                    {mov.de_area?.nombre ?? '-'}
                                                                </span>
                                                                <ArrowRight className="size-3 text-muted-foreground" />
                                                                <span className="font-medium text-foreground">
                                                                    {mov.a_area?.nombre ?? '-'}
                                                                </span>
                                                                {!mov.fecha_recepcion && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="ml-auto text-[10px]"
                                                                    >
                                                                        Pendiente
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Detalles */}
                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="size-3" />
                                                                    <span>Envío: {formatDate(mov.fecha_envio)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="size-3" />
                                                                    <span>Recepción: {formatDate(mov.fecha_recepcion)}</span>
                                                                </div>
                                                                <div className="col-span-2 flex items-center gap-1">
                                                                    <User className="size-3" />
                                                                    <span className="truncate">
                                                                        {mov.remitente
                                                                            ? formatFullName(
                                                                                  mov.remitente.nombre,
                                                                                  mov.remitente.apellido,
                                                                              )
                                                                            : 'Sistema'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Acciones */}
                                                            {userAreaId === mov.a_area_id && (
                                                                <div className="flex gap-2 pt-1">
                                                                    {!mov.fecha_recepcion && (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs"
                                                                            disabled={processingRecepcion}
                                                                            onClick={() => handleReceiveMovimiento(mov.id_movimiento)}
                                                                        >
                                                                            <CheckCircle className="mr-1 size-3" />
                                                                            Marcar recibido
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        asChild
                                                                        type="button"
                                                                        size="sm"
                                                                        className="h-7 bg-blue-600 text-xs hover:bg-blue-700"
                                                                    >
                                                                        <Link href={responderMovimiento.url(mov.id_movimiento)}>
                                                                            <Reply className="mr-1 size-3" />
                                                                            Responder
                                                                        </Link>
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed bg-muted/10">
                                        <div className="text-center">
                                            <History className="mx-auto size-8 text-muted-foreground/50" />
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Sin movimientos registrados
                                            </p>
                                            <p className="text-xs text-muted-foreground/70">
                                                El oficio aún no ha sido enviado a otras áreas
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
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
