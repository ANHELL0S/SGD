import { Link, router, usePage, usePoll } from '@inertiajs/react';
import { Activity, ArrowLeftRight, BookOpen, Building2, FolderGit2, FolderOpen, LayoutGrid, Mail, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { index as adminAreasIndex } from '@/actions/App/Http/Controllers/Admin/AreaController';
import { index as adminMonitoreoIndex } from '@/actions/App/Http/Controllers/Admin/MonitoreoController';
import { index as adminRemitentesIndex } from '@/actions/App/Http/Controllers/Admin/RemitenteController';
import { index as adminUsersIndex } from '@/actions/App/Http/Controllers/Admin/UserController';
import { index as userDocumentosIndex } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { deletedIndex as adminDocumentosDeletedIndex } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { index as userMovimientosIndex } from '@/actions/App/Http/Controllers/User/MovimientoController';
import { index as consultorExpedientesIndex } from '@/actions/App/Http/Controllers/Consultor/ConsultorController';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const adminDocumentosNavItems: NavItem[] = [
    {
        title: 'Documentos',
        href: userDocumentosIndex.url(),
        icon: Mail,
    },
    {
        title: 'Eliminados',
        href: adminDocumentosDeletedIndex.url(),
        icon: Trash2,
    },
];

const adminGestionNavItems: NavItem[] = [
    {
        title: 'Áreas',
        href: adminAreasIndex.url(),
        icon: Building2,
    },
    {
        title: 'Remitentes',
        href: adminRemitentesIndex.url(),
        icon: Mail,
    },
    {
        title: 'Usuarios',
        href: adminUsersIndex.url(),
        icon: Users,
    },
];

const adminMonitoreoNavItems: NavItem[] = [
    {
        title: 'Monitoreo',
        href: ((globalThis as { route?: (name: string) => string }).route?.('admin.monitoreo.index') ?? adminMonitoreoIndex.url()),
        icon: Activity,
    },
];

const baseUserNavItems: NavItem[] = [
    {
        title: 'Mis documentos',
        href: userDocumentosIndex.url(),
        icon: Mail,
    },
    {
        title: 'Mis movimientos',
        href: userMovimientosIndex.url(),
        icon: ArrowLeftRight,
    },
];

const consultorNavItems: NavItem[] = [
    {
        title: 'Expedientes',
        href: consultorExpedientesIndex.url(),
        icon: FolderOpen,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const page = usePage();
    const { auth, pendingCount, pendingMovimientosCount } = page.props as {
        auth?: { user?: { rol?: string; area_id?: number | null } | null };
        pendingCount?: number;
        pendingMovimientosCount?: number;
    };
    const currentPath = page.url?.split('?')[0] ?? '';
    const isMonitoreoPage = currentPath.startsWith('/admin/monitoreo');

    const { start: startPolling, stop: stopPolling } = usePoll(2000, {
        only: ['pendingCount', 'pendingMovimientosCount'],
    }, {
        autoStart: true,
        keepAlive: true,
    });

    useEffect(() => {
        if (isMonitoreoPage) {
            stopPolling();

            return;
        }

        startPolling();
    }, [isMonitoreoPage, startPolling, stopPolling]);

    const role = auth?.user?.rol;
    const userAreaId = auth?.user?.area_id;

    useEffect(() => {
        if (role !== 'user' || userAreaId === null || userAreaId === undefined) {
            return;
        }

        const globalWithEcho = globalThis as typeof globalThis & {
            Echo?: {
                private: (channel: string) => {
                    listen: (event: string, callback: () => void) => unknown;
                    stopListening?: (event: string) => unknown;
                };
                leaveChannel?: (channel: string) => unknown;
            };
        };

        const echo = globalWithEcho.Echo;

        if (! echo) {
            return;
        }

        const channelName = `private-areas.${userAreaId}.movimientos`;
        const eventName = '.documento.movimiento.actualizado';
        const channel = echo.private(`areas.${userAreaId}.movimientos`);

        channel.listen(eventName, () => {
            router.reload({ only: ['pendingCount', 'pendingMovimientosCount'] });
        });

        return () => {
            channel.stopListening?.(eventName);
            echo.leaveChannel?.(channelName);
        };
    }, [role, userAreaId]);

    const adminNavItems = useMemo(() => {
        return adminGestionNavItems.map((item) =>
            item.title === 'Usuarios' && pendingCount && pendingCount > 0
                ? { ...item, badge: pendingCount as number | undefined }
                : { ...item, badge: undefined },
        );
    }, [pendingCount]);

    const adminDocumentosItems = useMemo(() => adminDocumentosNavItems.map((item) => ({ ...item })), []);
    const adminMonitoreoItems  = useMemo(() => adminMonitoreoNavItems.map((item) => ({ ...item })), []);

    const userNavItems = useMemo(() => {
        return baseUserNavItems.map((item) =>
            item.title === 'Mis movimientos' && pendingMovimientosCount && pendingMovimientosCount > 0
                ? { ...item, badge: pendingMovimientosCount as number | undefined }
                : { ...item, badge: undefined },
        );
    }, [pendingMovimientosCount]);

    const consultorItems = useMemo(() => consultorNavItems.map((item) => ({ ...item })), []);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {role !== 'consultor' && <NavMain items={mainNavItems} />}
                {role === 'admin' && (
                    <>
                        <SidebarSeparator />
                        <NavMain items={adminDocumentosItems} label="Documentos" />
                        <NavMain items={adminNavItems} label="Gestión" />
                        <NavMain items={adminMonitoreoItems} label="Monitoreo" />
                    </>
                )}
                {role === 'user' && (
                    <>
                        <SidebarSeparator />
                        <NavMain items={userNavItems} label="Documentos" />
                    </>
                )}
                {role === 'consultor' && (
                    <>
                        <SidebarSeparator />
                        <NavMain items={consultorItems} label="Consultoría" />
                    </>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
