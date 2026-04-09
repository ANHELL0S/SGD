import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { destroy, store, update } from '@/actions/App/Http/Controllers/Admin/AreaController';
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
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

function normalizeAreaName(value: string): string {
    return value.replace(/[^\p{L}\s]/gu, '').toUpperCase();
}

type Area = {
    id_area: number;
    nombre: string;
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

type Props = {
    areas: PaginatedAreas;
    filters?: {
        per_page?: string;
    };
};

export default function Index({ areas, filters }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [perPage, setPerPage] = useState(filters?.per_page ?? '5');

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
    } = useForm({
        nombre: '',
    });
    const {
        delete: destroyArea,
        processing: deleting,
        errors: deleteErrors,
    } = useForm<{ area?: string }>({});

    const paginationLinks = areas.links ?? [];
    const previousLink = paginationLinks[0] ?? null;
    const nextLink = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks = paginationLinks.slice(1, -1);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setCreateOpen(false);
            },
        });
    };

    const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingArea) {
            return;
        }

        patch(update.url(editingArea.id_area), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingArea(null);
                resetEdit();
                setSuccessMessage('El area fue actualizada correctamente.');
            },
        });
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setData('nombre', normalizeAreaName(event.target.value));
    };

    const openEditDialog = (area: Area) => {
        setEditingArea(area);
        setEditData('nombre', area.nombre);
    };

    const confirmDelete = () => {
        if (!areaToDelete) {
            return;
        }

        destroyArea(destroy.url(areaToDelete.id_area), {
            preserveScroll: true,
            onSuccess: () => {
                setSuccessMessage('El area fue eliminada correctamente.');
                setAreaToDelete(null);
            },
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

    const changePerPage = (value: string) => {
        setPerPage(value);

        router.get('/admin/areas', {
            per_page: value,
            page: 1,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Areas" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <CardTitle>Areas</CardTitle>
                            <CardDescription>
                                Administra las areas del sistema y registra nuevos nombres en mayusculas.
                            </CardDescription>
                        </div>

                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva area
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Crear area</DialogTitle>
                                    <DialogDescription>
                                        Solo se permiten letras y espacios. El texto se convierte automaticamente a mayusculas.
                                    </DialogDescription>
                                </DialogHeader>

                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre del area</Label>
                                        <Input
                                            id="nombre"
                                            autoComplete="off"
                                            maxLength={100}
                                            placeholder="EJEMPLO: RECURSOS HUMANOS"
                                            value={data.nombre}
                                            onChange={handleChange}
                                        />
                                        <InputError message={errors.nombre} />
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            Guardar area
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>

                    <CardContent>
                        {successMessage && (
                            <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Operacion completada</AlertTitle>
                                <AlertDescription>{successMessage}</AlertDescription>
                            </Alert>
                        )}

                        <div className="mb-4 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium text-slate-500">
                                    Mostrar
                                </Label>
                                <Select value={perPage} onValueChange={changePerPage}>
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
                                    {areas.total > 0
                                        ? `${areas.from ?? 0}-${areas.to ?? 0} de ${areas.total}`
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
                                    <TableHead className="w-24">ID</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="w-40 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {areas.data.length > 0 ? (
                                    areas.data.map((area) => (
                                        <TableRow key={area.id_area}>
                                            <TableCell className="font-medium">{area.id_area}</TableCell>
                                            <TableCell>{area.nombre}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(area)}>
                                                        <Pencil className="mr-1 h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={deleting}
                                                        onClick={() => setAreaToDelete(area)}
                                                    >
                                                        <Trash2 className="mr-1 h-4 w-4" />
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell className="py-10 text-center text-muted-foreground" colSpan={3}>
                                            No hay areas registradas todavia.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {deleteErrors.area && (
                            <Alert className="mt-4" variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>No se pudo eliminar el area</AlertTitle>
                                <AlertDescription>{deleteErrors.area}</AlertDescription>
                            </Alert>
                        )}

                        <AlertDialog open={areaToDelete !== null} onOpenChange={(open) => !open && setAreaToDelete(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se eliminara el area {areaToDelete?.nombre}. Esta accion no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={confirmDelete}>
                                        Eliminar area
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Dialog open={editingArea !== null} onOpenChange={(open) => !open && setEditingArea(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Editar area</DialogTitle>
                                    <DialogDescription>
                                        Actualiza el nombre del area en mayusculas.
                                    </DialogDescription>
                                </DialogHeader>

                                <form className="space-y-4" onSubmit={handleEditSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-nombre">Nombre del area</Label>
                                        <Input
                                            id="edit-nombre"
                                            autoComplete="off"
                                            maxLength={100}
                                            value={editData.nombre}
                                            onChange={(event) => setEditData('nombre', normalizeAreaName(event.target.value))}
                                        />
                                        <InputError message={editErrors.nombre} />
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setEditingArea(null)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={processingEdit}>
                                            Actualizar area
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
