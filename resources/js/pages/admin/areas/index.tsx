import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    History,
    Loader2,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    destroy,
    forceDelete,
    restore,
    store,
    update,
} from '@/actions/App/Http/Controllers/Admin/AreaController';
import InputError from '@/components/input-error';
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
    Carousel,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
import type {
    CarouselApi} from '@/components/ui/carousel';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// ============================================================================
// UTILIDADES
// ============================================================================

/** Elimina cualquier carácter que no sea letra Unicode o espacio y convierte a mayúsculas. */
function normalizeAreaName(value: string): string {
    return value.replace(/[^\p{L}\s]/gu, '').toUpperCase();
}

const formatDeletedDate = (value: string): string =>
    new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Guayaquil',
    });

// ============================================================================
// TIPOS
// ============================================================================

type Area = {
    id_area: number;
    nombre: string;
    can_delete?: boolean;
    delete_block_reason?: string | null;
    deleted_at?: string;
};

type DeletedArea = {
    id_area: number;
    nombre: string;
    deleted_at: string;
};

type PaginationLinkItem = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedAreas = {
    data: Area[];
    links: PaginationLinkItem[];
    from: number | null;
    to: number | null;
    total: number;
};

type PaginatedDeletedAreas = {
    data: DeletedArea[];
    links: PaginationLinkItem[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    areas: PaginatedAreas;
    areasEliminadas: PaginatedDeletedAreas | null;
    filters?: {
        per_page?: string;
        deleted_per_page?: string;
    };
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Gestión de áreas organizacionales del sistema.
 *
 * Presenta dos vistas en un Carousel: slide 0 con las áreas activas (CRUD completo)
 * y slide 1 con la papelera de reciclaje (restaurar / eliminar permanente).
 * La papelera se carga con lazy loading: la petición al backend se dispara solo
 * la primera vez que el usuario navega al slide 1.
 *
 * La eliminación permanente requiere que el usuario escriba el nombre exacto del área.
 * Solo accesible para usuarios con rol `admin`.
 */
export default function Index({ areas, areasEliminadas, filters }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [areaToDelete, setAreaToDelete] = useState<Area | DeletedArea | null>(null);
    const [perPage, setPerPage] = useState(filters?.per_page ?? '5');
    const [deletedPerPage, setDeletedPerPage] = useState(filters?.deleted_per_page ?? '5');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [activeSlide, setActiveSlide] = useState(0);
    const [deletedLoaded, setDeletedLoaded] = useState(false);
    const [deletedLoading, setDeletedLoading] = useState(false);

    useEffect(() => {
        if (!carouselApi) {
return;
}

        setActiveSlide(carouselApi.selectedScrollSnap());
        carouselApi.on('select', () =>
            setActiveSlide(carouselApi.selectedScrollSnap()),
        );
    }, [carouselApi]);

    // Carga lazy de eliminadas: solo cuando el usuario navega al slide 1
    useEffect(() => {
        if (activeSlide !== 1 || deletedLoaded || deletedLoading) {
return;
}

        setDeletedLoading(true);
        router.reload({
            only: ['areasEliminadas'],
            onSuccess: () => {
                setDeletedLoaded(true);
                setDeletedLoading(false);
            },
            onError: () => setDeletedLoading(false),
        });
    }, [activeSlide, deletedLoaded, deletedLoading]);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        nombre: '',
    });
    const {
        data: editData,
        setData: setEditData,
        patch,
        processing: processingEdit,
        errors: editErrors,
        reset: resetEdit,
        clearErrors: clearEditErrors,
    } = useForm({ nombre: '' });
    const {
        delete: destroyArea,
        processing: deleting,
        errors: deleteErrors,
        reset: resetDelete,
    } = useForm({});

    // Paginación activas
    const paginationLinks = areas.links ?? [];
    const previousLink = paginationLinks[0] ?? null;
    const nextLink = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks = paginationLinks.slice(1, -1);

    // Paginación eliminadas
    const deletedLinks = areasEliminadas?.links ?? [];
    const previousDeletedLink = deletedLinks[0] ?? null;
    const nextDeletedLink = deletedLinks[deletedLinks.length - 1] ?? null;
    const pageDeletedLinks = deletedLinks.slice(1, -1);

    const handleSubmit = (e: { preventDefault(): void }) => {
        e.preventDefault();
        post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setCreateOpen(false);
                toast.success('El área fue creada correctamente.');
            },
            onError: (errors) => {
                if (errors.nombre) toast.error(errors.nombre);
            },
        });
    };

    const handleEditSubmit = (e: { preventDefault(): void }) => {
        e.preventDefault();

        if (!editingArea) {
return;
}

        patch(update.url(editingArea.id_area), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingArea(null);
                resetEdit();
                toast.info('El área fue actualizada correctamente.');
            },
            onError: (errors) => {
                if (errors.nombre) toast.error(errors.nombre);
            },
        });
    };

    const openEditDialog = (area: Area) => {
        setEditingArea(area);
        setEditData('nombre', area.nombre);
    };

    /**
     * Ejecuta el borrado del área seleccionada.
     * Si el área ya está en la papelera (`deleted_at` presente) llama a `forceDelete`;
     * de lo contrario hace un soft delete. El force delete exige que `deleteConfirmation`
     * coincida exactamente con el nombre del área.
     */
    const confirmDelete = () => {
        if (!areaToDelete) {
return;
}

        const isDeleted = 'deleted_at' in areaToDelete && !!areaToDelete.deleted_at;

        if (isDeleted && deleteConfirmation !== areaToDelete.nombre) {
return;
}

        const deleteUrl = isDeleted
            ? forceDelete.url(areaToDelete.id_area)
            : destroy.url(areaToDelete.id_area);

        destroyArea(deleteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                setAreaToDelete(null);
                setDeleteConfirmation('');
                resetDelete();
                setDeletedLoaded(false);

                if (isDeleted) {
                    toast.error('El área fue eliminada permanentemente.');
                } else {
                    toast.error('El área fue movida a la papelera.');
                }
            },
            onError: () => toast.error('Error al intentar eliminar.'),
        });
    };

    const goToPaginationUrl = (url: string | null) => {
        if (!url) {
return;
}

        router.visit(url, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const goToDeletedPaginationUrl = (url: string | null) => {
        if (!url) {
return;
}

        router.visit(url, {
            only: ['areasEliminadas'],
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const changePerPage = (value: string) => {
        setPerPage(value);
        router.get(
            '/admin/areas',
            { per_page: value, page: 1 },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const changeDeletedPerPage = (value: string) => {
        setDeletedPerPage(value);
        router.get(
            '/admin/areas',
            { per_page: perPage, deleted_per_page: value, deleted_page: 1 },
            {
                only: ['areasEliminadas'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleRestore = (area: DeletedArea) => {
        router.patch(
            restore.url(area.id_area),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Área "${area.nombre}" restaurada.`);
                    setDeletedLoaded(false);
                },
                onError: () => toast.error('No se pudo restaurar el área.'),
            },
        );
    };

    return (
        <>
            <Head title="Áreas" />

            <div className="mx-auto w-full space-y-6 px-8 pt-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <h1 className="text-xl leading-tight font-semibold">
                                Áreas
                            </h1>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Administra las áreas del sistema. Los nombres se
                            guardan en mayúsculas.
                        </p>
                    </div>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="text-white" size="sm">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Nueva área
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear área</DialogTitle>
                                <DialogDescription>
                                    Solo se permiten letras y espacios. El texto
                                    se convierte a mayúsculas automáticamente.
                                </DialogDescription>
                            </DialogHeader>
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="nombre"
                                        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                                    >
                                        Nombre del área
                                    </Label>
                                    <Input
                                        id="nombre"
                                        autoComplete="off"
                                        maxLength={50}
                                        placeholder="RECURSOS HUMANOS"
                                        value={data.nombre}
                                        onChange={(e) => {
                                            setData('nombre', normalizeAreaName(e.target.value));
                                            clearErrors('nombre');
                                        }}
                                    />
                                    <InputError message={errors.nombre} />
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCreateOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="text-white"
                                    >
                                        {processing ? 'Guardando...' : 'Guardar área'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* ── Carousel ── */}
                <Carousel
                    className="w-full"
                    opts={{ watchDrag: false }}
                    setApi={setCarouselApi}
                >
                    {/* Navegación */}
                    <div className="mb-3">
                        <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
                            <button
                                onClick={() => carouselApi?.scrollTo(0)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all ${activeSlide === 0 ? 'rounded-md bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                Activas
                                <Badge
                                    variant="secondary"
                                    className="ml-1 h-4 px-1.5 text-[10px]"
                                >
                                    {areas.total}
                                </Badge>
                            </button>
                            <button
                                onClick={() => carouselApi?.scrollTo(1)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all ${activeSlide === 1 ? 'rounded-md bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <History className="h-3 w-3" />
                                Eliminadas
                                {areasEliminadas && areasEliminadas.total > 0 && (
                                    <Badge
                                        variant="outline"
                                        className="ml-1 h-4 px-1.5 text-[10px]"
                                    >
                                        {areasEliminadas.total}
                                    </Badge>
                                )}
                            </button>
                        </div>
                    </div>


                    <CarouselContent>
                        {/* ── Slide 1: Áreas activas ── */}
                        <CarouselItem>
                            <div className="overflow-hidden rounded-xl border bg-card">

                                {/* Toolbar */}
                                <div className="flex items-center justify-between gap-3 bg-[var(--card-background)] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            Mostrar
                                        </span>
                                        <div className='px-4'>
                                        <Select
                                            value={perPage}
                                            onValueChange={changePerPage}
                                        >
                                            <SelectTrigger className="h-7 w-[70px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5</SelectItem>
                                                <SelectItem value="7">7</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        </div>
                                    </div>
                                    <Pagination className="mx-0 w-auto">
                                        <PaginationContent>
                                            <span className="text-xs text-muted-foreground">
                                                {areas.total > 0
                                                    ? `${areas.from ?? 0}–${areas.to ?? 0} de ${areas.total}`
                                                    : '0 resultados'}
                                            </span>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href={previousLink?.url ?? '#'}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        goToPaginationUrl(previousLink?.url ?? null);
                                                    }}
                                                    className={!previousLink?.url ? 'pointer-events-none opacity-50' : ''}
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
                                                            goToPaginationUrl(link.url);
                                                        }}
                                                        className={!link.url ? 'pointer-events-none opacity-50' : ''}
                                                    >
                                                        {link.label
                                                            .replace('&laquo;', '')
                                                            .replace('&raquo;', '')
                                                            .replace('pagination.previous', '')
                                                            .replace('pagination.next', '')}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    href={nextLink?.url ?? '#'}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        goToPaginationUrl(nextLink?.url ?? null);
                                                    }}
                                                    className={!nextLink?.url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>

                                <Separator />

                                {/* Tabla activas */}
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[var(--card-background)]">
                                            <TableHead className=" px-10 w-20 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                ID
                                            </TableHead>
                                            <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Nombre
                                            </TableHead>
                                            <TableHead className="w-40 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {areas.data.length > 0 ? (
                                            areas.data.map((area) => (
                                                <TableRow
                                                    key={area.id_area}
                                                    className="hover:bg-muted/20"
                                                >
                                                    <TableCell className="px-10 font-mono text-xs text-muted-foreground">
                                                        #{area.id_area}
                                                    </TableCell>
                                                    <TableCell className="text-[12px] font-medium">
                                                        {area.nombre}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                                                onClick={() => openEditDialog(area)}
                                                            >
                                                                <Pencil className="mr-1 h-3 w-3" />
                                                                Editar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className={`h-7 text-xs ${
                                                                    area.can_delete
                                                                        ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                                                                        : 'cursor-not-allowed text-muted-foreground/40 hover:bg-transparent'
                                                                }`}
                                                                title={
                                                                    area.can_delete
                                                                        ? 'Eliminar área'
                                                                        : (area.delete_block_reason ?? 'Tiene dependencias activas.')
                                                                }
                                                                disabled={deleting || !area.can_delete}
                                                                onClick={() => {
                                                                    if (!deleting && area.can_delete) {
                                                                        setAreaToDelete(area);
                                                                        setDeleteConfirmation('');
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="mr-1 h-3 w-3" />
                                                                Eliminar
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="py-14 text-center"
                                                >
                                                    <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                                                    <p className="text-[12px] text-muted-foreground">
                                                        No hay áreas registradas todavía.
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {Object.keys(deleteErrors).length > 0 && (
                                    <div className=" px-4 py-3">
                                        <Alert variant="destructive" className="py-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle className="text-[12px]">
                                                No se pudo eliminar el área
                                            </AlertTitle>
                                            <AlertDescription className="text-xs">
                                                {Object.values(deleteErrors).join(' ')}
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </div>
                        </CarouselItem>

                        {/* ── Slide 2: Áreas eliminadas ── */}
                        <CarouselItem>
                            <div className="overflow-hidden rounded-xl bg-card">
                                {/* Toolbar eliminadas */}
                                <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-[12px] font-medium text-muted-foreground">
                                            Papelera de reciclaje
                                        </span>
                                        {areasEliminadas && (
                                            <Badge
                                                variant="outline"
                                                className="h-4 px-1.5 text-[10px]"
                                            >
                                                {areasEliminadas.total} registro{areasEliminadas.total !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                    {areasEliminadas && (
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    Mostrar
                                                </span>
                                                <Select
                                                    value={deletedPerPage}
                                                    onValueChange={changeDeletedPerPage}
                                                >
                                                    <SelectTrigger className="h-7 w-[64px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="5">5</SelectItem>
                                                        <SelectItem value="7">7</SelectItem>
                                                        <SelectItem value="10">10</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Pagination className="mx-0 w-auto">
                                                <PaginationContent>
                                                    <span className="text-xs text-muted-foreground">
                                                        {areasEliminadas.total > 0
                                                            ? `${areasEliminadas.from ?? 0}–${areasEliminadas.to ?? 0} de ${areasEliminadas.total}`
                                                            : '0 resultados'}
                                                    </span>
                                                    <PaginationItem>
                                                        <PaginationPrevious
                                                            href={previousDeletedLink?.url ?? '#'}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                goToDeletedPaginationUrl(previousDeletedLink?.url ?? null);
                                                            }}
                                                            className={!previousDeletedLink?.url ? 'pointer-events-none opacity-50' : ''}
                                                        />
                                                    </PaginationItem>
                                                    {pageDeletedLinks.map((link) => (
                                                        <PaginationItem
                                                            key={`${link.label}-${link.url ?? 'null'}`}
                                                        >
                                                            <PaginationLink
                                                                href={link.url ?? '#'}
                                                                isActive={link.active}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    goToDeletedPaginationUrl(link.url);
                                                                }}
                                                                className={!link.url ? 'pointer-events-none opacity-50' : ''}
                                                            >
                                                                {link.label
                                                                    .replace('&laquo;', '')
                                                                    .replace('&raquo;', '')
                                                                    .replace('pagination.previous', '')
                                                                    .replace('pagination.next', '')}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    ))}
                                                    <PaginationItem>
                                                        <PaginationNext
                                                            href={nextDeletedLink?.url ?? '#'}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                goToDeletedPaginationUrl(nextDeletedLink?.url ?? null);
                                                            }}
                                                            className={!nextDeletedLink?.url ? 'pointer-events-none opacity-50' : ''}
                                                        />
                                                    </PaginationItem>
                                                </PaginationContent>
                                            </Pagination>
                                        </div>
                                    )}
                                </div>

                                {/* Tabla eliminadas */}
                                {deletedLoading ? (
                                    <div className="flex items-center justify-center py-14">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableHead className="w-20 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    ID
                                                </TableHead>
                                                <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Nombre
                                                </TableHead>
                                                <TableHead className="w-44 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Eliminada el
                                                </TableHead>
                                                <TableHead className="w-44 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Acciones
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {areasEliminadas && areasEliminadas.data.length > 0 ? (
                                                areasEliminadas.data.map((area) => (
                                                    <TableRow
                                                        key={area.id_area}
                                                        className="hover:bg-muted/20"
                                                    >
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            #{area.id_area}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-[12px] font-medium text-muted-foreground line-through">
                                                                {area.nombre}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {formatDeletedDate(area.deleted_at)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
                                                                    onClick={() => handleRestore(area)}
                                                                >
                                                                    <History className="mr-1 h-3 w-3" />
                                                                    Restaurar
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                                                                    onClick={() => {
                                                                        setAreaToDelete(area);
                                                                        setDeleteConfirmation('');
                                                                    }}
                                                                >
                                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                                    Eliminar
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={4}
                                                        className="py-14 text-center"
                                                    >
                                                        <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                                                        <p className="text-[12px] text-muted-foreground">
                                                            No hay áreas eliminadas.
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                                                            Las áreas eliminadas aparecerán aquí.
                                                        </p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
            </div>

            {/* ── AlertDialog eliminar ── */}
            <AlertDialog
                open={areaToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAreaToDelete(null);
                        setDeleteConfirmation('');
                    }
                }}
            >
                <AlertDialogContent className="sm:max-w-[420px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {areaToDelete && 'deleted_at' in areaToDelete && areaToDelete.deleted_at
                                ? 'Eliminación permanente'
                                : 'Confirmar eliminación'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {areaToDelete && 'deleted_at' in areaToDelete && areaToDelete.deleted_at ? (
                                <>
                                    Esta área será eliminada{' '}
                                    <strong className="text-destructive">permanentemente</strong>{' '}
                                    y no podrá recuperarse.
                                </>
                            ) : (
                                '¿Seguro que deseas mover a la papelera el área?'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-3">
                        <div className="break-all rounded-md border bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground">
                            {areaToDelete?.nombre}
                        </div>
                        {areaToDelete && 'deleted_at' in areaToDelete && areaToDelete.deleted_at ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Escribe el nombre exacto para confirmar
                                </Label>
                                <Input
                                    autoFocus
                                    autoComplete="off"
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder={areaToDelete.nombre}
                                    className="bg-muted/50 focus-visible:ring-destructive/30"
                                />
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Podrás restaurarla después desde la papelera.
                            </p>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={
                                areaToDelete && 'deleted_at' in areaToDelete && areaToDelete.deleted_at
                                    ? deleteConfirmation !== areaToDelete.nombre || deleting
                                    : deleting
                            }
                        >
                            {deleting
                                ? 'Eliminando...'
                                : areaToDelete && 'deleted_at' in areaToDelete && areaToDelete.deleted_at
                                  ? 'Eliminar permanentemente'
                                  : 'Mover a papelera'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Dialog editar ── */}
            <Dialog
                open={editingArea !== null}
                onOpenChange={(open) => !open && setEditingArea(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar área</DialogTitle>
                        <DialogDescription>
                            Actualiza el nombre del área. Se guardará en
                            mayúsculas.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleEditSubmit}>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-nombre"
                                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                            >
                                Nombre del área
                            </Label>
                            <Input
                                id="edit-nombre"
                                autoFocus
                                autoComplete="off"
                                maxLength={50}
                                placeholder="RECURSOS HUMANOS"
                                value={editData.nombre}
                                onChange={(e) => {
                                    setEditData('nombre', normalizeAreaName(e.target.value));
                                    clearEditErrors('nombre');
                                }}
                            />
                            <InputError message={editErrors.nombre} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditingArea(null);
                                    resetEdit();
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={processingEdit}
                                className="text-white"
                            >
                                {processingEdit ? 'Actualizando...' : 'Actualizar área'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
