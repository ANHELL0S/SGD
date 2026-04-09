import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { destroy, store, update } from '@/actions/App/Http/Controllers/Admin/RemitenteController';
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

function normalizeRemitenteName(value: string): string {
    return value.replace(/[^\p{L}\p{N}\s]/gu, '').toUpperCase();
}

type Remitente = {
    id_remitente: number;
    nombre: string;
    estado: boolean;
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

type Props = {
    remitentes: PaginatedRemitentes;
    filters?: {
        per_page?: string;
    };
};

export default function Index({ remitentes, filters }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingRemitente, setEditingRemitente] = useState<Remitente | null>(null);
    const [remitenteToDelete, setRemitenteToDelete] = useState<Remitente | null>(null);
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
        estado: '1',
    });
    const {
        delete: destroyRemitente,
        processing: deleting,
        errors: deleteErrors,
    } = useForm<{ remitente?: string }>({
        remitente: '',
    });

    const paginationLinks = remitentes.links ?? [];
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
                setSuccessMessage('El remitente fue creado correctamente.');
            },
        });
    };

    const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingRemitente) {
            return;
        }

        patch(update.url(editingRemitente.id_remitente), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingRemitente(null);
                resetEdit();
                setSuccessMessage('El remitente fue actualizado correctamente.');
            },
        });
    };

    const openEditDialog = (remitente: Remitente) => {
        setEditingRemitente(remitente);
        setEditData('nombre', remitente.nombre);
        setEditData('estado', remitente.estado ? '1' : '0');
    };

    const confirmDelete = () => {
        if (!remitenteToDelete) {
            return;
        }

        destroyRemitente(destroy.url(remitenteToDelete.id_remitente), {
            preserveScroll: true,
            onSuccess: () => {
                setSuccessMessage('El remitente fue eliminado correctamente.');
                setRemitenteToDelete(null);
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

        router.get('/admin/remitentes', {
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
            <Head title="Remitentes" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <CardTitle>Remitentes</CardTitle>
                            <CardDescription>
                                Crea remitentes para documentos. Solo se permiten letras, numeros y espacios en mayusculas.
                            </CardDescription>
                        </div>

                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuevo remitente
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Crear remitente</DialogTitle>
                                    <DialogDescription>
                                        Solo se permiten letras, numeros y espacios. El texto se convierte automaticamente a mayusculas.
                                    </DialogDescription>
                                </DialogHeader>

                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre del remitente</Label>
                                        <Input
                                            id="nombre"
                                            autoComplete="off"
                                            maxLength={100}
                                            placeholder="EJEMPLO: MUNICIPALIDAD 01"
                                            value={data.nombre}
                                            onChange={(event) => setData('nombre', normalizeRemitenteName(event.target.value))}
                                        />
                                        <InputError message={errors.nombre} />
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={processing}>
                                            Guardar remitente
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
                                    {remitentes.total > 0
                                        ? `${remitentes.from ?? 0}-${remitentes.to ?? 0} de ${remitentes.total}`
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
                                    <TableHead className="w-24">Estado</TableHead>
                                    <TableHead className="w-40 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {remitentes.data.length > 0 ? (
                                    remitentes.data.map((remitente) => (
                                        <TableRow key={remitente.id_remitente}>
                                            <TableCell className="font-medium">{remitente.id_remitente}</TableCell>
                                            <TableCell>{remitente.nombre}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        remitente.estado
                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                                                    }
                                                    variant="secondary"
                                                >
                                                    {remitente.estado ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(remitente)}>
                                                        <Pencil className="mr-1 h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={deleting}
                                                        onClick={() => setRemitenteToDelete(remitente)}
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
                                        <TableCell className="py-10 text-center text-muted-foreground" colSpan={4}>
                                            No hay remitentes registrados todavia.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {deleteErrors.remitente && (
                            <Alert className="mt-4" variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>No se pudo eliminar el remitente</AlertTitle>
                                <AlertDescription>{deleteErrors.remitente}</AlertDescription>
                            </Alert>
                        )}

                        <AlertDialog open={remitenteToDelete !== null} onOpenChange={(open) => !open && setRemitenteToDelete(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se eliminara el remitente {remitenteToDelete?.nombre}. Esta accion no se puede deshacer.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={confirmDelete}>
                                        Eliminar remitente
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Dialog open={editingRemitente !== null} onOpenChange={(open) => !open && setEditingRemitente(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Editar remitente</DialogTitle>
                                    <DialogDescription>
                                        Actualiza el nombre del remitente en mayusculas.
                                    </DialogDescription>
                                </DialogHeader>

                                <form className="space-y-4" onSubmit={handleEditSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-nombre">Nombre del remitente</Label>
                                        <Input
                                            id="edit-nombre"
                                            autoComplete="off"
                                            maxLength={100}
                                            value={editData.nombre}
                                            onChange={(event) => setEditData('nombre', normalizeRemitenteName(event.target.value))}
                                        />
                                        <InputError message={editErrors.nombre} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Estado</Label>
                                        <Select value={editData.estado} onValueChange={(value) => setEditData('estado', value)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecciona estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Activo</SelectItem>
                                                <SelectItem value="0">Inactivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={editErrors.estado} />
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setEditingRemitente(null)}>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={processingEdit}>
                                            Actualizar remitente
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
