import { Link, useForm } from '@inertiajs/react';
import { Eye, Pencil, SendHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { show as documentoShow } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { edit as editDocumento } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { destroy as destroyDocumentoAction } from '@/actions/App/Http/Controllers/User/DocumentoController';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export type DocumentoListado = {
    id_documento: number;
    numero_oficio: string | null;
    fecha_oficio: string | null;
    palabra_clave: string | null;
    area_actual_id: number | null;
    user_id: number | null;
    user: {
        nombre: string;
        apellido: string;
        area: {
            nombre: string;
        } | null;
    } | null;
    remitente: {
        nombre: string;
    } | null;
    asunto: string | null;
    tipo: string;
    recibido: string;
};

type Props = {
    documentos: DocumentoListado[];
    canDelete: boolean;
    isAdmin: boolean;
    currentUserId: number | null;
    currentUserAreaId: number | null;
};

const PROJECT_TIME_ZONE = 'America/Guayaquil';

function formatDate(value: string | null): string {
    if (!value) return '-';
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (isDateOnly) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
            timeZone: PROJECT_TIME_ZONE,
        });
    }
    return new Date(value).toLocaleDateString('es-ES', {
        timeZone: PROJECT_TIME_ZONE,
    });
}

function getTypeColor(type: string): string {
    switch (type.toLowerCase()) {
        case 'interno':
            return 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5  font-bold text-chart-4 shadow-sm backdrop-blur-sm';
        case 'externo':
            return 'border-primary/30 bg-primary/10 px-2.5 py-0.5  font-bold text-primary shadow-sm backdrop-blur-sm';
        default:
            return 'border-muted-foreground/30 bg-muted-foreground/10 px-2.5 py-0.5  font-bold text-muted-foreground shadow-sm backdrop-blur-sm';
    }
}

