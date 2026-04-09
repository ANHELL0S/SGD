import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    deletedIndex as deletedDocumentosIndex,
    restore as restoreDocumento,
} from '@/actions/App/Http/Controllers/User/DocumentoController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Remitente = {
    id_remitente: number;
    nombre: string;
};

type DocumentoEliminado = {
    id_documento: number;
    numero_oficio: string | null;
    fecha_oficio: string | null;
    palabra_clave: string | null;
    tipo: string;
    recibido: string;
    deleted_at: string | null;
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
};

type FilterState = {
    palabra_clave: string;
    remitente_id: string;
    tipo: string;
    recibido: string;
    per_page: string;
};

type PaginationLinkItem = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedDocumentos = {
    data: DocumentoEliminado[];
    links: PaginationLinkItem[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    documentos: PaginatedDocumentos;
    remitentes: Remitente[];
    filters: FilterState;
};

const defaultFilters: FilterState = {
    palabra_clave: '',
    remitente_id: '',
    tipo: '',
    recibido: '',
    per_page: '5',
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

export default function Eliminados({ documentos, remitentes, filters }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string | null } };
    const [documentoToRestore, setDocumentoToRestore] = useState<DocumentoEliminado | null>(null);
    const { data, setData } = useForm<FilterState>({
        ...defaultFilters,
        ...filters,
    });
    const { patch, processing } = useForm({});

    const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(deletedDocumentosIndex.url(), {
            ...data,
            page: 1,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        const clearedFilters = {
            ...defaultFilters,
            per_page: data.per_page,
        };

        setData(clearedFilters);

        router.get(deletedDocumentosIndex.url(), {
            ...clearedFilters,
            page: 1,
        }, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });
    };

    const goToPaginationUrl = (url: string | null): void => {
        if (!url) {
            return;
        }

        router.visit(url, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const changePerPage = (value: string): void => {
        setData('per_page', value);

        router.get(deletedDocumentosIndex.url(), {
            ...data,
            per_page: value,
            page: 1,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const paginationLinks = documentos.links ?? [];
    const previousLink = paginationLinks[0] ?? null;
    const nextLink = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks = paginationLinks.slice(1, -1);

    const confirmRestore = () => {
        if (!documentoToRestore) {
            return;
        }

        patch(restoreDocumento.url(documentoToRestore.id_documento), {
            preserveScroll: true,
            onSuccess: () => {
                setDocumentoToRestore(null);
            },
        });
    };

    return (
        <>
            <Head title="Oficios eliminados" />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold">Oficios eliminados</h1>
                    <p className="text-sm text-muted-foreground">
                        Los oficios en esta lista estan bloqueados y solo pueden volver a estar disponibles cuando se restauren.
                    </p>
                </div>

                {flash?.success && (
                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Operacion completada</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>Filtra oficios eliminados por remitente, tipo, estado y palabra clave.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={applyFilters}>
                            <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-500">Tipo</Label>
                                    <Select value={data.tipo} onValueChange={(value) => setData('tipo', value)}>
                                        <SelectTrigger className="h-9 w-full bg-background text-[13px]">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="interno">Interno</SelectItem>
                                            <SelectItem value="externo">Externo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-500">Remitente</Label>
                                    <Select value={data.remitente_id} onValueChange={(value) => setData('remitente_id', value)}>
                                        <SelectTrigger className="h-9 w-full bg-background text-[13px]">
                                            <SelectValue placeholder="Remitentes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {remitentes.map((remitente) => (
                                                <SelectItem key={remitente.id_remitente} value={String(remitente.id_remitente)}>
                                                    {remitente.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-500">Estado</Label>
                                    <Select value={data.recibido} onValueChange={(value) => setData('recibido', value)}>
                                        <SelectTrigger className="h-9 w-full bg-background text-[13px]">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="subido">Subido</SelectItem>
                                            <SelectItem value="recibido">Recibido</SelectItem>
                                            <SelectItem value="enviado">Enviado</SelectItem>
                                            <SelectItem value="en_revision">En revision</SelectItem>
                                            <SelectItem value="aprobado">Aprobado</SelectItem>
                                            <SelectItem value="rechazado">Rechazado</SelectItem>
                                            <SelectItem value="respondido">Respondido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="palabra_clave" className="text-xs font-medium text-slate-500">Palabra clave</Label>
                                    <Input
                                        id="palabra_clave"
                                        placeholder="Buscar..."
                                        value={data.palabra_clave}
                                        onChange={(event) => setData('palabra_clave', event.target.value)}
                                        className="h-9 text-[13px]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="submit" className="h-9 bg-blue-600 px-4 text-[13px] text-white shadow-sm hover:bg-blue-700">Aplicar</Button>
                                <Button type="button" variant="outline" onClick={clearFilters} className="h-9 px-4 text-[13px]">Limpiar</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Oficios eliminados</CardTitle>
                        <CardDescription>
                            Mientras un oficio permanezca eliminado, queda bloqueado y no puede ser gestionado por el usuario.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-slate-500">
                                    Mostrar
                                </Label>
                                <Select
                                    value={data.per_page}
                                    onValueChange={changePerPage}
                                >
                                    <SelectTrigger className="h-8 w-[96px] text-[13px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="7">7</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-3">
                                <p className="text-xs text-muted-foreground">
                                    {documentos.total > 0
                                        ? `${documentos.from ?? 0}-${documentos.to ?? 0} de ${documentos.total}`
                                        : '0 resultados'}
                                </p>
                                <Pagination className="mx-0 w-auto justify-end">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={previousLink?.url ?? '#'}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    goToPaginationUrl(previousLink?.url ?? null);
                                                }}
                                                className={!previousLink?.url ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>

                                        {pageLinks.map((link) => (
                                            <PaginationItem key={`${link.label}-${link.url ?? 'null'}`}>
                                                <PaginationLink
                                                    href={link.url ?? '#'}
                                                    isActive={link.active}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        goToPaginationUrl(link.url);
                                                    }}
                                                    className={!link.url ? 'pointer-events-none opacity-50' : ''}
                                                >
                                                    {link.label
                                                        .replace('&laquo;', '')
                                                        .replace('&raquo;', '')
                                                        .replace('pagination.previous', 'Anterior')
                                                        .replace('pagination.next', 'Siguiente')}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        <PaginationItem>
                                            <PaginationNext
                                                href={nextLink?.url ?? '#'}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    goToPaginationUrl(nextLink?.url ?? null);
                                                }}
                                                className={!nextLink?.url ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No. Oficio</TableHead>
                                    <TableHead>Dueño</TableHead>
                                    <TableHead>Remitente</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha oficio</TableHead>
                                    <TableHead>Eliminado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documentos.data.length > 0 ? (
                                    documentos.data.map((documento) => (
                                        <TableRow key={documento.id_documento} className="bg-slate-100 text-slate-500">
                                            <TableCell className="font-medium">{documento.numero_oficio || '-'}</TableCell>
                                            <TableCell>
                                                {documento.user
                                                    ? `${documento.user.nombre} ${documento.user.apellido} (${documento.user.area?.nombre ?? 'Sin area'})`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>{documento.remitente?.nombre || '-'}</TableCell>
                                            <TableCell className="capitalize">{documento.tipo}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-200 text-slate-700 font-semibold capitalize">
                                                    {documento.recibido.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatDate(documento.fecha_oficio)}</TableCell>
                                            <TableCell>{formatDate(documento.deleted_at)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={processing}
                                                    onClick={() => setDocumentoToRestore(documento)}
                                                >
                                                    Restaurar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                                            No hay oficios eliminados por el momento.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={documentoToRestore !== null} onOpenChange={(open) => !open && setDocumentoToRestore(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restaurar oficio</AlertDialogTitle>
                        <AlertDialogDescription>
                            El oficio {documentoToRestore?.numero_oficio ?? 'sin numero'} volvera a estar activo para su usuario.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRestore}>Restaurar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
