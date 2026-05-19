import { Head, Link, router, usePage } from '@inertiajs/react';
import { FileText, Clock, ArrowRightLeft, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie,
    XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
    
} from '@/components/ui/chart';
import type {ChartConfig} from '@/components/ui/chart';
// Utilidad local para concatenar clases (igual que en movimientos)
const cn = (...classes: (string | boolean | undefined | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};
import { dashboard } from '@/routes';
// ─── Types ───────────────────────────────────────────────────────────────────

type Periodo = 'semana' | 'mes' | 'año' | 'todos';

interface Stats {
    totalDocumentos: number;
    pendientes: number;
    movimientosPendientes: number;
    respondidos: number;
}

interface EstadoData  { estado: string; total: number; fill: string }
interface TipoData    { tipo: string;   total: number; fill: string }
interface MesData     { mes: string;    total: number }

interface UltimoDocumento {
    id_documento: number;
    numero_oficio: string;
    asunto: string;
    tipo: 'interno' | 'externo';
    recibido: string;
    fecha_oficio: string | null;
    created_at: string;
    remitente: { nombre: string } | null;
    area: { nombre: string } | null;
}

interface Props {
    stats: Stats;
    porEstado: EstadoData[];
    porTipo: TipoData[];
    porMes: MesData[];
    periodoSeleccionado: Periodo;
    ultimosDocumentos: UltimoDocumento[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'semana', label: 'Semana' },
    { key: 'mes',    label: 'Mes'    },
    { key: 'año',    label: 'Año'    },
    { key: 'todos',  label: 'Todos'  },
];

const PERIODO_DESC: Record<Periodo, string> = {
    semana: 'Esta semana',
    mes:    'Este mes',
    año:    'Este año',
    todos:  'Todo el historial',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const estadoMeta: Record<string, { label: string; className: string }> = {
    recibido:    { label: 'Recibido',    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    enviado:     { label: 'Enviado',     className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
    en_revision: { label: 'En revisión', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    aprobado:    { label: 'Aprobado',    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    rechazado:   { label: 'Rechazado',   className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    respondido:  { label: 'Respondido',  className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
};

function EstadoBadge({ value }: { value: string }) {
    const cfg = estadoMeta[value] ?? { label: value, className: 'bg-gray-100 text-gray-700' };

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) {
return '—';
}

    return new Date(dateStr).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function cambiarPeriodo(periodo: Periodo) {
    router.get(dashboard(), { periodo }, { preserveScroll: true, preserveState: false });
}

// ─── Chart configs ───────────────────────────────────────────────────────────

const mesConfig = {
    total: { label: 'Documentos', color: 'hsl(220 90% 56%)' },
} satisfies ChartConfig;

const estadoChartConfig = {
    total: { label: 'Total', color: 'hsl(220 90% 56%)' },
} satisfies ChartConfig;

const tipoConfig = {
    Interno: { label: 'Interno', color: 'hsl(220 90% 56%)' },
    Externo: { label: 'Externo', color: 'hsl(187 85% 43%)' },
} satisfies ChartConfig;

// ─── Component ───────────────────────────────────────────────────────────────


import { useState } from 'react';

export default function UserDashboard({ stats, porEstado, porTipo, porMes, periodoSeleccionado, ultimosDocumentos }: Props) {
    const [refreshing, setRefreshing] = useState(false);

    const refreshMovimientos = (): void => {
        if (refreshing) {
return;
}

        setRefreshing(true);

        let finished = false;
        let minTimeReached = false;
        let succeeded = false;
        const release = () => {
            if (finished && minTimeReached) {
                setRefreshing(false);

                if (succeeded) {
                    toast.success('Dashboard actualizado correctamente');
                }
            }
        };

        setTimeout(() => {
            minTimeReached = true;
            release();
        }, 1500);

        router.reload({
            only: ['stats', 'porEstado', 'porTipo', 'porMes', 'ultimosDocumentos'],
            onSuccess: () => {
                succeeded = true;
            },
            onFinish: () => {
                finished = true;
                release();
            },
        });
    };
    // Si el backend no envía periodoSeleccionado, usar 'todos' por defecto
    const periodo = periodoSeleccionado ?? 'todos';
    const desc = PERIODO_DESC[periodo];
    const totalTipo = porTipo.reduce((s, e) => s + e.total, 0);

    // Obtener el usuario autenticado desde las props globales de Inertia
    const { auth } = usePage().props as { auth: { user?: { nombre?: string; apellido?: string; name?: string } } };
    const nombre = auth?.user?.nombre || auth?.user?.name || '';
    const apellido = auth?.user?.apellido || '';

    const statItems = [
        {
            title: 'Mis documentos',
            value: stats.totalDocumentos,
            sub: `registrados — ${desc.toLowerCase()}`,
            icon: FileText,
            alert: false,
        },
        {
            title: 'Pendientes',
            value: stats.pendientes,
            sub: 'recibidos y en revisión',
            icon: Clock,
            alert: stats.pendientes > 0,
        },
        {
            title: 'Por responder',
            value: stats.movimientosPendientes,
            sub: 'movimientos hacia tu área',
            icon: ArrowRightLeft,
            alert: stats.movimientosPendientes > 0,
        },
        {
            title: 'Respondidos',
            value: stats.respondidos,
            sub: `con respuesta — ${desc.toLowerCase()}`,
            icon: CheckCircle2,
            alert: false,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-6">
                 <div className=" inline-flex items-start justify-between gap-2">
                    <h1 className="text-2xl font-bold mb-2">
                        Bienvenido de nuevo, {nombre || apellido ? ` ${nombre} ${apellido}` : ''}
                    </h1>

                    <div className="flex items-center gap-2">
                    <div className="flex gap-1 rounded-md border p-0.5">
                                    {PERIODOS.map(({ key, label }) => (
                                        <Button
                                            key={key}
                                            size="sm"
                                            variant={periodo === key ? 'default' : 'ghost'}
                                            onClick={() => cambiarPeriodo(key)}
                                            className="h-6 px-2 text-xs"
                                        >
                                            {label}
                                        </Button>
                                    ))}
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={refreshMovimientos} disabled={refreshing}>
                        <RefreshCw className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            refreshing ? 'duration-[1500ms] rotate-[360deg]' : 'duration-0',
                        )} />
                        Actualizar
                    </Button>
                    </div>

                </div>

                {/* ── Stats strip ───────────────────────────────────── */}
                <Card className="overflow-hidden py-0">
                    <div className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0">
                        {statItems.map(({ title, value, sub, icon: Icon, alert }) => (
                            <div key={title} className="flex flex-col gap-3 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">{title}</span>
                                    <Icon className={`h-3.5 w-3.5 ${alert ? 'text-amber-500' : 'text-muted-foreground/50'}`} />
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className={`text-3xl font-bold leading-none tracking-tight ${alert ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                        {value}
                                    </span>
                                    {alert && value > 0 && (
                                        <span className="mb-0.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">{sub}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── Charts ────────────────────────────────────────── */}
                <div className="grid gap-5 lg:grid-cols-2">

                    <Card className="min-w-0">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-medium">Actividad</CardTitle>
                                    <CardDescription className="text-xs">{desc}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            <ChartContainer config={mesConfig} className="h-[200px] w-full">
                                <AreaChart data={porMes} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(220 90% 56%)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="hsl(220 90% 56%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                    <Area type="basis" dataKey="total" stroke="hsl(220 90% 56%)" strokeWidth={2} fill="url(#gradTotal)" dot={false} activeDot={false} isAnimationActive={true} animationDuration={1200} />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="min-w-0">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Por estado</CardTitle>
                            <CardDescription className="text-xs">{desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            <ChartContainer config={estadoChartConfig} className="h-[200px] w-full">
                                <BarChart data={porEstado} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                                    <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis
                                        type="category"
                                        dataKey="estado"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                        className="fill-muted-foreground"
                                        width={70}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" hideLabel />} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={true} animationDuration={1200} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Bottom ────────────────────────────────────────── */}
                <div className="grid gap-5 lg:grid-cols-3 min-w-0">

                    {/* Documentos recientes */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-sm font-medium">Documentos recientes</CardTitle>
                                <CardDescription className="text-xs mt-0.5">Tus últimos 5 registros</CardDescription>
                            </div>
                            <Link href="/user/documentos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Ver todos <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            {ultimosDocumentos.length === 0 ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                                    <FileText className="h-4 w-4 opacity-40" />
                                    <span className="text-sm">Sin documentos aún</span>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-y bg-muted/30">
                                            <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Documento</th>
                                            <th className="hidden px-4 py-2 text-left text-xs font-medium text-muted-foreground md:table-cell">Remitente</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {ultimosDocumentos.map((doc) => (
                                            <tr
                                                key={doc.id_documento}
                                                className="cursor-pointer transition-colors hover:bg-muted/40"
                                                onClick={() => window.location.href = `/user/documentos/${doc.id_documento}/edit`}
                                            >
                                                <td className="px-5 py-3">
                                                    <p className="font-medium leading-tight truncate max-w-[200px]">
                                                        {doc.asunto || doc.numero_oficio || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        {doc.numero_oficio} · {formatDate(doc.fecha_oficio ?? doc.created_at)}
                                                    </p>
                                                </td>
                                                <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                                                    {doc.remitente?.nombre ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <EstadoBadge value={doc.recibido} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tipo de documento */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Tipo de documento</CardTitle>
                            <CardDescription className="text-xs">{desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <ChartContainer config={tipoConfig} className="h-[160px] w-full">
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="tipo" hideLabel />} />
                                    <Pie data={porTipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" innerRadius={46} outerRadius={68} strokeWidth={2} isAnimationActive={false} />
                                </PieChart>
                            </ChartContainer>

                            <div className="flex flex-col gap-2 border-t pt-3">
                                {porTipo.map((entry) => {
                                    const pct = totalTipo > 0 ? Math.round((entry.total / totalTipo) * 100) : 0;

                                    return (
                                        <div key={entry.tipo} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                <span className="text-xs text-muted-foreground">{entry.tipo}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium tabular-nums">{entry.total}</span>
                                                <span className="text-xs text-muted-foreground">({pct}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

UserDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
