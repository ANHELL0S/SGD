import { Head, router } from '@inertiajs/react';
import { index as adminMonitoreoIndex, show as adminMonitoreoShow } from '@/routes/admin/monitoreo';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
} from '@/components/ui/pagination';
import { Eye } from 'lucide-react';

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/Guayaquil',
    });
}

function badgeClassByTipo(tipo) {
    const normalized = String(tipo).toLowerCase();

    if (
        normalized === 'error' ||
        normalized === 'critical' ||
        normalized === 'alert' ||
        normalized === 'emergency'
    ) {
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
    }

    if (normalized === 'warning' || normalized === 'notice') {
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }

    if (normalized === 'debug') {
        return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    }

    if (normalized === 'http') {
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
    }

    return 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-[12px] font-bold text-chart-4 shadow-sm backdrop-blur-sm';
}

function badgeClassByStatus(statusCode) {
    if (!statusCode) return 'bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]';

    if (statusCode >= 200 && statusCode < 300) {
        return 'border-chart-4/30 bg-chart-4/10 px-2.5 py-0.5 text-xs font-bold text-chart-4 shadow-sm backdrop-blur-sm';
    }

    if (statusCode >= 300 && statusCode < 400) {
        return 'bg-primary/30 bg-primary/10 text-primary border-primary/20';
    }

    if (statusCode >= 400 && statusCode < 500) {
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }

    return 'bg-destructive/30 bg-destructive/10 text-destructive border-destructive/20';
}

