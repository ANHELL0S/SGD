import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Bell, Check, AlertTriangle, AlertOctagon, Lock, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Nivel = 'media' | 'alta' | 'bloqueado' | 'recordatorio';

type Alerta = {
    id: number;
    movimiento_id: number;
    nivel: Nivel;
    asunto: string | null;
    leido_at: string | null;
    created_at: string;
    dias_restantes: number;
    bloqueado: boolean;
    ya_respondido: boolean;
};

const nivelConfig: Record<Nivel, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    media:        { label: 'Prioridad media',       color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
    alta:         { label: 'Prioridad alta',         color: 'text-red-600',    bg: 'bg-red-50',    icon: AlertOctagon },
    bloqueado:    { label: 'Bloqueado',              color: 'text-gray-500',   bg: 'bg-gray-50',   icon: Lock },
    recordatorio: { label: 'Recordatorio del consultor', color: 'text-blue-600', bg: 'bg-blue-50', icon: BellRing },
};

const formatRelative = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'ahora mismo';
    if (mins < 60)  return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
};

const getCsrfToken = (): string => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

export function NotificacionesBell() {
    const [alertas, setAlertas]     = useState<Alerta[]>([]);
    const [noLeidas, setNoLeidas]   = useState(0);
    const [open, setOpen]           = useState(false);
    const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchAlertas = async () => {
        try {
            const res = await fetch('/user/alertas', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!res.ok) return;
            const data = await res.json();
            setAlertas(data.alertas ?? []);
            setNoLeidas(data.no_leidas ?? 0);
        } catch {
            // ignore network errors silently
        }
    };

    useEffect(() => {
        fetchAlertas();
        intervalRef.current = setInterval(fetchAlertas, 30_000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const marcarLeida = async (id: number) => {
        await fetch(`/user/alertas/${id}/leer`, {
            method: 'PATCH',
            headers: { 'X-XSRF-TOKEN': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
        });
        setAlertas(prev => prev.map(a => a.id === id ? { ...a, leido_at: new Date().toISOString() } : a));
        setNoLeidas(prev => Math.max(0, prev - 1));
    };

    const marcarTodasLeidas = async () => {
        await fetch('/user/alertas/leer-todas', {
            method: 'PATCH',
            headers: { 'X-XSRF-TOKEN': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
        });
        setAlertas(prev => prev.map(a => ({ ...a, leido_at: a.leido_at ?? new Date().toISOString() })));
        setNoLeidas(0);
    };

    const handleAlertaClick = async (alerta: Alerta) => {
        if (!alerta.leido_at) await marcarLeida(alerta.id);
        setOpen(false);
        const url = (alerta.bloqueado || alerta.ya_respondido)
            ? `/user/movimientos/${alerta.movimiento_id}`
            : `/user/movimientos/${alerta.movimiento_id}/responder`;
        router.visit(url);
    };

    const getTiempoTexto = (alerta: Alerta): string => {
        if (alerta.ya_respondido) {
            return 'Ya respondido — ver detalle';
        }
        if (alerta.bloqueado) {
            return 'Plazo vencido — ya no se puede responder';
        }
        if (alerta.dias_restantes === 0) {
            return 'Último día para responder';
        }
        return `Te quedan ${alerta.dias_restantes} día${alerta.dias_restantes !== 1 ? 's' : ''} hábil${alerta.dias_restantes !== 1 ? 'es' : ''} para responder`;
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5 opacity-80" />
                    {noLeidas > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                            {noLeidas > 9 ? '9+' : noLeidas}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-88 p-0" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold">Alertas de prioridad</p>
                        {noLeidas > 0 && (
                            <p className="text-xs text-muted-foreground">{noLeidas} sin leer</p>
                        )}
                    </div>
                    {noLeidas > 0 && (
                        <button
                            onClick={marcarTodasLeidas}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Check className="h-3 w-3" />
                            Marcar todas
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="max-h-[26rem] overflow-y-auto">
                    {alertas.length === 0 ? (
                        <div className="py-10 text-center">
                            <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">Sin alertas recientes</p>
                        </div>
                    ) : (
                        alertas.map((alerta) => {
                            const cfg   = nivelConfig[alerta.nivel];
                            const Icon  = cfg.icon;
                            const leida = alerta.leido_at !== null;

                            return (
                                <button
                                    key={alerta.id}
                                    onClick={() => handleAlertaClick(alerta)}
                                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors hover:bg-muted/50 ${
                                        leida ? 'opacity-55' : cfg.bg
                                    }`}
                                >
                                    {/* Icono nivel */}
                                    <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${leida ? 'bg-muted' : 'bg-white/80'}`}>
                                        <Icon className={`h-3.5 w-3.5 ${leida ? 'text-muted-foreground' : cfg.color}`} />
                                    </div>

                                    {/* Contenido */}
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-semibold ${leida ? 'text-muted-foreground' : cfg.color}`}>
                                            {cfg.label}
                                        </p>
                                        <p className="mt-0.5 text-xs font-medium text-foreground leading-snug line-clamp-2">
                                            {alerta.nivel === 'recordatorio'
                                                ? <>El consultor te recuerda: &quot;{alerta.asunto ?? `#${alerta.movimiento_id}`}&quot; está pendiente</>
                                                : <>La solicitud &quot;{alerta.asunto ?? `#${alerta.movimiento_id}`}&quot; necesita respuesta</>
                                            }
                                        </p>
                                        <p className={`mt-1 text-[11px] leading-tight ${alerta.bloqueado ? 'text-gray-500' : 'text-muted-foreground'}`}>
                                            {getTiempoTexto(alerta)}
                                        </p>
                                        <p className="mt-1 text-[10px] text-muted-foreground/50">
                                            {formatRelative(alerta.created_at)}
                                        </p>
                                    </div>

                                    {/* Punto no leído */}
                                    {!leida && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {alertas.length > 0 && (
                    <div className="border-t px-4 py-2 text-center">
                        <p className="text-[10px] text-muted-foreground/60">
                            Haz clic en una alerta para ir directamente a responder
                        </p>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
