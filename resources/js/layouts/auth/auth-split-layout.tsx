import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-muted p-4 lg:p-8">
            <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_25px_80px_-20px_rgba(0,0,0,0.18)] lg:grid-cols-[1.1fr_1fr] dark:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.55)]">

                {/* ─────────── Panel izquierdo — Poster editorial ─────────── */}
                <aside
                    className="relative hidden flex-col justify-between overflow-hidden p-14 text-white lg:flex"
                    style={{
                        background:
                            'linear-gradient(135deg, var(--primary) 0%, oklch(0.42 0.22 270) 55%, oklch(0.30 0.18 282) 100%)',
                    }}
                >
                    {/* Watermark tipográfico gigante */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-24 -right-10 select-none text-[22rem] font-black leading-none text-white/[0.07]"
                    >
                        §
                    </span>

                    {/* Halos de color — azul claro arriba derecha, ámbar abajo izquierda */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-300/20 blur-3xl"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -bottom-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-amber-400/20 blur-3xl"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 -translate-y-1/2 rounded-full bg-fuchsia-400/10 blur-3xl"
                    />

                    {/* Esquinas decorativas (corner marks tipo blueprint) */}
                    <CornerMark className="absolute top-6 left-6" position="tl" />
                    <CornerMark className="absolute top-6 right-6" position="tr" />
                    <CornerMark className="absolute bottom-6 left-6" position="bl" />
                    <CornerMark className="absolute bottom-6 right-6" position="br" />

                    {/* ── Cabecera: eyebrow + badge Sistema activo ── */}
                    <div className="relative z-10 flex items-start justify-between gap-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
                            CNE · Delegación Bolívar
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm ring-1 ring-white/15">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                            </span>
                            Sistema activo
                        </span>
                    </div>

                    {/* ── Headline ── */}
                    <div className="relative z-10">
                        <h2 className="text-[4rem] font-bold leading-[0.95] tracking-tight">
                            Gestión
                            <br />
                            de <span className="text-amber-300">Oficios</span>
                        </h2>
                        <span
                            aria-hidden
                            className="mt-7 block h-[3px] w-16 rounded-full bg-gradient-to-r from-amber-300 to-amber-200"
                        />
                    </div>

                    {/* ── Cita + tarjeta flotante ── */}
                    <div className="relative z-10 space-y-8">
                        <div className="max-w-md">
                            <p className="text-[1.35rem] font-medium leading-[1.35] tracking-tight text-white">
                                La transparencia empieza
                                <br />
                                por saber dónde está
                                <br />
                                cada documento.
                            </p>
                            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                                — Plataforma institucional
                            </p>
                        </div>

                        {/* Tarjeta flotante minimal: último oficio */}
                        <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/15 animate-slide-in-up">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55">
                                    Último ingreso
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-white">
                                    OF-2026-0427 · Despacho
                                </span>
                            </div>
                            <ArrowUpRight className="ml-2 h-4 w-4 text-white/55" />
                        </div>
                    </div>
                </aside>

                {/* ─────────── Panel derecho — Formulario ─────────── */}
                <section className="flex flex-col bg-card">
                    <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-14 lg:px-16">
                        <div className="mx-auto w-full max-w-sm">
                            {/* Logo (colores originales) */}
                            <Link
                                href={home()}
                                className="mb-10 inline-flex transition hover:opacity-80"
                            >
                                <AppLogoIcon className="h-14 w-auto" />
                            </Link>

                            {/* Título */}
                            <div className="mb-8">
                                <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
                                    {title}
                                </h1>
                                {description && (
                                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>

                            {children}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}

function CornerMark({
    className,
    position,
}: {
    className?: string;
    position: 'tl' | 'tr' | 'bl' | 'br';
}) {
    const borders = {
        tl: 'border-l border-t',
        tr: 'border-r border-t',
        bl: 'border-l border-b',
        br: 'border-r border-b',
    }[position];

    return (
        <span
            aria-hidden
            className={`pointer-events-none h-4 w-4 border-white/25 ${borders} ${className ?? ''}`}
        />
    );
}
