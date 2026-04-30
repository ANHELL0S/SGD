import { Head, Link } from '@inertiajs/react';
import { home } from '@/routes';

export default function Error404() {
    return (
        <>
            <Head title="404 - Página no encontrada" />

            <div className="relative min-h-screen overflow-hidden bg-black">
                <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/videos/error-404.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                />

                <div className="absolute inset-0 bg-black/55" />

                <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                    <div className="text-center text-white">
                        <h1 className="text-4xl font-bold sm:text-5xl">Error 404</h1>
                        <p className="mt-3 text-base text-white/85 sm:text-lg">
                            La pagina que buscas no fue encontrada.
                        </p>

                        <Link
                            href={home()}
                            className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                        >
                            Volver a casa
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
