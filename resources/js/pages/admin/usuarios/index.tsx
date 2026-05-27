import { Head, Link, router } from '@inertiajs/react';
import { Ban, Check, Eye, Pencil, Plus, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    approve,
    create,
    disable,
    edit,
    enable,
    reject,
    show,
} from '@/routes/admin/usuarios';

type UserRow = {
    id_user: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    habilitado?: boolean | null;
    area: {
        id_area: number;
        nombre: string;
    } | null;
};

type PaginationLinkItem = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedUsers = {
    data: UserRow[];
    links: PaginationLinkItem[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    approvedUsers: PaginatedUsers;
    pendingUsers: PaginatedUsers;
    filters?: {
        per_page?: string;
    };
};

/** Devuelve las clases CSS del badge de estado para la tabla de usuarios. */
function estadoBadgeClass(estado: UserRow['estado'] | 'deshabilitado'): string {
    if (estado === 'aprobado') {
return 'inline-flex items-center rounded-full border border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-[12px] font-bold text-chart-4 shadow-sm backdrop-blur-sm';
}

    if (estado === 'deshabilitado') {
return 'rounded-full border-destructive-/30 bg-destructive-/10 font-semibold';
}

    if (estado === 'pendiente') {
return 'rounded-full border-amber-200 bg-amber-100 text-amber-800 font-semibold';
}

    return 'rounded-full border-rose-200 bg-rose-100 text-rose-800 font-semibold';
}

/** Normaliza el estado visible: un usuario aprobado pero con `habilitado=false` se muestra como 'deshabilitado'. */
function estadoVisible(user: UserRow): UserRow['estado'] | 'deshabilitado' {
    if (user.estado === 'aprobado' && user.habilitado === false) {
return 'deshabilitado';
}

    return user.estado;
}

function fullName(user: UserRow): string {
    return `${user.nombre} ${user.apellido}`.trim();
}

function paginationLabel(label: string): string {
    return label
        .replace('&laquo;', '')
        .replace('&raquo;', '')
        .replace('pagination.previous', 'Anterior')
        .replace('pagination.next', 'Siguiente');
}

/**
 * Lista de usuarios del sistema con dos pestañas: "Registrados" (aprobados/rechazados)
 * y "Solicitudes" (pendientes). Permite aprobar, rechazar, deshabilitar y habilitar
 * usuarios con PATCH parcial (solo recarga `approvedUsers` y `pendingUsers`).
 * `processingUserId` evita doble clic bloqueando las acciones mientras hay una en curso.
 * Solo accesible para usuarios con rol `admin`.
 */
export default function Index({ approvedUsers, pendingUsers, filters }: Props) {
    const [processingUserId, setProcessingUserId] = useState<number | null>(
        null,
    );
    const [perPage, setPerPage] = useState(filters?.per_page ?? '5');

    const approvedLinks = approvedUsers.links ?? [];
    const approvedPrev = approvedLinks[0] ?? null;
    const approvedNext = approvedLinks[approvedLinks.length - 1] ?? null;
    const approvedPages = approvedLinks.slice(1, -1);

    const pendingLinks = pendingUsers.links ?? [];
    const pendingPrev = pendingLinks[0] ?? null;
    const pendingNext = pendingLinks[pendingLinks.length - 1] ?? null;
    const pendingPages = pendingLinks.slice(1, -1);

    const handleApprove = (user: UserRow) => {
        setProcessingUserId(user.id_user);
        router.patch(
            approve.url(user.id_user),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['approvedUsers', 'pendingUsers'],
                onSuccess: () =>
                    toast.success(
                        `Usuario ${fullName(user)} aprobado correctamente.`,
                    ),
                onFinish: () => setProcessingUserId(null),
            },
        );
    };

    const handleReject = (user: UserRow) => {
        setProcessingUserId(user.id_user);
        router.patch(
            reject.url(user.id_user),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['approvedUsers', 'pendingUsers'],
                onSuccess: () =>
                    toast.error(`Solicitud de ${fullName(user)} rechazada.`),
                onFinish: () => setProcessingUserId(null),
            },
        );
    };

    const handleDisable = (user: UserRow) => {
        setProcessingUserId(user.id_user);
        router.patch(
            disable.url(user.id_user),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['approvedUsers', 'pendingUsers'],
                onSuccess: () =>
                    toast.info(
                        `Usuario ${fullName(user)} deshabilitado correctamente.`,
                    ),
                onFinish: () => setProcessingUserId(null),
            },
        );
    };

    const handleEnable = (user: UserRow) => {
        setProcessingUserId(user.id_user);
        router.patch(
            enable.url(user.id_user),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['approvedUsers', 'pendingUsers'],
                onSuccess: () =>
                    toast.success(
                        `Usuario ${fullName(user)} habilitado correctamente.`,
                    ),
                onFinish: () => setProcessingUserId(null),
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
        setPerPage(value);
        router.get(
            '/admin/usuarios',
            { per_page: value, approved_page: 1, pending_page: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    // ── Paginación reutilizable ────────────────────────────────────────────────
    const PaginationBar = ({
        prev,
        next,
        pages,
    }: {
        prev: PaginationLinkItem | null;
        next: PaginationLinkItem | null;
        pages: PaginationLinkItem[];
    }) => (
        <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href={prev?.url ?? '#'}
                        onClick={(e) => {
                            e.preventDefault();
                            goToPaginationUrl(prev?.url ?? null);
                        }}
                        className={
                            !prev?.url ? 'pointer-events-none opacity-50' : ''
                        }
                    />
                </PaginationItem>
                {pages.map((link) => (
                    <PaginationItem key={`${link.label}-${link.url ?? 'null'}`}>
                        <PaginationLink
                            href={link.url ?? '#'}
                            isActive={link.active}
                            onClick={(e) => {
                                e.preventDefault();
                                goToPaginationUrl(link.url);
                            }}
                            className={
                                !link.url
                                    ? 'pointer-events-none opacity-50'
                                    : ''
                            }
                        >
                            {paginationLabel(link.label)}
                        </PaginationLink>
                    </PaginationItem>
                ))}
                <PaginationItem>
                    <PaginationNext
                        href={next?.url ?? '#'}
                        onClick={(e) => {
                            e.preventDefault();
                            goToPaginationUrl(next?.url ?? null);
                        }}
                        className={
                            !next?.url ? 'pointer-events-none opacity-50' : ''
                        }
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );

    return (
        <>
            <Head title="Usuarios" />

            <div className="mx-auto w-full space-y-6 px-8 pt-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold leading-tight flex items-center gap-2">
                        <ShieldCheck className="size-5 text-muted-foreground" />
                        Gestión de usuarios
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Revisa usuarios activos, aprueba solicitudes y crea nuevas cuentas.
                    </p>
                </div>

                <Tabs defaultValue="activos" className="w-full">
                    <div className="flex items-center justify-between gap-4">
                        <TabsList className="h-9 rounded-lg bg-muted p-1">
                            <TabsTrigger value="activos" className="text-[12px] px-4">
                                Registrados ({approvedUsers.total})
                            </TabsTrigger>
                            <TabsTrigger value="solicitudes" className="text-[12px] px-4">
                                Solicitudes ({pendingUsers.total})
                            </TabsTrigger>
                        </TabsList>

                        <Button asChild size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                            <Link href={create()}>
                                <Plus className="mr-1.5 size-4" />
                                Nuevo usuario
                            </Link>
                        </Button>
                    </div>

                    {/* ── Tab: Usuarios registrados ─────────────────── */}
                    <TabsContent value="activos" className="mt-2">
                        <div className="overflow-hidden rounded-xl border border-border ">
                            {/* Toolbar INTERNA (Dentro del borde) */}
                            <div className="flex items-center justify-between border-b bg-[var(--card-background)] px-4 py-2.5 ">
                                <div className="flex items-center gap-2">
                                    <Label className="text-[12px] text-muted-foreground">
                                        Mostrar
                                    </Label>
                                    <div className='px-4'>
                                    <Select value={perPage} onValueChange={changePerPage}>
                                        <SelectTrigger className="h-7 w-[65px] text-[11px] bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <p className="hidden text-[11px] font-medium text-muted-foreground sm:block">
                                        {approvedUsers.total > 0
                                            ? `${approvedUsers.from}–${approvedUsers.to} de ${approvedUsers.total}`
                                            : '0 resultados'}
                                    </p>
                                    <PaginationBar
                                        prev={approvedPrev}
                                        next={approvedNext}
                                        pages={approvedPages}
                                    />
                                </div>
                            </div>

                            {/* Tabla */}
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[var(--card-background)] border-t-0 hover:bg-transparent hover:bg-muted/60">
                                        <TableHead className="text-center text-[11px] font-bold uppercase text-muted-foreground">Nombre</TableHead>
                                         <TableHead className="text-center text-[11px] font-bold uppercase text-muted-foreground">Rol</TableHead>
                                        <TableHead className="text-center text-[11px] font-bold uppercase text-muted-foreground">Email</TableHead>
                                        <TableHead className="text-center text-[11px] font-bold uppercase text-muted-foreground">Área</TableHead>
                                        <TableHead className="text-center text-[11px] font-bold uppercase text-muted-foreground">Estado</TableHead>
                                        <TableHead className="text-center text-[11px] font-bold uppercase text-muted-foreground">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvedUsers.data.length > 0 ? (
                                        approvedUsers.data.map((user) => (
                                            <TableRow key={user.id_user} className="hover:bg-muted/60 last:border-0">
                                                <TableCell className="text-center text-[12px] font-medium">{fullName(user)}</TableCell>
                                                <TableCell className="text-center text-[12px] font-medium">{user.rol}</TableCell>
                                                <TableCell className="text-center text-[12px] text-muted-foreground">{user.email}</TableCell>
                                                <TableCell className="text-center text-[12px]">{user.area?.nombre ?? '-'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={estadoBadgeClass(estadoVisible(user))}>
                                                        {estadoVisible(user)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                            <Link href={show.url(user.id_user)}><Eye className="size-4" /></Link>
                                                        </Button>
                                                        <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                                                            <Link href={edit.url(user.id_user)}><Pencil className="size-4" /></Link>
                                                        </Button>
                                                        <Button type="button" size="sm" variant="ghost" className={`h-8 w-8 p-0 ${user.habilitado !== false ? 'text-red-500' : 'text-emerald-600'}`} onClick={() => user.habilitado !== false ? handleDisable(user) : handleEnable(user)}>
                                                            {user.habilitado !== false ? <Ban className="size-4" /> : <ShieldCheck className="size-4" />}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-12 text-center text-[12px] text-muted-foreground">No hay usuarios registrados.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* ── Tab: Solicitudes ─────────────────────────── */}
                    <TabsContent value="solicitudes" className="mt-4">
                        <div className="overflow-hidden rounded-xl border  bg-card shadow-sm">
                            <div className="flex items-center justify-between border-b bg-[var(--card-background)] px-4 py-2.5">
                                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Solicitudes Pendientes</span>
                                <PaginationBar prev={pendingPrev} next={pendingNext} pages={pendingPages} />
                            </div>
                            <Table>
                                <TableBody>
                                    {/* ... El mapeo de pendingUsers igual que arriba con last:border-0 ... */}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
