import { Link, usePage, usePoll } from '@inertiajs/react';
import { ArrowLeftRight, BookOpen, Building2, FolderGit2, LayoutGrid, Mail, Trash2, Users } from 'lucide-react';
import { useMemo } from 'react';
import { index as adminAreasIndex } from '@/actions/App/Http/Controllers/Admin/AreaController';
import { index as adminRemitentesIndex } from '@/actions/App/Http/Controllers/Admin/RemitenteController';
import { index as adminUsersIndex } from '@/actions/App/Http/Controllers/Admin/UserController';
import { index as userDocumentosIndex } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { deletedIndex as adminDocumentosDeletedIndex } from '@/actions/App/Http/Controllers/User/DocumentoController';
import { index as userMovimientosIndex } from '@/actions/App/Http/Controllers/User/MovimientoController';
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

const baseAdminNavItems: NavItem[] = [
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
    const { auth, pendingCount, pendingMovimientosCount } = usePage().props as {
        auth?: { user?: { rol?: string } | null };
        pendingCount?: number;
        pendingMovimientosCount?: number;
    };

    usePoll(10000, {
        only: ['pendingCount', 'pendingMovimientosCount'],
        preserveScroll: true,
        preserveState: true,
    });

    const role = auth?.user?.rol;

    const adminNavItems = useMemo(() => {
        const items = [...baseAdminNavItems];
        const usuariosItem = items.find((item) => item.title === 'Usuarios');

        if (usuariosItem && pendingCount) {
            usuariosItem.badge = pendingCount;
        }

        return items;
    }, [pendingCount]);

    const userNavItems = useMemo(() => {
        const items = [...baseUserNavItems];
        const movimientosItem = items.find((item) => item.title === 'Mis movimientos');

        if (movimientosItem && pendingMovimientosCount && pendingMovimientosCount > 0) {
            movimientosItem.badge = pendingMovimientosCount;
        }

        return items;
    }, [pendingMovimientosCount]);

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
                <NavMain items={mainNavItems} />
                {role === 'admin' && <NavMain items={adminNavItems} label="Administración" />}
                {role === 'user' && <NavMain items={userNavItems} label="Documentos" />}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
