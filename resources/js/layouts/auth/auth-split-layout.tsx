import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="flex min-h-svh items-center justify-center bg-slate-100 dark:bg-zinc-950 p-4 lg:p-8">
            <div
                className="flex w-full max-w-5xl overflow-hidden rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
                style={{ minHeight: '540px' }}
            >

                {/* Panel izquierdo — Branding */}
                <div
                    className="relative hidden w-[42%] shrink-0 flex-col justify-between p-12 text-white lg:flex"
                    style={{ background: '#1a56db' }}
                >
                    {/* Patrón de puntos sutil */}
                    <div
                        className="absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='white'/%3E%3C/svg%3E")`,
                        }}
                    />

                    {/* Logo */}
                    <div className="relative z-10">
                        <div
                            className="flex aspect-square w-[100px] items-center justify-center rounded-2xl"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                        >
                            <Link
                                href={home()}
                                className="flex h-full w-full items-center justify-center p-3"
                            >
                                <AppLogoIcon className="h-full w-full object-contain" />
                            </Link>
                        </div>
                    </div>

                    {/* Texto central */}
                    <div className="relative z-10">
                        <div
                            className="mb-4 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                color: '#fff',
                                letterSpacing: '0.08em',
                            }}
                        >
                            Delegación Bolívar
                        </div>
                        <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-white">
                            Gestión de{' '}
                            <span style={{ color: '#93c5fd' }}>Oficios</span>
                        </h2>
                        <p
                            className="mt-4 text-sm leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.65)' }}
                        >
                            Plataforma de trazabilidad documental para procesos
                            electorales transparentes.
                        </p>
                    </div>

                    {/* Footer */}
                    <div
                        className="relative z-10 pt-5 text-[10px] font-medium uppercase tracking-widest"
                        style={{
                            borderTop: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.4)',
                        }}
                    >
                        <span>Consejo Nacional Electoral</span>
                        <div className="mt-1 flex justify-between">
                            <span>© {new Date().getFullYear()} {name}</span>
                        </div>
                    </div>
                </div>

                {/* Panel derecho — Formulario */}
                <div className="flex flex-1 flex-col bg-white dark:bg-zinc-900">

                    {/* Header móvil */}
                    <div className="flex items-center justify-between p-6 lg:hidden">
                        <div
                            className="flex h-11 w-11 items-center justify-center rounded-xl"
                            style={{ background: '#1a56db' }}
                        >
                            <AppLogoIcon className="h-6 w-6 brightness-0 invert" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            {name}
                        </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-16 lg:px-20">
                        <div className="mx-auto w-full max-w-[340px]">
                            <div className="mb-10">
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {title}
                                </h1>
                                <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                                    {description}
                                </p>
                            </div>

                            <div className="space-y-1">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
