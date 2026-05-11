import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
// Utilidad local para concatenar clases (igual que en movimientos)
const cn = (...classes: (string | boolean | undefined | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie,
    XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, FileText, BellDot, ArrowRight } from 'lucide-react';
import { dashboard } from '@/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

type Periodo = 'semana' | 'mes' | 'año' | 'todos';

interface Stats {
    usuariosActivos: number;
    pendientesAprobacion: number;
    totalDocumentos: number;
    alertasActivas: number;
}

interface MesData    { mes: string;   total: number }
interface AreaData   { area: string;  total: number }
interface AlertaData { nivel: string; total: number; fill: string }

interface UsuarioPendiente {
    id_user: number;
    nombre: string;
    apellido: string;
    email: string;
    created_at: string;
    area: { nombre: string } | null;
}

interface Props {
    stats: Stats;
    porMes: MesData[];
    porArea: AreaData[];
    alertasPorNivel: AlertaData[];
    usuariosPendientes: UsuarioPendiente[];
    periodoSeleccionado: Periodo;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

function cambiarPeriodo(periodo: Periodo) {
    router.get(dashboard(), { periodo }, { preserveScroll: true, preserveState: false });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

// ─── Chart configs ────────────────────────────────────────────────────────────

const mesConfig = {
    total: { label: 'Documentos', color: 'hsl(262 80% 58%)' },
} satisfies ChartConfig;

const areaConfig = {
    total: { label: 'Documentos', color: 'hsl(220 90% 56%)' },
} satisfies ChartConfig;

const alertaConfig = {
    Media:     { label: 'Media',     color: 'hsl(38 92% 50%)' },
    Alta:      { label: 'Alta',      color: 'hsl(0 84% 60%)' },
    Bloqueado: { label: 'Bloqueado', color: 'hsl(220 10% 55%)' },
} satisfies ChartConfig;


// ─── Component ────────────────────────────────────────────────────────────────

import { usePage } from '@inertiajs/react';

export default function AdminDashboard({ stats, porMes, porArea, alertasPorNivel, usuariosPendientes, periodoSeleccionado }: Props) {
    const [refreshing, setRefreshing] = useState(false);

    const refreshDashboard = (): void => {
        if (refreshing) return;
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
            only: ['stats', 'porMes', 'porArea', 'alertasPorNivel', 'usuariosPendientes'],
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

    const statItems = [
        {
            title: 'Usuarios activos',
            value: stats.usuariosActivos,
            sub: 'aprobados y habilitados',
            icon: UserCheck,
            href: '/admin/usuarios',
            alert: false,
        },
        {
            title: 'Pendientes de aprobación',
            value: stats.pendientesAprobacion,
            sub: 'usuarios en espera',
            icon: Users,
            href: '/admin/usuarios',
            alert: stats.pendientesAprobacion > 0,
        },
        {
            title: 'Documentos en sistema',
            value: stats.totalDocumentos,
            sub: `registrados — ${desc.toLowerCase()}`,
            icon: FileText,
            href: '/admin/documentos/eliminados',
            alert: false,
        },
        {
            title: 'Alertas sin leer',
            value: stats.alertasActivas,
            sub: 'en todo el sistema',
            icon: BellDot,
            href: '/admin/monitoreo',
            alert: stats.alertasActivas > 0,
        },
    ];

    const totalAlertas = alertasPorNivel.reduce((s: number, e: { total: number }) => s + e.total, 0);

    // Obtener el usuario autenticado desde las props globales de Inertia
    const { auth } = usePage().props as { auth: { user?: { nombre?: string; apellido?: string; name?: string } } };
    const nombre = auth?.user?.nombre || auth?.user?.name || '';
    const apellido = auth?.user?.apellido || '';

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-5 p-4 md:p-6">
                <div className='inline-flex items-start justify-between gap-2'>
                    <h1 className='text-2xl font-bold'>
                        Bienvenido de nuevo, {nombre || apellido ? `  ${nombre} ${apellido}` : ''}
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
                        <Button type="button" size="sm" variant="outline" onClick={refreshDashboard} disabled={refreshing}>
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
                        {statItems.map(({ title, value, sub, icon: Icon, href, alert }) => (
                            <Link
                                key={title}
                                href={href}
                                className="group flex flex-col gap-3 p-5 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">{title}</span>
                                    <Icon className={`h-3.5 w-3.5 transition-colors ${alert ? 'text-amber-500' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`} />
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
                            </Link>
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
                                        <linearGradient id="gradAdmin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(262 80% 58%)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="hsl(262 80% 58%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Area type="basis" dataKey="total" stroke="hsl(262 80% 58%)" strokeWidth={2} fill="url(#gradAdmin)" dot={false} activeDot={false} isAnimationActive={true} animationDuration={1200} />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="min-w-0">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Documentos por área</CardTitle>
                            <CardDescription className="text-xs">{desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            <ChartContainer config={areaConfig} className="h-[200px] w-full">
                                <BarChart data={porArea} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                                    <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                                    <YAxis
                                        type="category"
                                        dataKey="area"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 10 }}
                                        className="fill-muted-foreground"
                                        width={80}
                                        tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + '…' : v}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" hideLabel />} />
                                        <Bar dataKey="total" fill="hsl(220 90% 56%)" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={true} animationDuration={1200} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Bottom ────────────────────────────────────────── */}
                <div className="grid gap-5 lg:grid-cols-3 min-w-0">

                    {/* Usuarios pendientes */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-sm font-medium">Usuarios pendientes</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    {usuariosPendientes.length === 0
                                        ? 'Ninguno en espera'
                                        : `${usuariosPendientes.length} esperando revisión`}
                                </CardDescription>
                            </div>
                            <Link href="/admin/usuarios" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Ver todos <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>

                        <CardContent className="p-0">
                            {usuariosPendientes.length === 0 ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                                    <UserCheck className="h-4 w-4 opacity-40" />
                                    <span className="text-sm">Todo al día</span>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-y bg-muted/30">
                                            <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Usuario</th>
                                            <th className="hidden px-4 py-2 text-left text-xs font-medium text-muted-foreground md:table-cell">Área</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Registro</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {usuariosPendientes.map((u) => (
                                            <tr
                                                key={u.id_user}
                                                className="cursor-pointer transition-colors hover:bg-muted/40"
                                                onClick={() => window.location.href = `/admin/usuarios/${u.id_user}`}
                                            >
                                                <td className="px-5 py-3">
                                                    <p className="font-medium leading-tight">{u.nombre} {u.apellido}</p>
                                                    <p className="text-[11px] text-muted-foreground">{u.email}</p>
                                                </td>
                                                <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                                                    {u.area?.nombre ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-[11px] text-muted-foreground">
                                                    {formatDate(u.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Alertas por nivel */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Alertas activas</CardTitle>
                            <CardDescription className="text-xs">Por nivel de prioridad</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {totalAlertas === 0 ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                                    <BellDot className="h-4 w-4 opacity-40" />
                                    <span className="text-sm">Sin alertas activas</span>
                                </div>
                            ) : (
                                <>
                                    <ChartContainer config={alertaConfig} className="h-[160px] w-full">
                                        <PieChart>
                                            <ChartTooltip content={<ChartTooltipContent nameKey="nivel" hideLabel />} />
                                            <Pie data={alertasPorNivel} dataKey="total" nameKey="nivel" cx="50%" cy="50%" innerRadius={46} outerRadius={68} strokeWidth={2} isAnimationActive={false} />
                                        </PieChart>
                                    </ChartContainer>

                                    <div className="flex flex-col gap-2 border-t pt-3">
                                        {alertasPorNivel.map((entry) => {
                                            const pct = totalAlertas > 0 ? Math.round((entry.total / totalAlertas) * 100) : 0;
                                            return (
                                                <div key={entry.nivel} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                        <span className="text-xs text-muted-foreground">{entry.nivel}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-medium tabular-nums">{entry.total}</span>
                                                        <span className="text-xs text-muted-foreground">({pct}%)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
