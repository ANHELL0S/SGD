import { Head, router } from '@inertiajs/react';
import { dashboard } from '@/routes';
import {
    Activity,
    ArrowLeft,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    Copy,
    FileJson,
    Globe,
    Hash,
    MessageSquare,
    Monitor,
    Network,
    Tag,
    Timer,
    User,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

import { index as adminMonitoreoIndex } from '@/routes/admin/monitoreo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// UTILIDADES
// ============================================================================

function isNil(value) {
    return value === null || value === undefined;
}

function normalizePayload(payload) {
    if (isNil(payload) || payload === '') return null;
    if (typeof payload === 'string') {
        try { return JSON.parse(payload); } catch { return payload; }
    }
    return payload;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-EC', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'America/Guayaquil',
    });
}

function getSeverityConfig(tipo) {
    const t = String(tipo).toLowerCase();
    if (['error', 'critical', 'alert', 'emergency'].includes(t)) return {
        bar:    'bg-red-500',
        badge:  'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400',
        ring:   'border-red-200 dark:border-red-800 ring-1 ring-red-200/60 dark:ring-red-800/60',
    };
    if (['warning', 'notice'].includes(t)) return {
        bar:    'bg-amber-400',
        badge:  'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
        ring:   'border-amber-200 dark:border-amber-800',
    };
    if (t === 'debug') return {
        bar:    'bg-sky-400',
        badge:  'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400',
        ring:   '',
    };
    if (t === 'http') return {
        bar:    'bg-indigo-400',
        badge:  'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400',
        ring:   '',
    };
    return {
        bar:    'bg-emerald-500',
        badge:  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
        ring:   '',
    };
}

