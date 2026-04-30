import {
    Carousel,
    CarouselApi,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';
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
} from '@/actions/App/Http/Controllers/Admin/RemitenteController';
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

function normalizeRemitenteName(value: string): string {
    return value.replace(/[^\p{L}\p{N}\s]/gu, '').toUpperCase();
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

type Remitente = {
    id_remitente: number;
    nombre: string;
    estado: boolean;
    can_delete?: boolean;
    delete_block_reason?: string | null;
    deleted_at?: string;
};

type DeletedRemitente = {
    id_remitente: number;
    nombre: string;
    deleted_at: string;
};

type PaginationLinkItem = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedRemitentes = {
    data: Remitente[];
    links: PaginationLinkItem[];
    from: number | null;
    to: number | null;
    total: number;
};

type PaginatedDeletedRemitentes = {
    data: DeletedRemitente[];
    links: PaginationLinkItem[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    remitentes: PaginatedRemitentes;
    remitentesEliminados: PaginatedDeletedRemitentes | null;
    filters?: {
        per_page?: string;
        deleted_per_page?: string;
    };
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Index({
    remitentes,
    remitentesEliminados,
    filters,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingRemitente, setEditingRemitente] = useState<Remitente | null>(null);
    const [remitenteToDelete, setRemitenteToDelete] = useState<Remitente | DeletedRemitente | null>(null);
    const [perPage, setPerPage] = useState(filters?.per_page ?? '5');
    const [deletedPerPage, setDeletedPerPage] = useState(filters?.deleted_per_page ?? '5');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [activeSlide, setActiveSlide] = useState(0);
    const [deletedLoaded, setDeletedLoaded] = useState(false);
    const [deletedLoading, setDeletedLoading] = useState(false);

    useEffect(() => {
        if (!carouselApi) return;
        setActiveSlide(carouselApi.selectedScrollSnap());
        carouselApi.on('select', () =>
            setActiveSlide(carouselApi.selectedScrollSnap()),
        );
    }, [carouselApi]);

    // Carga lazy de eliminados: solo cuando el usuario navega al slide 1
    useEffect(() => {
        if (activeSlide !== 1 || deletedLoaded || deletedLoading) return;
        setDeletedLoading(true);
        router.reload({
            only: ['remitentesEliminados'],
            onSuccess: () => {
                setDeletedLoaded(true);
                setDeletedLoading(false);
            },
            onError: () => setDeletedLoading(false),
        });
    }, [activeSlide, deletedLoaded, deletedLoading]);

    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: '',
    });
    const {
        data: editData,
        setData: setEditData,
        patch,
        processing: processingEdit,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({ nombre: '' });
    const {
        delete: destroyRemitente,
        processing: deleting,
        errors: deleteErrors,
        reset: resetDelete,
    } = useForm({});

    // Paginación activos
    const paginationLinks = remitentes.links ?? [];
    const previousLink = paginationLinks[0] ?? null;
    const nextLink = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks = paginationLinks.slice(1, -1);

    // Paginación eliminados
    const deletedLinks = remitentesEliminados?.links ?? [];
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
                toast.success('El remitente fue creado correctamente.');
            },
        });
    };

    const handleEditSubmit = (e: { preventDefault(): void }) => {
        e.preventDefault();
        if (!editingRemitente) return;
        patch(update.url(editingRemitente.id_remitente), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingRemitente(null);
                resetEdit();
                toast.info('El remitente fue actualizado correctamente.');
            },
        });
    };

    const openEditDialog = (remitente: Remitente) => {
        setEditingRemitente(remitente);
        setEditData({ nombre: remitente.nombre });
    };

    const confirmDelete = () => {
        if (!remitenteToDelete) return;
        const isDeleted = 'deleted_at' in remitenteToDelete && !!remitenteToDelete.deleted_at;
        if (isDeleted && deleteConfirmation !== remitenteToDelete.nombre) return;

        const deleteUrl = isDeleted
            ? forceDelete.url(remitenteToDelete.id_remitente)
            : destroy.url(remitenteToDelete.id_remitente);

        destroyRemitente(deleteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                setRemitenteToDelete(null);
                setDeleteConfirmation('');
                resetDelete();
                if (isDeleted) {
                    toast.error('El remitente fue eliminado permanentemente.');
                } else {
                    toast.error('El remitente fue movido a la papelera.');
                }
            },
            onError: () => toast.error('Error al intentar eliminar.'),
        });
    };

    const goToPaginationUrl = (url: string | null) => {
        if (!url) return;
        router.visit(url, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const goToDeletedPaginationUrl = (url: string | null) => {
        if (!url) return;
        router.visit(url, {
            only: ['remitentesEliminados'],
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const changePerPage = (value: string) => {
        setPerPage(value);
        router.get(
            '/admin/remitentes',
            { per_page: value, page: 1 },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const changeDeletedPerPage = (value: string) => {
        setDeletedPerPage(value);
        router.get(
            '/admin/remitentes',
            { per_page: perPage, deleted_per_page: value, deleted_page: 1 },
            {
                only: ['remitentesEliminados'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleRestore = (remitente: DeletedRemitente) => {
        router.patch(
            restore.url(remitente.id_remitente),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Remitente "${remitente.nombre}" restaurado.`);
                    setDeletedLoaded(false);
                },
                onError: () => toast.error('No se pudo restaurar el remitente.'),
            },
        );
    };

    return (
        <>
            <Head title="Remitentes" />

            <div className="mx-auto w-full space-y-6 px-8 pt-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <h1 className="text-xl leading-tight font-semibold">
                                Remitentes
                            </h1>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Administra los remitentes del sistema. Los nombres se
                            guardan en mayúsculas.
                        </p>
                    </div>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="shrink-0 text-white" size="sm">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Nuevo remitente
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Crear remitente</DialogTitle>
                                <DialogDescription>
                                    Solo se permiten letras, números y espacios.
                                    El texto se convierte a mayúsculas
                                    automáticamente.
                                </DialogDescription>
                            </DialogHeader>
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="nombre"
                                        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                                    >
                                        Nombre del remitente
                                    </Label>
                                    <Input
                                        id="nombre"
                                        autoComplete="off"
                                        maxLength={100}
                                        placeholder="EJEMPLO: MUNICIPALIDAD 01"
                                        value={data.nombre}
                                        onChange={(e) =>
                                            setData(
                                                'nombre',
                                                normalizeRemitenteName(e.target.value),
                                            )
                                        }
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
                                    <Button type="submit" disabled={processing} className="text-white">
                                        {processing ? 'Guardando...' : 'Guardar remitente'}
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
                                Activos
                                <Badge
                                    variant="secondary"
                                    className="ml-1 h-4 px-1.5 text-[10px]"
                                >
                                    {remitentes.total}
                                </Badge>
                            </button>
                            <button
                                onClick={() => carouselApi?.scrollTo(1)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all ${activeSlide === 1 ? 'rounded-md bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <History className="h-3 w-3" />
                                Eliminados
                                {remitentesEliminados && remitentesEliminados.total > 0 && (
                                    <Badge
                                        variant="outline"
                                        className="ml-1 h-4 px-1.5 text-[10px]"
                                    >
                                        {remitentesEliminados.total}
                                    </Badge>
                                )}
                            </button>
                        </div>
                    </div>


                    <CarouselContent>
                        {/* ── Slide 1: Remitentes activos ── */}
                        <CarouselItem>
                            <div className="overflow-hidden rounded-xl border bg-card">
                                {/* Toolbar */}
                                <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            Mostrar
                                        </span>
                                        <Select
                                            value={perPage}
                                            onValueChange={changePerPage}
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
                                                {remitentes.total > 0
                                                    ? `${remitentes.from ?? 0}–${remitentes.to ?? 0} de ${remitentes.total}`
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

                                {/* Tabla activos */}
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableHead className="w-20 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                ID
                                            </TableHead>
                                            <TableHead className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Nombre
                                            </TableHead>
                                            <TableHead className="w-28 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Estado
                                            </TableHead>
                                            <TableHead className="w-40 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {remitentes.data.length > 0 ? (
                                            remitentes.data.map((remitente) => (
                                                <TableRow
                                                    key={remitente.id_remitente}
                                                    className="hover:bg-muted/20"
                                                >
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        #{remitente.id_remitente}
                                                    </TableCell>
                                                    <TableCell className="text-[12px] font-medium">
                                                        {remitente.nombre}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                remitente.estado
                                                                    ? 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm'
                                                                    : 'border-border bg-background text-muted-foreground'
                                                            }
                                                        >
                                                            {remitente.estado ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                                                onClick={() => openEditDialog(remitente)}
                                                            >
                                                                <Pencil className="mr-1 h-3 w-3" />
                                                                Editar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className={`h-7 text-xs ${
                                                                    remitente.can_delete
                                                                        ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                                                                        : 'cursor-not-allowed text-muted-foreground/40 hover:bg-transparent'
                                                                }`}
                                                                title={
                                                                    remitente.can_delete
                                                                        ? 'Eliminar remitente'
                                                                        : (remitente.delete_block_reason ?? 'Tiene dependencias activas.')
                                                                }
                                                                disabled={deleting || !remitente.can_delete}
                                                                onClick={() => {
                                                                    if (!deleting && remitente.can_delete) {
                                                                        setRemitenteToDelete(remitente);
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
                                                    colSpan={4}
                                                    className="py-14 text-center"
                                                >
                                                    <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                                                    <p className="text-[12px] text-muted-foreground">
                                                        No hay remitentes registrados todavía.
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {Object.keys(deleteErrors).length > 0 && (
                                    <div className="border-t px-4 py-3">
                                        <Alert variant="destructive" className="py-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle className="text-[12px]">
                                                No se pudo eliminar el remitente
                                            </AlertTitle>
                                            <AlertDescription className="text-xs">
                                                {Object.values(deleteErrors).join(' ')}
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </div>
                        </CarouselItem>

                        {/* ── Slide 2: Remitentes eliminados ── */}
                        <CarouselItem>
                            <div className="overflow-hidden rounded-xl border bg-card">
                                {/* Toolbar eliminados */}
                                <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-[12px] font-medium text-muted-foreground">
                                            Papelera de reciclaje
                                        </span>
                                        {remitentesEliminados && (
                                            <Badge
                                                variant="outline"
                                                className="h-4 px-1.5 text-[10px]"
                                            >
                                                {remitentesEliminados.total} registro{remitentesEliminados.total !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                    {remitentesEliminados && (
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
                                                        {remitentesEliminados.total > 0
                                                            ? `${remitentesEliminados.from ?? 0}–${remitentesEliminados.to ?? 0} de ${remitentesEliminados.total}`
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

                                {/* Tabla eliminados */}
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
                                                    Eliminado el
                                                </TableHead>
                                                <TableHead className="w-44 text-right text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Acciones
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {remitentesEliminados && remitentesEliminados.data.length > 0 ? (
                                                remitentesEliminados.data.map((remitente) => (
                                                    <TableRow
                                                        key={remitente.id_remitente}
                                                        className="hover:bg-muted/20"
                                                    >
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            #{remitente.id_remitente}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-[12px] font-medium text-muted-foreground line-through">
                                                                {remitente.nombre}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {formatDeletedDate(remitente.deleted_at)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
                                                                    onClick={() => handleRestore(remitente)}
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
                                                                        setRemitenteToDelete(remitente);
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
                                                            No hay remitentes eliminados.
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                                                            Los remitentes eliminados aparecerán aquí.
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
                open={remitenteToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRemitenteToDelete(null);
                        setDeleteConfirmation('');
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {remitenteToDelete && 'deleted_at' in remitenteToDelete && remitenteToDelete.deleted_at
                                ? 'Eliminación permanente'
                                : 'Confirmar eliminación'}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                {remitenteToDelete && 'deleted_at' in remitenteToDelete && remitenteToDelete.deleted_at ? (
                                    <>
                                        <p>
                                            El remitente{' '}
                                            <strong className="text-foreground">
                                                {remitenteToDelete.nombre}
                                            </strong>{' '}
                                            será eliminado{' '}
                                            <strong className="text-destructive">
                                                permanentemente
                                            </strong>{' '}
                                            y no podrá recuperarse.
                                        </p>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Escribe{' '}
                                                <span className="font-mono text-foreground">
                                                    {remitenteToDelete.nombre}
                                                </span>{' '}
                                                para confirmar
                                            </Label>
                                            <Input
                                                autoFocus
                                                autoComplete="off"
                                                value={deleteConfirmation}
                                                onChange={(e) =>
                                                    setDeleteConfirmation(e.target.value)
                                                }
                                                placeholder={remitenteToDelete.nombre}
                                                className="border-destructive focus-visible:ring-destructive/30"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p>
                                        ¿Seguro que deseas eliminar el remitente{' '}
                                        <strong className="text-foreground">
                                            {remitenteToDelete?.nombre}
                                        </strong>
                                        ? Pasará a la papelera y podrás
                                        restaurarlo después.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={
                                remitenteToDelete && 'deleted_at' in remitenteToDelete && remitenteToDelete.deleted_at
                                    ? deleteConfirmation !== remitenteToDelete.nombre || deleting
                                    : deleting
                            }
                        >
                            {deleting
                                ? 'Eliminando...'
                                : remitenteToDelete && 'deleted_at' in remitenteToDelete && remitenteToDelete.deleted_at
                                  ? 'Eliminar permanentemente'
                                  : 'Mover a papelera'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Dialog editar ── */}
            <Dialog
                open={editingRemitente !== null}
                onOpenChange={(open) => !open && setEditingRemitente(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar remitente</DialogTitle>
                        <DialogDescription>
                            Actualiza el nombre del remitente. Se guardará en
                            mayúsculas.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleEditSubmit}>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="edit-nombre"
                                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                            >
                                Nombre del remitente
                            </Label>
                            <Input
                                id="edit-nombre"
                                autoFocus
                                autoComplete="off"
                                maxLength={100}
                                placeholder="EJEMPLO: MUNICIPALIDAD 01"
                                value={editData.nombre}
                                onChange={(e) =>
                                    setEditData(
                                        'nombre',
                                        normalizeRemitenteName(e.target.value),
                                    )
                                }
                            />
                            <InputError message={editErrors.nombre} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditingRemitente(null);
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
                                {processingEdit ? 'Actualizando...' : 'Actualizar remitente'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
