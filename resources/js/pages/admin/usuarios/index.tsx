import { Head, router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { approve, reject } from '@/actions/App/Http/Controllers/Admin/UserController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type UserRow = {
    id_user: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
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

function estadoBadgeClass(estado: UserRow['estado']): string {
    if (estado === 'aprobado') {
        return 'rounded-full border-emerald-200 bg-emerald-100 text-emerald-800 font-semibold';
    }

    if (estado === 'pendiente') {
        return 'rounded-full border-amber-200 bg-amber-100 text-amber-800 font-semibold';
    }

    return 'rounded-full border-rose-200 bg-rose-100 text-rose-800 font-semibold';
}

function fullName(user: UserRow): string {
    return `${user.nombre} ${user.apellido}`.trim();
}

export default function Index({ approvedUsers, pendingUsers, filters }: Props) {
    const [processingUserId, setProcessingUserId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

        router.patch(approve.url(user.id_user), {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['approvedUsers', 'pendingUsers'],
            onSuccess: () => {
                setSuccessMessage(`Usuario ${fullName(user)} aprobado correctamente.`);
            },
            onFinish: () => {
                setProcessingUserId(null);
            },
        });
    };

    const handleReject = (user: UserRow) => {
        setProcessingUserId(user.id_user);

        router.patch(reject.url(user.id_user), {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['approvedUsers', 'pendingUsers'],
            onSuccess: () => {
                setSuccessMessage(`Solicitud de ${fullName(user)} rechazada.`);
            },
            onFinish: () => {
                setProcessingUserId(null);
            },
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
        setPerPage(value);

        router.get('/admin/usuarios', {
            per_page: value,
            approved_page: 1,
            pending_page: 1,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Usuarios" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Gestion de usuarios</CardTitle>
                        <CardDescription>
                            Revisa usuarios activos y aprueba solicitudes de acceso pendientes.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {successMessage && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                                <AlertTitle>Accion completada</AlertTitle>
                                <AlertDescription>{successMessage}</AlertDescription>
                            </Alert>
                        )}

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

                        <Tabs defaultValue="activos" className="w-full">
                            <TabsList>
                                <TabsTrigger value="activos">
                                    Usuarios activos ({approvedUsers.total})
                                </TabsTrigger>
                                <TabsTrigger value="solicitudes">
                                    Solicitudes de acceso ({pendingUsers.total})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="activos" className="pt-3">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        {approvedUsers.total > 0
                                            ? `${approvedUsers.from ?? 0}-${approvedUsers.to ?? 0} de ${approvedUsers.total}`
                                            : '0 resultados'}
                                    </p>
                                    <Pagination className="mx-0 w-auto justify-end">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href={approvedPrev?.url ?? '#'}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        goToPaginationUrl(approvedPrev?.url ?? null);
                                                    }}
                                                    className={!approvedPrev?.url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>

                                            {approvedPages.map((link) => (
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
                                                    href={approvedNext?.url ?? '#'}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        goToPaginationUrl(approvedNext?.url ?? null);
                                                    }}
                                                    className={!approvedNext?.url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Area</TableHead>
                                            <TableHead>Rol</TableHead>
                                            <TableHead>Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {approvedUsers.data.length > 0 ? (
                                            approvedUsers.data.map((user) => (
                                                <TableRow key={user.id_user}>
                                                    <TableCell className="font-medium">{fullName(user)}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>{user.area?.nombre ?? '-'}</TableCell>
                                                    <TableCell className="uppercase">{user.rol}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={estadoBadgeClass(user.estado)}>
                                                            {user.estado}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                                                    No hay usuarios aprobados todavia.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TabsContent>

                            <TabsContent value="solicitudes" className="pt-3">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        {pendingUsers.total > 0
                                            ? `${pendingUsers.from ?? 0}-${pendingUsers.to ?? 0} de ${pendingUsers.total}`
                                            : '0 resultados'}
                                    </p>
                                    <Pagination className="mx-0 w-auto justify-end">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href={pendingPrev?.url ?? '#'}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        goToPaginationUrl(pendingPrev?.url ?? null);
                                                    }}
                                                    className={!pendingPrev?.url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>

                                            {pendingPages.map((link) => (
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
                                                    href={pendingNext?.url ?? '#'}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        goToPaginationUrl(pendingNext?.url ?? null);
                                                    }}
                                                    className={!pendingNext?.url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Area</TableHead>
                                            <TableHead>Rol</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingUsers.data.length > 0 ? (
                                            pendingUsers.data.map((user) => (
                                                <TableRow key={user.id_user}>
                                                    <TableCell className="font-medium">{fullName(user)}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>{user.area?.nombre ?? '-'}</TableCell>
                                                    <TableCell className="uppercase">{user.rol}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={estadoBadgeClass(user.estado)}>
                                                            {user.estado}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                                disabled={processingUserId === user.id_user}
                                                                onClick={() => handleApprove(user)}
                                                            >
                                                                <Check className="mr-1 h-4 w-4" />
                                                                Aprobar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="destructive"
                                                                disabled={processingUserId === user.id_user}
                                                                onClick={() => handleReject(user)}
                                                            >
                                                                <X className="mr-1 h-4 w-4" />
                                                                Rechazar
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                                    No hay solicitudes pendientes.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
