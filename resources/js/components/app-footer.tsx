export function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer
            className="
                fixed bottom-0 right-0 left-0 z-30 hidden
                border-t border-sidebar-border
                bg-sidebar text-sidebar-foreground
                transition-[left] duration-200 ease-linear
                md:block md:left-(--sidebar-width)
                md:peer-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+(--spacing(4)))]
            "
        >
            <div className="flex flex-col items-center justify-between gap-2 px-6 py-3 text-xs text-sidebar-foreground/70 sm:flex-row">
                <span className="flex items-center gap-1">
                    {/* Icono de Copyleft rotado */}
                    <span className="inline-block scale-x-[-1] text-lg" aria-label="Copyleft">
                        &copy;
                    </span>

                    <span>
                        {year} Gestión Documental. Algunos derechos reservados (Copyleft).
                    </span>
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                    Hecho por{' '}
                    <a
                        href="https://wa.me/593979938432"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                        Janner Valarezo
                    </a>
                    {' '}y{' '}
                    <a
                        href="https://wa.me/593988835685"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                        Patricio Yumbo
                    </a>
                </span>
            </div>
        </footer>
    );
}