function getUserInitials(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export default function DataTable({
    documentos,
    canDelete,
    isAdmin,
    currentUserId,
    currentUserAreaId,
}: Props) {
    const [documentoToDelete, setDocumentoToDelete] =
        useState<DocumentoListado | null>(null);
    const {
        delete: destroyDocumento,
        processing,
        clearErrors,
    } = useForm<{ documento?: string }>({});

    const confirmDelete = (): void => {
        if (!documentoToDelete) return;
        destroyDocumento(
            destroyDocumentoAction.url(documentoToDelete.id_documento),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDocumentoToDelete(null);
                    clearErrors();
                    toast.success('El oficio fue eliminado correctamente.');
                },
                onError: (errors) => {
                    toast.error(
                        errors.documento ?? 'No se pudo eliminar el oficio.',
                    );
                },
            },
        );
    };

    const canSendDoc = (documento: DocumentoListado): boolean =>
        !isAdmin &&
        currentUserAreaId !== null &&
        documento.area_actual_id === currentUserAreaId;

    const canDeleteDoc = (documento: DocumentoListado): boolean =>
        isAdmin || documento.user_id === currentUserId;

    return (
        <>
            {/* ── Móvil: tarjetas ────────────────────────────────────────── */}
            <div className="space-y-2 md:hidden">
                {documentos.length > 0 ? (
                    documentos.map((documento, index) => (
                        <div
                            key={documento.id_documento}
                            className="animate-fade-in-row space-y-2.5 rounded-lg border bg-card p-3"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Cabecera: usuario + tipo */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {documento.user ? (
                                        <>
                                            <Avatar className="size-7 shrink-0">
                                                <AvatarFallback className="bg-blue-100 text-[10px] text-blue-700">
                                                    {getUserInitials(
                                                        documento.user.nombre,
                                                        documento.user.apellido,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-[12px] font-medium text-foreground">
                                                    {documento.user.nombre}{' '}
                                                    {documento.user.apellido}
                                                </p>
                                                <p className="truncate text-[10px] text-muted-foreground">
                                                    {documento.user.area
                                                        ?.nombre ?? 'Sin área'}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <span className=" text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] capitalize ${getTypeColor(documento.tipo)}`}
                                    >
                                        {documento.tipo}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatDate(documento.fecha_oficio)}
                                    </span>
                                </div>
                            </div>

                            {/* Referencia */}
                            <div className="min-w-0">
                                <p className="truncate text-[12px] font-medium text-foreground">
                                    {documento.palabra_clave ||
                                        documento.numero_oficio ||
                                        '—'}
                                </p>
                                {documento.asunto && (
                                    <p className="truncate text-[10px] text-muted-foreground">
                                        {documento.asunto}
                                    </p>
                                )}
                                {documento.remitente && (
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                                        Remitente: {documento.remitente.nombre}
                                    </p>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-1.5 border-t pt-2">
                                <Button
                                    asChild
                                    size="sm"
                                    variant="ghost"
                                    className=" h-8 flex-1 text-blue-600 hover:bg-blue-50"
                                    title="Ver oficio"
                                >
                                    <Link
                                        href={documentoShow(
                                            documento.id_documento,
                                        )}
                                    >
                                        <Eye className="size-3.5" />
                                        Ver
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    variant="ghost"
                                    className=" h-8 flex-1 text-[var(--secondary-foreground)]/70 hover:bg-[var(--secondary-foreground)]/10"
                                    title="Editar oficio"
                                >
                                    <Link
                                        href={editDocumento(
                                            documento.id_documento,
                                        )}
                                    >
                                        <Pencil className="size-3.5" />
                                        Editar
                                    </Link>
                                </Button>
                                {canDelete &&
                                    (canDeleteDoc(documento) ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className=" h-8 flex-1 text-red-500 hover:bg-red-50"
                                            disabled={processing}
                                            onClick={() =>
                                                setDocumentoToDelete(documento)
                                            }
                                        >
                                            <Trash2 className="size-3.5" />
                                            Eliminar
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className=" h-8 flex-1 text-[var(--secondary-foreground)]/30"
                                            disabled
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    ))}
                                {!isAdmin &&
                                    (canSendDoc(documento) ? (
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="ghost"
                                            className=" h-8 flex-1 text-blue-600 hover:bg-blue-50"
                                            title="Enviar oficio"
                                        >
                                            <Link
                                                href={documentoShow.url(
                                                    documento.id_documento,
                                                    { query: { send: '1' } },
                                                )}
                                            >
                                                <SendHorizontal className="size-3.5" />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className=" h-8 flex-1 text-[var(--secondary-foreground)]/30"
                                            disabled
                                            title="No está en tu área actual"
                                        >
                                            <SendHorizontal className="size-3.5" />
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="py-10 text-center text-[12px] text-muted-foreground">
                        No has subido documentos todavía.
                    </p>
                )}
            </div>

            {/* ── Desktop: tabla ─────────────────────────────────────────── */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[var(--card background)]">
                            {/* Agregado text-center a todos los headers */}
                            <TableHead className="text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                Fecha
                            </TableHead>
                            <TableHead className="text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                Subido por
                            </TableHead>
                            <TableHead className="text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                Referencia
                            </TableHead>
                            <TableHead className="text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                Tipo
                            </TableHead>
                            <TableHead className="text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                Remitente
                            </TableHead>
                            <TableHead className="w-[120px] text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                Acciones
                            </TableHead>
                            {!isAdmin && (
                                <TableHead className="text-center text-[12px] font-semibold tracking-wide text-[var(--secondary-foreground)]/80 uppercase">
                                    Enviar
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documentos.length > 0 ? (
                            documentos.map((documento, index) => (
                                <TableRow
                                    key={documento.id_documento}
                                    className="animate-fade-in-row hover:bg-[var(--card background)]/60"
                                    style={{ animationDelay: `${index * 55}ms` }}
                                >
                                    {/* 1. Fecha centrada */}
                                    <TableCell className="text-center text-[12px] text-[var(--secondary-foreground)]/50">
                                        {formatDate(documento.fecha_oficio)}
                                    </TableCell>

                                    {/* 2. Subido por: flex con justify-center */}
                                    <TableCell className="min-w-[220px]">
                                        {documento.user ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarFallback className="bg-[var(--primary 100)] text-[10px] text-[var(--primary)]">
                                                        {getUserInitials(
                                                            documento.user
                                                                .nombre,
                                                            documento.user
                                                                .apellido,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="text-left">
                                                    {' '}
                                                    {/* El texto interno queda mejor alineado a la izquierda del avatar */}
                                                    <p className="truncate text-[12px] font-medium text-foreground">
                                                        {documento.user.nombre}{' '}
                                                        {
                                                            documento.user
                                                                .apellido
                                                        }
                                                    </p>
                                                    <p className="truncate text-[12px] text-muted-foreground">
                                                        {documento.user.area
                                                            ?.nombre ??
                                                            'Sin área'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">-</div>
                                        )}
                                    </TableCell>

                                    {/* 3. Referencia centrada */}
                                    <TableCell className="max-w-[180px] text-center">
                                        <div className="mx-auto min-w-0">
                                            <p className="truncate text-[12px] text-[var(--secondary-foreground)]">
                                                {documento.palabra_clave || '-'}
                                            </p>
                                            <p className="truncate text-[12px] text-[var(--secondary-foreground)]/50">
                                                {documento.asunto}
                                            </p>
                                        </div>
                                    </TableCell>

                                    {/* 4. Tipo centrado */}
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className={`capitalize ${getTypeColor(documento.tipo)}`}
                                        >
                                            {documento.tipo}
                                        </Badge>
                                    </TableCell>

                                    {/* 5. Remitente centrado - Ajustado para emparejar */}
                                    <TableCell className="text-center">
                                        <div className="flex min-h-[40px] flex-col justify-center">
                                            <p className="truncate text-[12px] text-[var(--secondary-foreground)]/70">
                                                {documento.remitente?.nombre ||
                                                    '-'}
                                            </p>
                                            {/* Espaciador invisible para mantener la misma altura que Referencia si no hay segunda línea */}
                                            <span className="block text-[11px] leading-none">
                                                &nbsp;
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* 6. Acciones: Cambiado de justify-end a justify-center */}
                                    <TableCell>
                                        <div className="flex justify-center gap-1">
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                className="size-8 text-blue-600 hover:text-blue-700"
                                            >
                                                <Link
                                                    href={documentoShow(
                                                        documento.id_documento,
                                                    )}
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                className="size-8 text-[var(--secondary-foreground)]/70 hover:text-[var(--secondary-foreground)]/90"
                                            >
                                                <Link
                                                    href={editDocumento(
                                                        documento.id_documento,
                                                    )}
                                                >
                                                    <Pencil className="size-4" />
                                                </Link>
                                            </Button>
                                            {canDelete &&
                                                (canDeleteDoc(documento) ? (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 text-red-500 hover:text-red-600"
                                                        disabled={processing}
                                                        onClick={() =>
                                                            setDocumentoToDelete(
                                                                documento,
                                                            )
                                                        }
                                                        title="Eliminar oficio"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 text-[var(--secondary-foreground)] cursor-not-allowed"
                                                        disabled
                                                        title="No puedes eliminar este oficio"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                ))}
                                        </div>
                                    </TableCell>

                                    {/* 7. Enviar centrado */}
                                    {!isAdmin && (
                                        <TableCell>
                                            <div className="flex justify-center">
                                                {canSendDoc(documento) ? (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 text-blue-600 hover:text-blue-700"
                                                        title="Enviar oficio"
                                                    >
                                                        <Link
                                                            href={documentoShow.url(
                                                                documento.id_documento,
                                                                { query: { send: '1' } },
                                                            )}
                                                        >
                                                            <SendHorizontal className="size-4" />
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 cursor-not-allowed text-muted-foreground/30"
                                                        disabled
                                                        title="El oficio no está en tu área actual"
                                                    >
                                                        <SendHorizontal className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={isAdmin ? 6 : 7}
                                    className="py-10 text-center text-[12px] text-muted-foreground"
                                >
                                    No has subido documentos todavía.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog
                open={documentoToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDocumentoToDelete(null);
                        clearErrors();
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirmar eliminacion
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminara el oficio{' '}
                            {documentoToDelete?.numero_oficio ?? 'sin numero'}.
                            Esta accion lo movera a eliminados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={confirmDelete}
                        >
                            Eliminar oficio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
