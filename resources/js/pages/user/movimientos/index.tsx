import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CheckCircle,
    Clock3,
    MessageSquare,
    Reply,
    User,
} from 'lucide-react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import MovimientoController, {
    marcarRecibido,
    responder as responderMovimiento,
} from '@/actions/App/Http/Controllers/User/MovimientoController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { dashboard } from '@/routes';

type MovimientoItem = {
    id_movimiento: number;
    documento: {
        id_documento: number | null;
        numero_oficio: string | null;
        palabra_clave: string | null;
        tipo: string | null;
        recibido: string | null;
        documento_padre_id: number | null;
        padre: {
            id_documento: number | null;
            numero_oficio: string | null;
        } | null;
    } | null;
    de_area: { nombre: string | null } | null;
    a_area: { nombre: string | null } | null;
    remitente: {
        nombre: string | null;
        apellido: string | null;
        area: { nombre: string | null } | null;
    } | null;
    comentario: string | null;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    direccion: 'salida' | 'entrada';
    estado: 'pendiente' | 'recibido';
    respuesta_enviada: boolean;
    puede_marcar_recibido: boolean;
    puede_responder: boolean;
};

type MotivoGroup = {
    motivo: string;
    total_movimientos: number;
    salidas: number;
    entradas: number;
    pendientes: number;
    recibidos: number;
    ultima_fecha_envio: string | null;
    movimientos: MovimientoItem[];
};

type Resumen = {
    motivos: number;
    total: number;
    salidas: number;
    entradas: number;
    pendientes: number;
    recibidos: number;
};

type Props = {
    motivos: MotivoGroup[];
    resumen: Resumen;
};

const PROJECT_TIME_ZONE = 'America/Guayaquil';

function formatDateTime(value: string | null): string {
    if (!value) {
return '-';
}

    return new Date(value).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: PROJECT_TIME_ZONE,
    });
}

function getDirectionLabel(direccion: MovimientoItem['direccion']): string {
    return direccion === 'salida' ? 'Salida' : 'Entrada';
}

function getStatusLabel(estado: MovimientoItem['estado']): string {
    return estado === 'recibido' ? 'Recibido' : 'Pendiente';
}

function getStatusClasses(estado: MovimientoItem['estado']): string {
    return estado === 'recibido'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-amber-200 bg-amber-50 text-amber-800';
}

function getDirectionClasses(direccion: MovimientoItem['direccion']): string {
    return direccion === 'salida'
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : 'border-purple-200 bg-purple-50 text-purple-800';
}

function getFullName(nombre: string | null, apellido: string | null): string {
    return [nombre, apellido].filter(Boolean).join(' ') || '-';
}

function getOficioIdentifier(documento: MovimientoItem['documento']): string {
    if (!documento) {
return '-';
}

    return documento.numero_oficio ?? `#${documento.id_documento ?? '-'}`;
}

function getOficioTitle(movimiento: MovimientoItem): string {
    const documento = movimiento.documento;

    if (!documento) {
return `Movimiento #${movimiento.id_movimiento}`;
}

    const padreNumero = documento.padre?.numero_oficio;
    const padreId = documento.padre?.id_documento;

    if (documento.documento_padre_id && (padreNumero || padreId)) {
        return `Respuesta de oficio ${padreNumero ?? `#${padreId}`}`;
    }

    return `Oficio ${getOficioIdentifier(documento)}`;
}

