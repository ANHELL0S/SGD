import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-gray-100 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-md">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md dark:bg-zinc-900 dark:border-zinc-800">

                    {/* Encabezado con logo a ancho completo */}
                    <Link href={home()} className="block bg-blue-900 px-8 py-6">
                        <AppLogoIcon className="mx-auto h-16 w-auto" />
                    </Link>

                    {/* Título y formulario */}
                    <div className="px-8 py-7">
                        <div className="mb-6 text-center">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{description}</p>
                        </div>
                        {children}
                    </div>

                </div>
            </div>
        </div>
    );
}
