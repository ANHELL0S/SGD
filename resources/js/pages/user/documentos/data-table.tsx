import { Link, useForm } from '@inertiajs/react';
import { Eye, Pencil, SendHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
    tipo: string;
    recibido: string;
};

type Props = {
    documentos: DocumentoListado[];
    canDelete: boolean;
    currentUserId: number | null;
};

const PROJECT_TIME_ZONE = 'America/Guayaquil';

function formatDate(value: string | null): string {
    if (!value) {
        return '-';
    }

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
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
        case 'interno':
            return 'border-emerald-200 bg-emerald-100 text-emerald-800';
        case 'externo':
            return 'border-blue-200 bg-blue-100 text-blue-800';
        default:
            return 'border-slate-200 bg-slate-100 text-slate-800';
    }
}

function getUserInitials(nombre: string, apellido: string): string {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

export default function DataTable({
    documentos,
    canDelete,
    currentUserId,
}: Props) {
    const [documentoToDelete, setDocumentoToDelete] =
        useState<DocumentoListado | null>(null);
    const { delete: destroyDocumento, processing } = useForm({});

    const confirmDelete = (): void => {
        if (!documentoToDelete) {
            return;
        }

        destroyDocumento(
            destroyDocumentoAction.url(documentoToDelete.id_documento),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDocumentoToDelete(null);
                },
            },
        );
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Subido por</TableHead>
                        <TableHead>Palabra clave</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Remitente</TableHead>
                        <TableHead className="text-center w-[120px]">
                            Acciones
                        </TableHead>
                        <TableHead>Enviar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documentos.length > 0 ? (
                        documentos.map((documento) => (
                            <TableRow key={documento.id_documento}>
                                <TableCell>
                                    {formatDate(documento.fecha_oficio)}
                                </TableCell>
                                <TableCell className="min-w-[220px]">
                                    {documento.user ? (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-8">
                                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                                    {getUserInitials(
                                                        documento.user.nombre,
                                                        documento.user.apellido,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {documento.user.nombre}{' '}
                                                    {documento.user.apellido}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {documento.user.area
                                                        ?.nombre ?? 'Sin area'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>
                                <TableCell>
                                    {documento.palabra_clave || '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={`capitalize ${getTypeColor(documento.tipo)}`}
                                    >
                                        {documento.tipo}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {documento.remitente?.nombre || '-'}
                                </TableCell>
                                {/* Columna de Acciones (Ver, Editar, Eliminar) */}
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* Ver */}
                                        <Button
                                            asChild
                                            size="icon"
                                            variant="ghost"
                                            className="text-blue-600 hover:text-blue-700"
                                            title="Ver oficio"
                                        >
                                            <Link
                                                href={documentoShow(
                                                    documento.id_documento,
                                                )}
                                            >
                                                <Eye className="size-4" />
                                                <span className="sr-only">
                                                    Ver oficio
                                                </span>
                                            </Link>
                                        </Button>

                                        {/* Editar */}
                                        <Button
                                            asChild
                                            size="icon"
                                            variant="ghost"
                                            className="text-slate-600 hover:text-slate-700"
                                            title="Editar oficio"
                                        >
                                            <Link
                                                href={editDocumento(
                                                    documento.id_documento,
                                                )}
                                            >
                                                <Pencil className="size-4" />
                                                <span className="sr-only">
                                                    Editar oficio
                                                </span>
                                            </Link>
                                        </Button>

                                        {/* Eliminar (Lógica condicional) */}
                                        {canDelete && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className={
                                                    documento.user_id ===
                                                    currentUserId
                                                        ? 'text-red-600 hover:text-red-700'
                                                        : 'cursor-not-allowed text-slate-400 hover:text-slate-400'
                                                }
                                                title={
                                                    documento.user_id ===
                                                    currentUserId
                                                        ? 'Eliminar oficio'
                                                        : 'No puedes eliminar un oficio que no es tuyo'
                                                }
                                                disabled={
                                                    (processing &&
                                                        documento.user_id ===
                                                            currentUserId) ||
                                                    documento.user_id !==
                                                        currentUserId
                                                }
                                                onClick={() =>
                                                    documento.user_id ===
                                                        currentUserId &&
                                                    setDocumentoToDelete(
                                                        documento,
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                <span className="sr-only">
                                                    Eliminar
                                                </span>
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>

                                {/* Columna de Enviar */}
                                <TableCell>
                                    <div className="flex justify-center">
                                        {documento.recibido === 'subido' ? (
                                            <Button
                                                asChild
                                                size="icon"
                                                variant="ghost"
                                                className="text-blue-600 hover:text-blue-700"
                                                title="Enviar oficio"
                                            >
                                                <Link
                                                    href={documentoShow.url(
                                                        documento.id_documento,
                                                        {
                                                            query: {
                                                                send: '1',
                                                            },
                                                        },
                                                    )}
                                                >
                                                    <SendHorizontal className="size-4" />
                                                    <span className="sr-only">
                                                        Enviar
                                                    </span>
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="cursor-not-allowed text-slate-400"
                                                title="Este oficio ya fue enviado y no se puede reenviar."
                                                disabled
                                            >
                                                <SendHorizontal className="size-4" />
                                                <span className="sr-only">
                                                    Bloqueado
                                                </span>
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="py-10 text-center text-muted-foreground"
                            >
                                No has subido documentos todavia.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <AlertDialog
                open={documentoToDelete !== null}
                onOpenChange={(open) => !open && setDocumentoToDelete(null)}
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
