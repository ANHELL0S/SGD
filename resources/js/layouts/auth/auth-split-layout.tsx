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
        <div className="flex min-h-svh bg-gray-100 dark:bg-zinc-950 items-center justify-center p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl flex" style={{ minHeight: '520px' }}>

                {/* Panel izquierdo — branding (~38%) */}
                <div className="hidden lg:flex flex-col justify-between relative w-[38%] shrink-0 bg-slate-900 p-10 text-white overflow-hidden">
                    {/* Fondo decorativo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-900 to-slate-900" />
                    <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute top-0 right-0 h-52 w-52 rounded-full bg-yellow-400/15 blur-3xl" />

                    {/* Logo */}
                    <div className="relative z-10 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                        <Link href={home()}>
                            <AppLogoIcon className="w-full h-auto max-h-16 object-contain" />
                        </Link>
                    </div>

                    {/* Texto central */}
                    <div className="relative z-10 space-y-3">
                        <h2 className="text-2xl font-bold leading-snug text-white drop-shadow">
                            Sistema de Gestión<br />de Oficios
                        </h2>
                        <p className="text-sm leading-relaxed text-slate-300">
                            Administración y seguimiento de documentos oficiales de forma segura y eficiente.
                        </p>
                    </div>

                    {/* Pie */}
                    <div className="relative z-10 text-xs text-slate-400">
                        © {new Date().getFullYear()} {name}
                    </div>
                </div>

                {/* Panel derecho — formulario (~62%) */}
                <div className="flex flex-1 flex-col justify-center bg-white dark:bg-zinc-900 px-10 py-12">

                    {/* Logo visible solo en móvil */}
                    <div className="mb-6 flex justify-center lg:hidden">
                        <Link href={home()}>
                            <AppLogoIcon className="h-14 w-auto" />
                        </Link>
                    </div>

                    <div className="mx-auto w-full max-w-sm">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{description}</p>
                        </div>

                        {children}
                    </div>
                </div>

            </div>
        </div>
    );
}
