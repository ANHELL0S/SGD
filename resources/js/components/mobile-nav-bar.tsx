import { Link, usePage } from '@inertiajs/react';
import { Activity, ArrowLeftRight, LayoutGrid, Mail, Users } from 'lucide-react';
import { index as adminMonitoreoIndex } from '@/actions/App/Http/Controllers/Admin/MonitoreoController';
import { index as adminUsersIndex } from '@/actions/App/Http/Controllers/Admin/UserController';
import { index as userDocumentosIndex } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { index as userMovimientosIndex } from '@/actions/App/Http/Controllers/User/MovimientoController';
import { dashboard } from '@/routes';

type NavTab = {
    title: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
};

export function MobileNavBar() {
    const page = usePage();
    const { auth, pendingCount, pendingMovimientosCount } = page.props as {
        auth?: { user?: { rol?: string } | null };
        pendingCount?: number;
        pendingMovimientosCount?: number;
    };

    const role = auth?.user?.rol;

    if (role !== 'user' && role !== 'admin') return null;

    const currentPath = page.url?.split('?')[0] ?? '';

    const userTabs: NavTab[] = [
        {
            title: 'Inicio',
            href: dashboard.url(),
            icon: LayoutGrid,
        },
        {
            title: 'Documentos',
            href: userDocumentosIndex.url(),
            icon: Mail,
        },
        {
            title: 'Movimientos',
            href: userMovimientosIndex.url(),
            icon: ArrowLeftRight,
            badge: pendingMovimientosCount && pendingMovimientosCount > 0 ? pendingMovimientosCount : undefined,
        },
    ];

    const adminTabs: NavTab[] = [
        {
            title: 'Inicio',
            href: dashboard.url(),
            icon: LayoutGrid,
        },
        {
            title: 'Documentos',
            href: userDocumentosIndex.url(),
            icon: Mail,
        },
        {
            title: 'Usuarios',
            href: adminUsersIndex.url(),
            icon: Users,
            badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
        },
        {
            title: 'Monitoreo',
            href: adminMonitoreoIndex.url(),
            icon: Activity,
        },
    ];

    const tabs = role === 'admin' ? adminTabs : userTabs;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentPath === tab.href || currentPath.startsWith(tab.href + '/');

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={[
                            'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
                            isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                    >
                        <div className="relative">
                            <Icon className="h-5 w-5" />
                            {tab.badge !== undefined && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white leading-none">
                                    {tab.badge > 99 ? '99+' : tab.badge}
                                </span>
                            )}
                        </div>
                        <span>{tab.title}</span>
                        {isActive && (
                            <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
