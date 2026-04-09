import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
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
import DataTable from '@/pages/user/documentos/data-table';
import type { DocumentoListado } from '@/pages/user/documentos/data-table';

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

export default function Index({ documentos, remitentes, filters }: Props) {
    const { auth } = usePage().props as {
        auth?: { user?: { id_user?: number; rol?: string } | null };
        flash?: { success?: string | null };
    };

    const isAdmin = auth?.user?.rol === 'admin';
    const currentUserId = auth?.user?.id_user ?? null;
    const { data, setData } = useForm<FilterState>({
        ...defaultFilters,
        ...filters,
    });

    const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(DocumentoController.index.url(), {
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

        router.get(DocumentoController.index.url(), {
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

        router.get(DocumentoController.index.url(), {
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

    return (
        <>
            <Head
                title={isAdmin ? 'Documentos del sistema' : 'Mis documentos'}
            />

            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {isAdmin
                                ? 'Documentos del sistema'
                                : 'Mis documentos'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin
                                ? 'Listado global de documentos con su respectivo dueño.'
                                : 'Historial de documentos que has subido al sistema.'}
                        </p>
                    </div>
                    {!isAdmin && (
                        <Button asChild>
                            <Link href={DocumentoController.create.url()}>
                                Nuevo documento
                            </Link>
                        </Button>
                    )}
                </div>

                <Card className='border-none'>
                    <CardHeader>
                        <form onSubmit={applyFilters} className="space-y-3">
                            <div className="min-w-0 space-y-1.5">
                                <Label
                                    htmlFor="texto_ocr"
                                    className="text-xs font-medium text-slate-500"
                                >
                                    Texto dentro del PDF
                                </Label>
                                <Input
                                    id="texto_ocr"
                                    placeholder="Buscar dentro del documento..."
                                    value={data.texto_ocr}
                                    onChange={(event) =>
                                        setData('texto_ocr', event.target.value)
                                    }
                                    className="h-9 text-[13px]"
                                />
                            </div>

                                   <div className="flex flex-wrap items-end gap-3">
                                        <div className="min-w-[130px] flex-1">
                                            <Label className="text-xs font-medium text-slate-500 ">Tipo</Label>
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

                                        <div className="min-w-[150px] flex-1 ">
                                            <Label className="text-xs font-medium text-slate-500">Remitente</Label>
                                            <Select value={data.remitente_id} onValueChange={(value) => setData('remitente_id', value)}>
                                                <SelectTrigger className="h-9 w-full bg-background text-[13px] ">
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

                                        <div className="min-w-[150px] flex-1 space-y-1.5">
                                            <Label htmlFor="palabra_clave" className="text-xs font-medium text-slate-500">
                                                Palabra clave
                                            </Label>
                                            <Input
                                                id="palabra_clave"
                                                placeholder="Buscar..."
                                                value={data.palabra_clave}
                                                onChange={(e) => setData('palabra_clave', e.target.value)}
                                                className="h-9 text-[13px]"
                                            />
                                        </div>

                                        <div className="min-w-[140px] flex-1 space-y-1.5">
                                            <Label htmlFor="fecha_desde" className="text-xs font-medium text-slate-500">
                                                Desde
                                            </Label>
                                            <Input
                                                id="fecha_desde"
                                                type="date"
                                                value={data.fecha_desde}
                                                onChange={(e) => setData('fecha_desde', e.target.value)}
                                                className="h-9 text-[13px]"
                                            />
                                        </div>

                                        <div className="min-w-[140px] flex-1 space-y-1.5">
                                            <Label htmlFor="fecha_hasta" className="text-xs font-medium text-slate-500">
                                                Hasta
                                            </Label>
                                            <Input
                                                id="fecha_hasta"
                                                type="date"
                                                value={data.fecha_hasta}
                                                onChange={(e) => setData('fecha_hasta', e.target.value)}
                                                className="h-9 text-[13px]"
                                            />
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                            <Button
                                                type="submit"
                                                className="h-9 bg-blue-600 px-5 text-[13px] font-medium text-white shadow-sm hover:bg-blue-700"
                                            >
                                                Aplicar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={clearFilters}
                                                className="h-9 border-slate-300 px-5 text-[13px] font-medium hover:bg-slate-50"
                                            >
                                                Limpiar
                                            </Button>
                                        </div>
                                    </div>
                        </form>
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
                                                    goToPaginationUrl(
                                                        previousLink?.url ??
                                                            null,
                                                    );
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
                                                        goToPaginationUrl(
                                                            link.url,
                                                        );
                                                    }}
                                                    className={!link.url ? 'pointer-events-none opacity-50' : ''}
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
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    goToPaginationUrl(
                                                        nextLink?.url ?? null,
                                                    );
                                                }}
                                                className={!nextLink?.url ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        </div>

                        <DataTable
                            documentos={documentos.data}
                            canDelete={!isAdmin}
                            currentUserId={currentUserId}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