export default function Index({ motivos, resumen }: Props) {
    const { flash } = usePage().props as {
        flash?: { success?: string | null };
    };

    const { patch, processing } = useForm({});

    const markAsReceived = (idMovimiento: number): void => {
        patch(marcarRecibido.url(idMovimiento), { preserveScroll: true });
    };

    return (
        <>
            <Head title="Mis movimientos" />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Mis movimientos
                        </h2>
                    </div>

                    {resumen.total > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant="outline"
                                className="border-blue-200 bg-blue-50 text-blue-700"
                            >
                                {resumen.salidas} salidas
                            </Badge>
                            <Badge
                                variant="outline"
                                className="border-purple-200 bg-purple-50 text-purple-700"
                            >
                                {resumen.entradas} entradas
                            </Badge>
                            {resumen.pendientes > 0 && (
                                <Badge
                                    variant="outline"
                                    className="border-amber-200 bg-amber-50 text-amber-700"
                                >
                                    {resumen.pendientes} pendientes
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                {flash?.success && (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                        <CheckCircle className="size-4" />
                        <AlertTitle>Operación completada</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {/* Grupos */}
                <div className="space-y-6">
                    {motivos.length > 0 ? (
                        motivos.map((grupo) => (
                            <div
                                key={`${grupo.motivo}-${grupo.ultima_fecha_envio ?? ''}`}
                            >
                                {/* Cabecera del grupo */}
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        {grupo.motivo}
                                    </span>
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-xs text-muted-foreground">
                                        {grupo.total_movimientos} mov. ·{' '}
                                        {formatDateTime(
                                            grupo.ultima_fecha_envio,
                                        )}
                                    </span>
                                </div>

                                {/* Movimientos */}
                                <div className="space-y-2">
                                    {[...grupo.movimientos]
                                        .sort((a, b) => {
                                            const dateA = a.fecha_envio
                                                ? new Date(
                                                      a.fecha_envio,
                                                  ).getTime()
                                                : 0;
                                            const dateB = b.fecha_envio
                                                ? new Date(
                                                      b.fecha_envio,
                                                  ).getTime()
                                                : 0;

                                            return (
                                                dateB - dateA ||
                                                b.id_movimiento -
                                                    a.id_movimiento
                                            );
                                        })
                                        .map((movimiento) => (
                                            <div
                                                key={movimiento.id_movimiento}
                                                className={`rounded-lg border p-4 transition-colors ${
                                                    movimiento.direccion ===
                                                    'entrada'
                                                        ? 'border-blue-100 bg-blue-50/60 hover:bg-blue-50'
                                                        : 'bg-white hover:bg-muted/5'
                                                }`}
                                            >
                                                {' '}
                                                {/* Fila superior: título + acciones */}
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-medium">
                                                                {getOficioTitle(
                                                                    movimiento,
                                                                )}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className={getDirectionClasses(
                                                                    movimiento.direccion,
                                                                )}
                                                            >
                                                                {getDirectionLabel(
                                                                    movimiento.direccion,
                                                                )}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={getStatusClasses(
                                                                    movimiento.estado,
                                                                )}
                                                            >
                                                                {getStatusLabel(
                                                                    movimiento.estado,
                                                                )}
                                                            </Badge>
                                                            {movimiento.respuesta_enviada && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                >
                                                                    Respondido
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {getOficioIdentifier(
                                                                movimiento.documento,
                                                            )}
                                                            {movimiento
                                                                .documento
                                                                ?.palabra_clave &&
                                                                ` · ${movimiento.documento.palabra_clave}`}
                                                            {' · '}
                                                            {formatDateTime(
                                                                movimiento.fecha_envio,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 gap-1.5">
                                                        {movimiento.documento
                                                            ?.id_documento && (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-xs text-blue-600 hover:text-blue-700"
                                                            >
                                                                <Link
                                                                    href={DocumentoController.show.url(
                                                                        movimiento
                                                                            .documento
                                                                            .id_documento,
                                                                    )}
                                                                >
                                                                    Ver
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        {movimiento.puede_marcar_recibido && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() =>
                                                                    markAsReceived(
                                                                        movimiento.id_movimiento,
                                                                    )
                                                                }
                                                                disabled={
                                                                    processing
                                                                }
                                                                className="h-8 bg-green-600 text-xs text-white hover:bg-green-700"
                                                            >
                                                                Marcar como
                                                                recibido
                                                            </Button>
                                                        )}
                                                        {movimiento.puede_responder && (
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
                                                            >
                                                                <Link
                                                                    href={responderMovimiento.url(
                                                                        movimiento.id_movimiento,
                                                                    )}
                                                                >
                                                                    <Reply className="size-3" />
                                                                    Responder
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Fila inferior: ruta + remitente + comentario */}
                                                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <Building2 className="size-3.5 shrink-0" />
                                                        <span>
                                                            {movimiento.de_area
                                                                ?.nombre ??
                                                                '-'}{' '}
                                                            →{' '}
                                                            {movimiento.a_area
                                                                ?.nombre ?? '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="size-3.5 shrink-0" />
                                                        <span>
                                                            {getFullName(
                                                                movimiento
                                                                    .remitente
                                                                    ?.nombre ??
                                                                    null,
                                                                movimiento
                                                                    .remitente
                                                                    ?.apellido ??
                                                                    null,
                                                            )}
                                                            {movimiento
                                                                .remitente?.area
                                                                ?.nombre &&
                                                                ` · ${movimiento.remitente.area.nombre}`}
                                                        </span>
                                                    </div>
                                                    {movimiento.comentario?.trim() && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MessageSquare className="size-3.5 shrink-0" />
                                                            <span className="line-clamp-1">
                                                                {movimiento.comentario.trim()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {movimiento.fecha_recepcion && (
                                                        <div className="flex items-center gap-1.5">
                                                            <CheckCircle className="size-3.5 shrink-0 text-emerald-600" />
                                                            <span>
                                                                Recibido:{' '}
                                                                {formatDateTime(
                                                                    movimiento.fecha_recepcion,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-lg border border-dashed bg-muted/20 p-12 text-center">
                            <MessageSquare className="mx-auto size-8 text-muted-foreground/40" />
                            <p className="mt-3 text-sm font-medium text-muted-foreground">
                                No tienes movimientos registrados
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                                Los oficios que envíes o recibas aparecerán aquí
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
Index.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Mis movimientos',
            href: MovimientoController.index.url(),
        },
    ],
};
