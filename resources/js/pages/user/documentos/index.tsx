import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale'; // Opcional: para fechas en español
import { Search, Zap } from 'lucide-react';
import { RotateCcw, Filter } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import DataTable from './data-table';
import type { DocumentoListado } from './data-table';

type Remitente = {
    id_remitente: number;
    nombre: string;
};

type FilterState = {
    palabra_clave: string;
    texto_ocr: string;
    remitente_id: string;
    tipo: string;
    recibido: string;
    fecha_desde: string;
    fecha_hasta: string;
    con_ocr: boolean;
    per_page: string;
};

type PaginationLinkItem = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedDocumentos = {
    data: DocumentoListado[];
    links: PaginationLinkItem[];
    current_page: number;
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    documentos: PaginatedDocumentos;
    remitentes: Remitente[];
    filters: FilterState;
    busqueda_activa: boolean;
};

const defaultFilters: FilterState = {
    palabra_clave: '',
    texto_ocr: '',
    remitente_id: '',
    tipo: '',
    recibido: '',
    fecha_desde: '',
    fecha_hasta: '',
    con_ocr: false,
    per_page: '5',
};

export default function Index({ documentos, remitentes, filters, busqueda_activa }: Props) {
    const [openDesde, setOpenDesde] = useState<boolean>(false);
    const [openHasta, setOpenHasta] = useState<boolean>(false);
    const [spinKey, setSpinKey] = useState(0);
    const { auth } = usePage().props as {
        auth?: {
            user?: {
                id_user?: number;
                rol?: string;
                area_id?: number | null;
            } | null;
        };
        flash?: { success?: string | null };
    };

    const isAdmin = auth?.user?.rol === 'admin';
    const currentUserId = auth?.user?.id_user ?? null;
    const currentUserAreaId = auth?.user?.area_id ?? null;
    const { data, setData } = useForm<FilterState>({
        ...defaultFilters,
        ...filters,
    });

    const ocrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleOcrBusqueda = (value: string) => {
        setData('texto_ocr', value);

        if (ocrTimer.current) {
clearTimeout(ocrTimer.current);
}

        ocrTimer.current = setTimeout(() => {
            router.get(
                DocumentoController.index.url(),
                { ...data, texto_ocr: value, page: 1 },
                { preserveScroll: true, preserveState: true, replace: true },
            );
        }, 1500);
    };

    const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            DocumentoController.index.url(),
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
        setSpinKey(k => k + 1);
        const clearedFilters = {
            ...defaultFilters,
            per_page: data.per_page,
        };

        setData(clearedFilters);

        router.get(
            DocumentoController.index.url(),
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
            DocumentoController.index.url(),
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

    const refreshDocumentos = (): void => {
        router.reload({
            only: ['documentos', 'filters', 'remitentes'],
        });
        setTimeout(() => {
            toast.success('Documentos actualizados correctamente');
        }, 1200);
    };

    const paginationLinks = documentos.links ?? [];
    const previousLink = paginationLinks[0] ?? null;
    const nextLink = paginationLinks[paginationLinks.length - 1] ?? null;
    const pageLinks = paginationLinks.slice(1, -1);

    return (
        <>
            <Head
                title={isAdmin ? 'Documentos del sistema' : 'Mis documentos'}
            />

            <div className="mx-auto w-full space-y-6 p-4 md:p-2">
                <Card className="border-none bg-transparent shadow-none">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-xl font-semibold">
                                    {isAdmin
                                        ? 'Documentos del sistema'
                                        : 'Mis documentos'}
                                </h1>
                            </div>
                            {!isAdmin && (
                                <Button
                                    asChild
                                    className="w-full text-white sm:w-auto h-8 bg-primary hover:bg-primary/90 active:scale-95"
                                >
                                    <Link
                                        href={DocumentoController.create.url()}
                                    >
                                        <span className="text-xl">+</span> Nuevo documento
                                    </Link>
                                </Button>
                            )}
                        </div>

                        <form
                            onSubmit={applyFilters}
                            className="mt-2 space-y-4"
                        >
                            {/* Buscador Principal */}
                            <div className="group relative">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary transition-colors group-focus-within:text-blue-500" />
                                <Input
                                    id="texto_ocr"
                                    placeholder="Buscar en contenido OCR, número de oficio, asunto... "
                                    value={data.texto_ocr}
                                    onChange={(e) => handleOcrBusqueda(e.target.value)}
                                    className="h-9 rounded-lg border-border/50 bg-background pl-10 text-[13px] shadow-sm focus-visible:ring-1"
                                />
                            </div>
                            {busqueda_activa && (
                                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                                    <Zap className="size-3 shrink-0" />
                                    <span>Resultados ordenados por relevancia — coincidencias en número de oficio y asunto tienen mayor peso</span>
                                </div>
                            )}

                            {/* Fila de Filtros Compacta */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={data.tipo}
                                        onValueChange={(v) =>
                                            setData('tipo', v)
                                        }
                                    >
                                        <SelectTrigger className="!h-8 w-[110px] rounded-md border-border/50 bg-background text-[12px]">
                                            <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="interno">
                                                Interno
                                            </SelectItem>
                                            <SelectItem value="externo">
                                                Externo
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={data.remitente_id}
                                        onValueChange={(v) =>
                                            setData('remitente_id', v)
                                        }
                                    >
                                        <SelectTrigger className="!h-8 w-[140px] rounded-md border-border/50 bg-background text-[12px]">
                                            <SelectValue placeholder="Remitente" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {remitentes.map((r) => (
                                                <SelectItem
                                                    key={r.id_remitente}
                                                    value={String(
                                                        r.id_remitente,
                                                    )}
                                                >
                                                    {r.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Input
                                    id="palabra_clave"
                                    placeholder="Palabra clave..."
                                    value={data.palabra_clave}
                                    onChange={(e) =>
                                        setData('palabra_clave', e.target.value)
                                    }
                                    className="h-8 w-[140px] rounded-md border-border/50 bg-background text-[12px]"
                                />

                                {/* Rango de Fechas con Popover */}
                                {/* Contenedor con ancho fijo y sin gap para control total */}
                                <div className="flex h-8 w-[280px] items-center rounded-md border border-input bg-background shadow-xs">
                                    {/* Fecha Desde */}
                                    <Popover
                                        open={openDesde}
                                        onOpenChange={setOpenDesde}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                // Eliminamos el padding derecho para que el separador esté centrado
                                                className="h-7 flex-1 justify-start pr-0 pl-2.5 text-[11px] font-normal hover:bg-transparent"
                                            >
                                                <CalendarIcon className="mr-2 size-3.5 shrink-0 text-[var(--secondary-foreground)]/60" />
                                                <span>
                                                    {data.fecha_desde ? (
                                                        format(
                                                            parse(data.fecha_desde, 'yyyy-MM-dd', new Date()),
                                                            'dd/MM/yyyy',
                                                        )
                                                    ) : (
                                                        <span className="text-[var(--secondary-foreground)]/60">
                                                            Desde
                                                        </span>
                                                    )}
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                locale={es}
                                                selected={
                                                    data.fecha_desde
                                                        ? parse(data.fecha_desde, 'yyyy-MM-dd', new Date())
                                                        : undefined
                                                }
                                                onSelect={(date) => {
                                                    setData(
                                                        'fecha_desde',
                                                        date
                                                            ? format(
                                                                  date,
                                                                  'yyyy-MM-dd',
                                                              )
                                                            : '',
                                                    );
                                                    setOpenDesde(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {/* Fecha Hasta */}
                                    <Popover
                                        open={openHasta}
                                        onOpenChange={setOpenHasta}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                // El pl-1 compensa el espacio del separador para que el icono se vea centrado
                                                className="h-7 flex-1 justify-start pr-2.5 pl-1 text-[11px] font-normal hover:bg-transparent"
                                            >
                                                <CalendarIcon className="mr-2 size-3.5 shrink-0 text-[var(--secondary-foreground)]/60" />
                                                <span>
                                                    {data.fecha_hasta ? (
                                                        format(
                                                            parse(data.fecha_hasta, 'yyyy-MM-dd', new Date()),
                                                            'dd/MM/yyyy',
                                                        )
                                                    ) : (
                                                        <span className="text-[var(--secondary-foreground)]/60">
                                                            Hasta
                                                        </span>
                                                    )}
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                locale={es}
                                                selected={
                                                    data.fecha_hasta
                                                        ? parse(data.fecha_hasta, 'yyyy-MM-dd', new Date())
                                                        : undefined
                                                }
                                                onSelect={(date) => {
                                                    setData(
                                                        'fecha_hasta',
                                                        date
                                                            ? format(
                                                                  date,
                                                                  'yyyy-MM-dd',
                                                              )
                                                            : '',
                                                    );
                                                    setOpenHasta(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Botones */}
                                <div className="ml-auto flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={clearFilters}
                                        className="h-8 w-8 rounded-md p-0 text-muted-foreground hover:bg-muted"
                                    >
                                        <RotateCcw
                                            key={spinKey}
                                            className={cn(
                                                'size-3.5',
                                                spinKey > 0 && 'animate-spin [animation-iteration-count:1] [animation-direction:reverse]',
                                            )}
                                        />
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-8 rounded-md bg-primary px-4 text-[12px] font-medium text-white shadow-sm hover:bg-primary/90 active:scale-95"
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardHeader>


                    <CardContent>
                        <div className="mb-4 flex flex-col gap-4 border-border/40 md:flex-row md:items-center md:justify-between">
                            {/* Izquierda: Selector de cantidad por página */}
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] text-muted-foreground">
                                    Mostrar
                                </span>
                                <Select
                                    value={data.per_page}
                                    onValueChange={changePerPage}
                                >
                                    <SelectTrigger className="!h-8 !w-[70px] border-border/50 bg-transparent text-[12px] font-medium shadow-none focus:ring-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className=''>
                                        <SelectItem
                                            value="5"
                                        >
                                            5
                                        </SelectItem>
                                        <SelectItem
                                            value="7"
                                        >
                                            7
                                        </SelectItem>
                                        <SelectItem
                                            value="10"
                                        >
                                            10
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <span className="text-[12px] text-muted-foreground">
                                    por página
                                </span>
                            </div>

                            {/* Derecha: Info de resultados y Paginación compacta */}
                            <div className="flex items-center gap-4">
                                <p className="border-r border-border/50 pr-4 text-[11px] font-medium text-muted-foreground/60">
                                    {documentos.total > 0
                                        ? `${documentos.from ?? 0}-${documentos.to ?? 0} de ${documentos.total}`
                                        : '0 resultados'}
                                </p>

                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent className="gap-1">
                                        {/* Botón Anterior - Solo el icono */}
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
                                                className={`h-8 w-8 rounded-md border-border/40 p-0 hover:bg-muted ${
                                                    !previousLink?.url
                                                        ? 'pointer-events-none opacity-40'
                                                        : ''
                                                }`}
                                            />
                                        </PaginationItem>

                                        {/* Números de página */}
                                        {pageLinks.map((link, idx) => (
                                            <PaginationItem key={idx}>
                                                <PaginationLink
                                                    href={link.url ?? '#'}
                                                    isActive={link.active}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        goToPaginationUrl(
                                                            link.url,
                                                        );
                                                    }}
                                                    className={`h-8 min-w-[32px] rounded-md text-[11px] transition-all ${
                                                        link.active
                                                            ? 'bg-[var(--primary)]  hover:bg-[var(--primary)]/80 hover:text-white text-white '
                                                            : 'border-transparent text-muted-foreground hover:bg-muted'
                                                    } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                                >
                                                    {/* Limpiamos las etiquetas de Laravel para dejar SOLO el número */}
                                                    {link.label
                                                        .replace(
                                                            '&laquo; Previous',
                                                            '',
                                                        )
                                                        .replace(
                                                            'Next &raquo;',
                                                            '',
                                                        )
                                                        .replace('...', '..')}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        {/* Botón Siguiente - Solo el icono */}
                                        <PaginationItem>
                                            <PaginationNext
                                                href={nextLink?.url ?? '#'}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    goToPaginationUrl(
                                                        nextLink?.url ?? null,
                                                    );
                                                }}
                                                className={`h-8 w-8 rounded-md border-border/40 p-0 hover:bg-muted ${
                                                    !nextLink?.url
                                                        ? 'pointer-events-none opacity-40'
                                                        : ''
                                                }`}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>
                        <div className="rounded-lg md:border md:border-[var(--border)]">
                            <DataTable
                                documentos={documentos.data}
                                canDelete={true}
                                isAdmin={isAdmin}
                                currentUserId={currentUserId}
                                currentUserAreaId={currentUserAreaId}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
