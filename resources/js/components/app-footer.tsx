export function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer
            className="
                fixed bottom-0 right-0 left-0 z-30 hidden
                border-t border-border/40
                bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80
                transition-[left] duration-200 ease-linear
                md:block md:left-(--sidebar-width)
                md:peer-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+(--spacing(4)))]
            "
        >
            <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />
            <div className="flex flex-col items-center justify-between gap-2 px-6 py-3 text-xs text-muted-foreground sm:flex-row">
                <span>
                    © {year} Gestión Documental. Todos los derechos reservados.
                </span>
                <span>
                    Hecho por{' '}
                    <a
                        href="https://github.com/Janner121"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                        Janner Valarezo
                    </a>
                </span>
            </div>
        </footer>
    );
}
