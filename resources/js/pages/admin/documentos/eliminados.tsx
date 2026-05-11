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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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

import { Separator } from '@/components/ui/separator';
import { Search } from 'lucide-react';
import { RotateCcw, Filter, Calendar } from 'lucide-react';

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
    const { flash } = usePage().props as {
        flash?: { success?: string | null };
    };
    const [documentoToRestore, setDocumentoToRestore] =
        useState<DocumentoEliminado | null>(null);
    const { data, setData } = useForm<FilterState>({
        ...defaultFilters,
        ...filters,
    });
    const { patch, processing } = useForm({});

    const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            deletedDocumentosIndex.url(),
            {
                ...data,
                page: 1,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        const clearedFilters = {
            ...defaultFilters,
            per_page: data.per_page,
        };

        setData(clearedFilters);

        router.get(
            deletedDocumentosIndex.url(),
            {
                ...clearedFilters,
                page: 1,
            },
            {
                preserveScroll: true,
                preserveState: false,
                replace: true,
            },
        );
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

        router.get(
            deletedDocumentosIndex.url(),
            {
                ...data,
                per_page: value,
                page: 1,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const paginationLinks = documentos.links ?? [];
    const previousLink = paginationLinks[0] ?? null;
    const nextLink = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks = paginationLinks.slice(1, -1);

    const statusLabel = (value: string): string => {
        return value.replace('_', ' ');
    };

    const getTypeColor = (type: string): string => {
        const normalizedType = type.toLowerCase();

        switch (normalizedType) {
            case 'interno':
                return 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm';
            case 'externo':
                return 'border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm';
            default:
                return 'border-muted-foreground/30 bg-muted-foreground/10 px-2.5 py-0.5 text-xs font-bold text-muted-foreground shadow-sm backdrop-blur-sm';
        }
    };

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

            <div className="mx-auto w-full  p-2 ">
                <Card className="w-full border-none bg-transparent shadow-none">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <div className='space-y-1'>
                                <h1 className="text-xl leading-tight font-semibold">
                                    Oficios eliminados
                                </h1>
                                <p className='text-muted-foreground text-xs'>Puedes restaurar oficios eliminados en cualquier momento.</p>
                            </div>
                        </div>

                        {flash?.success && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                                <AlertTitle>Operacion completada</AlertTitle>
                                <AlertDescription>
                                    {flash.success}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardHeader>

                    <CardContent>
                        {/* Filtros */}
                        <form onSubmit={applyFilters} >
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Tipo */}
                                <Select
                                    value={data.tipo}
                                    onValueChange={(value) =>
                                        setData('tipo', value)
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[110px] rounded-md border-border/50 bg-background text-[12px] shadow-none focus:ring-1">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="interno"
                                            className="text-[12px]"
                                        >
                                            Interno
                                        </SelectItem>
                                        <SelectItem
                                            value="externo"
                                            className="text-[12px]"
                                        >
                                            Externo
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Remitente */}
                                <Select
                                    value={data.remitente_id}
                                    onValueChange={(value) =>
                                        setData('remitente_id', value)
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[150px] rounded-md border-border/50 bg-background text-[12px] shadow-none focus:ring-1">
                                        <SelectValue placeholder="Remitente" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {remitentes.map((remitente) => (
                                            <SelectItem
                                                key={remitente.id_remitente}
                                                value={String(
                                                    remitente.id_remitente,
                                                )}
                                                className="text-[12px]"
                                            >
                                                {remitente.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Estado */}
                                <Select
                                    value={data.recibido}
                                    onValueChange={(value) =>
                                        setData('recibido', value)
                                    }
                                >
                                    <SelectTrigger className="h-8 w-[130px] rounded-md border-border/50 bg-background text-[12px] font-medium shadow-none focus:ring-1">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="subido"
                                            className="text-[12px]"
                                        >
                                            Subido
                                        </SelectItem>
                                        <SelectItem
                                            value="recibido"
                                            className="text-[12px]"
                                        >
                                            Recibido
                                        </SelectItem>
                                        <SelectItem
                                            value="enviado"
                                            className="text-[12px]"
                                        >
                                            Enviado
                                        </SelectItem>
                                        <SelectItem
                                            value="en_revision"
                                            className="text-[12px]"
                                        >
                                            En revisión
                                        </SelectItem>
                                        <SelectItem
                                            value="aprobado"
                                            className="text-[12px]"
                                        >
                                            Aprobado
                                        </SelectItem>
                                        <SelectItem
                                            value="rechazado"
                                            className="text-[12px]"
                                        >
                                            Rechazado
                                        </SelectItem>
                                        <SelectItem
                                            value="respondido"
                                            className="text-[12px]"
                                        >
                                            Respondido
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Palabra Clave */}
                                <div className="relative max-w-[250px] min-w-[160px] flex-1">
                                    <Search className=" h absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                                    <Input
                                        id="palabra_clave"
                                        placeholder="Buscar palabra clave..."
                                        value={data.palabra_clave}
                                        onChange={(e) =>
                                            setData(
                                                'palabra_clave',
                                                e.target.value,
                                            )
                                        }
                                        className="h-9 rounded-md border-border/50 pl-8 text-[12px] shadow-none"
                                    />
                                </div>

                                {/* Botones de Acción */}
                                <div className="ml-auto flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={clearFilters}
                                        className="h-8 w-8 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted"
                                        title="Limpiar filtros"
                                    >
                                        <RotateCcw className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-8 rounded-md bg-blue-600 px-4 text-[12px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                            </div>
                        </form>

                         <Separator  className='mt-6' />

                        {/* Barra: per_page + contador + paginación */}
                        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between mt-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-[12px] text-[var(--sidebar-foreground)]/50">
                                    Mostrar
                                </Label>
                                <Select
                                    value={data.per_page}
                                    onValueChange={changePerPage}
                                >
                                    <SelectTrigger className="h-8 w-[70px] text-[12px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="7">7</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Label className="text-[12px] text-[var(--sidebar-foreground)]/50" >
                                    Por página
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <p className="text-[12px] text-muted-foreground">
                                    {documentos.total > 0
                                        ? `${documentos.from ?? 0}–${documentos.to ?? 0} de ${documentos.total}`
                                        : '0 resultados'}
                                </p>

                                <Pagination className="mx-0 w-auto justify-end">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href={previousLink?.url ?? '#'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    goToPaginationUrl(
                                                        previousLink?.url ??
                                                            null,
                                                    );
                                                }}
                                                className={
                                                    !previousLink?.url
                                                        ? 'pointer-events-none opacity-50'
                                                        : ''
                                                }
                                            />
                                        </PaginationItem>
                                        {pageLinks.map((link) => (
                                            <PaginationItem
                                                key={`${link.label}-${link.url ?? 'null'}`}
                                            >
                                                <PaginationLink
                                                    href={link.url ?? '#'}
                                                    isActive={link.active}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        goToPaginationUrl(
                                                            link.url,
                                                        );
                                                    }}
                                                    className={
                                                        !link.url
                                                            ? 'pointer-events-none opacity-50 '
                                                            : ''
                                                    }
                                                >
                                                    {link.label
                                                        .replace('&laquo;', '')
                                                        .replace('&raquo;', '')
                                                        .replace(
                                                            'pagination.previous',
                                                            'Anterior',
                                                        )
                                                        .replace(
                                                            'pagination.next',
                                                            'Siguiente',
                                                        )}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext
                                                href={nextLink?.url ?? '#'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    goToPaginationUrl(
                                                        nextLink?.url ?? null,
                                                    );
                                                }}
                                                className={
                                                    !nextLink?.url
                                                        ? 'pointer-events-none opacity-50'
                                                        : ''
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="border-[var(--sidebar-fo)]-200 overflow-hidden rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[var(--card-background)]">
                                        {/* Headers centrados y con tipografía uniforme */}
                                        <TableHead className="w-28 px-19 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Dueño
                                        </TableHead>
                                        <TableHead className="w-28 px-18 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Remitente
                                        </TableHead>
                                        <TableHead className="w-28 px-10 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Tipo
                                        </TableHead>
                                        <TableHead className="w-28 px-10 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Palabra Clave
                                        </TableHead>
                                        <TableHead className="w-28 px-10 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Eliminado
                                        </TableHead>
                                        <TableHead className="w-28 px-10 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Acciones
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documentos.data.length > 0 ? (
                                        documentos.data.map((documento) => (
                                            <TableRow
                                                key={documento.id_documento}
                                                className="hover:bg-[var(--muted)]/40"
                                            >
                                                <TableCell className="min-w-[200px] text-center">
                                                    {documento.user ? (
                                                        <div className="flex min-h-[0px] flex-col justify-center">
                                                            <p className="text-[12px] font-medium text-foreground">
                                                                {
                                                                    documento
                                                                        .user
                                                                        .nombre
                                                                }{' '}
                                                                {
                                                                    documento
                                                                        .user
                                                                        .apellido
                                                                }
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {documento.user
                                                                    .area
                                                                    ?.nombre ??
                                                                    'Sin área'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center text-[12px] text-[var(--sidebar-foreground)]/70">
                                                    {documento.remitente
                                                        ?.nombre || '-'}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={`capitalize ${getTypeColor(documento.tipo)}`}
                                                    >
                                                        {documento.tipo}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-center text-[12px] text-[var(--sidebar-foreground)]">
                                                    {documento.palabra_clave || '-'}
                                                </TableCell>

                                                <TableCell className="text-center text-[12px] text-[var(--sidebar-foreground)]">
                                                    {formatDate(
                                                        documento.deleted_at,
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 border-[var(--border)] px-3 text-[12px] text-[var(--chart-4)] hover:bg-[var(--chart-4)]/10 hover:text-[var(--chart-4)]" // Un poco más compacto para tablas
                                                            disabled={
                                                                processing
                                                            }
                                                            onClick={() =>
                                                                setDocumentoToRestore(
                                                                    documento,
                                                                )
                                                            }
                                                        >
                                                            Restaurar
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="py-10 text-center text-[12px] text-muted-foreground"
                                            >
                                                No hay oficios eliminados por el
                                                momento.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog
                open={documentoToRestore !== null}
                onOpenChange={(open) => !open && setDocumentoToRestore(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restaurar oficio</AlertDialogTitle>
                        <AlertDialogDescription>
                            El oficio{' '}
                            {documentoToRestore?.numero_oficio ?? 'sin numero'}{' '}
                            volvera a estar activo para su usuario.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRestore}
                            className="text-white"
                        >
                            Restaurar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