export default function Index({ logs, filters, tipos }) {
    const currentPage = Number(logs.current_page ?? 1);
    const lastPage = Number(logs.last_page ?? 1);
    const maxVisiblePages = 5;

    let startPage = 1;
    if (currentPage > 3 && lastPage > maxVisiblePages) {
        startPage = Math.min(currentPage - 2, lastPage - maxVisiblePages + 1);
    }

    const visiblePages = Array.from(
        { length: Math.min(maxVisiblePages, lastPage) },
        (_, index) => startPage + index,
    );

    const shouldShowEllipsis =
        lastPage > maxVisiblePages && visiblePages[visiblePages.length - 1] < lastPage;

    const applyFilters = (overrides = {}) => {
        router.get(
            adminMonitoreoIndex.url(),
            {
                tipo: overrides.tipo ?? filters.tipo,
                fecha: overrides.fecha ?? filters.fecha,
                per_page: overrides.per_page ?? filters.per_page,
                page: 1,
            },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const visitPageNumber = (page) => {
        if (page < 1 || page > lastPage || page === currentPage) {
            return;
        }

        router.get(
            adminMonitoreoIndex.url(),
            {
                tipo: filters.tipo,
                fecha: filters.fecha,
                per_page: filters.per_page,
                page,
            },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const visitLog = (id) => {
        router.visit(adminMonitoreoShow.url(id));
    };

    return (
        <>
            <Head title="Monitoreo de Logs" />

            <div className="mx-auto w-full space-y-6 px-8 pt-4">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold leading-tight flex items-center gap-2">
                        <Activity className="size-5 text-muted-foreground" />
                        Monitoreo de logs
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Eventos del sistema registrados con filtros por tipo y fecha.
                    </p>
                </div>

                {/* Filtros - Afuera del contenedor de la tabla */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[130px] flex-1 space-y-1.5">
                        <Label className="block h-5 text-[12px] font-medium text-muted-foreground/70">
                            Tipo
                        </Label>
                        <Select
                            value={filters.tipo || 'all'}
                            onValueChange={(value) =>
                                applyFilters({
                                    tipo: value === 'all' ? '' : value,
                                })
                            }
                        >
                            <SelectTrigger className="h-9 w-full text-[13px]">
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {tipos.map((tipo) => (
                                    <SelectItem key={tipo} value={tipo}>
                                        {tipo}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="min-w-[150px] flex-1 space-y-1.5">
                        <Label className="block h-5 text-[12px] font-medium text-muted-foreground/70">
                            Fecha
                        </Label>
                        <Input
                            type="date"
                            value={filters.fecha}
                            onChange={(e) =>
                                applyFilters({ fecha: e.target.value })
                            }
                            className="h-9 text-[13px]"
                        />
                    </div>

                    <div className="min-w-[130px] flex-1 space-y-1.5">
                        <Label className="block h-5 text-[12px] font-medium text-muted-foreground/70">
                            Por página
                        </Label>
                        <Select
                            value={filters.per_page}
                            onValueChange={(value) =>
                                applyFilters({ per_page: value })
                            }
                        >
                            <SelectTrigger className="h-9 w-full text-[13px]">
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

                {/* Información y Paginación - Arriba de la tabla */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] text-muted-foreground">
                        Mostrando{' '}
                        <span className="font-medium text-foreground">
                            {logs.from ?? 0}–{logs.to ?? 0}
                        </span>{' '}
                        de{' '}
                        <span className="font-medium text-foreground">
                            {logs.total}
                        </span>{' '}
                        registros
                    </p>

                    <Pagination className="mx-0 w-auto justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        visitPageNumber(currentPage - 1);
                                    }}
                                    className={
                                        currentPage <= 1
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>

                            {visiblePages.map((page) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href="#"
                                        isActive={currentPage === page}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            visitPageNumber(page);
                                        }}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            {shouldShowEllipsis && (
                                <>
                                    <PaginationItem>
                                        <span className="px-3 text-[12px] text-muted-foreground">
                                            ...
                                        </span>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            isActive={currentPage === lastPage}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                visitPageNumber(lastPage);
                                            }}
                                        >
                                            {lastPage}
                                        </PaginationLink>
                                    </PaginationItem>
                                </>
                            )}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        visitPageNumber(currentPage + 1);
                                    }}
                                    className={
                                        currentPage >= lastPage
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>

                {/* Tabla */}
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-transparent">
                                <TableHead className="w-[100px] text-[11px] font-bold uppercase text-muted-foreground">
                                    Tipo
                                </TableHead>
                                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground">
                                    Mensaje
                                </TableHead>
                                <TableHead className="w-[100px] text-[11px] font-bold uppercase text-muted-foreground">
                                    Status
                                </TableHead>
                                <TableHead className="w-[130px] text-[11px] font-bold uppercase text-muted-foreground">
                                    Usuario
                                </TableHead>
                                <TableHead className="w-[120px] text-[11px] font-bold uppercase text-muted-foreground">
                                    IP
                                </TableHead>
                                <TableHead className="w-[170px] text-[11px] font-bold uppercase text-muted-foreground">
                                    Fecha
                                </TableHead>
                                <TableHead className="w-[60px] text-center text-[11px] font-bold uppercase text-muted-foreground">
                                    Ver
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-[12px] text-muted-foreground"
                                    >
                                        No hay logs para los filtros seleccionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.data.map((log) => (
                                    <TableRow
                                        key={log.id_log}
                                        className="hover:bg-muted/5 last:border-0"
                                    >
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={badgeClassByTipo(log.tipo)}
                                            >
                                                {log.tipo}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-[12px] font-medium max-w-[300px] truncate">
                                            {log.mensaje}
                                        </TableCell>
                                        <TableCell>
                                            {log.status_code && (
                                                <Badge
                                                    variant="outline"
                                                    className={badgeClassByStatus(
                                                        log.status_code,
                                                    )}
                                                >
                                                    {log.status_code}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-[12px] text-muted-foreground">
                                            {log.user
                                                ? `${log.user.nombre} ${log.user.apellido}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-[12px] font-mono text-muted-foreground/60">
                                            {log.contexto?.ip || '-'}
                                        </TableCell>
                                        <TableCell className="text-[12px] text-muted-foreground/80">
                                            {formatDate(log.created_at)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => visitLog(log.id_log)}
                                            >
                                                <Eye className="size-4 text-muted-foreground/50" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}