function getStatusConfig(code) {
    if (!code) return { badge: 'border-border bg-muted text-muted-foreground' };
    if (code < 300) return { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' };
    if (code < 400) return { badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400' };
    if (code < 500) return { badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400' };
    return { badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400' };
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function SectionHeader({ icon: Icon, title, count }) {
    return (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
            {count !== undefined && (
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                    {count}
                </Badge>
            )}
        </div>
    );
}

function InfoRow({ icon: Icon, label, children, mono = false }) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                </p>
                <div className={cn('text-sm text-foreground break-words', mono && 'font-mono text-xs')}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function CollapsiblePayload({ icon: Icon, title, data }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const normalized = normalizePayload(data);
    if (isNil(normalized)) return null;

    const json = typeof normalized === 'string'
        ? normalized
        : JSON.stringify(normalized, null, 2);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(json).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <button
                className="w-full flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 hover:bg-muted/40 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 text-left">{title}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={handleCopy}
                >
                    {copied
                        ? <><Check className="h-3 w-3 text-emerald-500" /> Copiado</>
                        : <><Copy className="h-3 w-3" /> Copiar</>
                    }
                </Button>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="px-4 py-3">
                    <pre className="overflow-x-auto rounded-lg bg-muted/50 border border-border/50 p-3 text-[11px] font-mono text-foreground leading-relaxed">
                        {json}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Show({ log }) {
    const contexto = normalizePayload(log.contexto);
    const userLabel = log.user ? `${log.user.nombre} ${log.user.apellido}`.trim() : '-';
    const severity = getSeverityConfig(log.tipo);
    const statusCfg = getStatusConfig(log.status_code);
    const hasHttp = log.metodo_http || log.endpoint || log.status_code || log.tiempo_respuesta;
    const hasPayloads = normalizePayload(log.request_payload) || normalizePayload(log.response_payload) || contexto;

    return (
        <>
            <Head title={`Log #${log.id_log}`} />

            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 space-y-4">

                {/* ── Header ── */}
                <div className="flex items-start gap-3">
                    <Button
                        asChild={false}
                        variant="ghost"
                        size="icon"
                        className="rounded-full shrink-0 mt-0.5"
                        onClick={() => router.visit(adminMonitoreoIndex.url())}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex gap-2 flex-wrap items-center">
                            <h1 className="text-xl font-semibold leading-tight">
                                Log <span className="font-mono">#{log.id_log}</span>
                            </h1>
                            <div className="flex items-center gap-1 ml-auto">
                                <Badge variant="outline" className={cn('text-xs', severity.badge)}>
                                    {log.tipo}
                                </Badge>
                                {log.status_code && (
                                    <Badge variant="outline" className={cn('text-xs font-mono', statusCfg.badge)}>
                                        {log.status_code}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {log.mensaje}
                        </p>
                    </div>
                </div>

                {/* ── Grid principal ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 items-start">

                    {/* ── Columna izquierda — metadatos ── */}
                    <div className="space-y-4">

                        {/* Card identificación con barra lateral de severidad */}
                        <div className={cn('relative rounded-xl border bg-card overflow-hidden', severity.ring)}>
                            <div className={cn('absolute top-0 bottom-0 left-0 w-1', severity.bar)} />
                            <SectionHeader icon={Tag} title="Identificación" />
                            <div className="px-4 py-1 pl-5">
                                <InfoRow icon={Hash} label="ID">
                                    <span className="font-mono">{log.id_log}</span>
                                </InfoRow>
                                <InfoRow icon={Activity} label="Tipo">
                                    <Badge variant="outline" className={cn('text-xs', severity.badge)}>
                                        {log.tipo}
                                    </Badge>
                                </InfoRow>
                                <InfoRow icon={Calendar} label="Fecha / hora">
                                    {formatDate(log.created_at)}
                                </InfoRow>
                                <InfoRow icon={MessageSquare} label="Mensaje">
                                    <span className="leading-relaxed">{log.mensaje}</span>
                                </InfoRow>
                            </div>
                        </div>

                        {/* Card HTTP */}
                        {hasHttp && (
                            <div className="rounded-xl border bg-card overflow-hidden">
                                <SectionHeader icon={Globe} title="Solicitud HTTP" />
                                <div className="px-4 py-1">
                                    <div className="flex items-start gap-3 py-2.5 border-b border-border/50">
                                        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                                Método · Status · Tiempo
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {log.metodo_http && (
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {log.metodo_http}
                                                    </Badge>
                                                )}
                                                {log.status_code && (
                                                    <Badge variant="outline" className={cn('text-xs font-mono', statusCfg.badge)}>
                                                        {log.status_code}
                                                    </Badge>
                                                )}
                                                {log.tiempo_respuesta && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Timer className="h-3 w-3" />
                                                        {log.tiempo_respuesta}ms
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {log.endpoint && (
                                        <InfoRow icon={Network} label="Endpoint" mono>
                                            <span className="break-all">{log.endpoint}</span>
                                        </InfoRow>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Card usuario & red */}
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <SectionHeader icon={Monitor} title="Usuario & Red" />
                            <div className="px-4 py-1">
                                <InfoRow icon={User} label="Usuario">
                                    {userLabel}
                                </InfoRow>
                                <InfoRow icon={Network} label="IP" mono>
                                    {contexto?.ip || '-'}
                                </InfoRow>
                                {contexto?.url_completa && (
                                    <InfoRow icon={Globe} label="URL" mono>
                                        <span className="break-all text-xs">{contexto.url_completa}</span>
                                    </InfoRow>
                                )}
                                {contexto?.user_agent && (
                                    <InfoRow icon={Monitor} label="User Agent">
                                        <span className="text-xs leading-relaxed">{contexto.user_agent}</span>
                                    </InfoRow>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Columna derecha — payloads ── */}
                    <div className="space-y-4">
                        {!hasPayloads && (
                            <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
                                <FileJson className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                                <p className="text-sm text-muted-foreground">Sin payloads registrados</p>
                            </div>
                        )}
                        <CollapsiblePayload icon={FileJson} title="Request payload"     data={log.request_payload} />
                        <CollapsiblePayload icon={FileJson} title="Response payload"    data={log.response_payload} />
                        {contexto && <CollapsiblePayload icon={FileJson} title="Contexto adicional" data={contexto} />}
                    </div>
                </div>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Monitoreo', href: adminMonitoreoIndex.url() },
        { title: 'Detalle del log', href: '#' },
    ],
};
