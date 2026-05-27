import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Edit3,
    User,
    CreditCard,
    Mail,
    Building2,
    Shield,
    CalendarDays,
    CheckCircle2,
    XCircle,
    Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { edit, index } from '@/routes/admin/usuarios';

// ============================================================================
// TIPOS
// ============================================================================

type UserDetail = {
    id_user: number;
    nombre: string;
    apellido: string;
    cedula: string;
    email: string;
    rol: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    habilitado: boolean;
    created_at: string | null;
    email_verified_at: string | null;
    area: { id_area: number; nombre: string } | null;
};

type Props = {
    user: UserDetail;
};

// ============================================================================
// UTILIDADES
// ============================================================================

const formatDate = (value: string | null): string => {
    if (!value) {
return '-';
}

    return new Date(value).toLocaleString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Guayaquil',
    });
};

/** Devuelve label, clases y componente de icono para el badge de estado del usuario. */
const estadoConfig = (estado: UserDetail['estado']) => {
    if (estado === 'aprobado') {
return {
        label: 'Aprobado',
        className: 'border-border bg-card text-primary',
        icon: CheckCircle2,
        iconClass: 'text-primary',
    };
}

    if (estado === 'pendiente') {
return {
        label: 'Pendiente',
        className: 'border-border bg-muted text-muted-foreground',
        icon: Clock,
        iconClass: 'text-muted-foreground',
    };
}

    return {
        label: 'Rechazado',
        className: 'border-destructive bg-destructive/10 text-destructive',
        icon: XCircle,
        iconClass: 'text-destructive',
    };
};

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

/** Fila de detalle con icono, etiqueta y contenido; separada del siguiente ítem con un borde inferior. */
function InfoRow({ icon: Icon, label, children }: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
            <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                </p>
                <div className="text-sm font-medium text-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}

/** Tarjeta con título y lista de `InfoRow` para agrupar campos relacionados. */
function SectionPanel({ title, children }: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card px-5 py-4 space-y-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-3 border-b border-border/50">
                {title}
            </p>
            {children}
        </div>
    );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Vista de detalle de un usuario para el administrador.
 *
 * Muestra avatar con iniciales (nombre[0]+apellido[0]), badge de estado/habilitado,
 * e información completa agrupada en secciones (datos personales, cuenta, área/rol).
 * La fecha se formatea con hora en zona horaria America/Guayaquil.
 * Solo accesible para usuarios con rol `admin`.
 */
export default function Show({ user }: Props) {
    const fullName = `${user.nombre} ${user.apellido}`.trim();
    const estado = estadoConfig(user.estado);
    const EstadoIcon = estado.icon;

    const initials = [user.nombre[0], user.apellido[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase();

    return (
        <>
            <Head title={`Usuario — ${fullName}`} />

            <div className="mx-auto w-full px-4 py-6 md:px-8 space-y-5">

                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
                        <Link href={index()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold leading-tight truncate">{fullName}</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            #{user.id_user} · {user.area?.nombre ?? 'Sin área asignada'}
                        </p>
                    </div>
                    <Button asChild variant="default" size="sm" className='bg-[var(--primary)] text-white hover:bg-primary/90 sm:w-auto'>
                        <Link href={edit.url(user.id_user)}>
                            <Edit3 className="h-3.5 w-3.5 mr-1.5"/>
                            Editar
                        </Link>
                    </Button>
                </div>

                {/* ── Avatar + estado destacado ── */}
                <div className="rounded-xl border bg-card px-5 py-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <span className="text-lg font-semibold text-primary">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base leading-tight truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge
                                variant="outline"
                                className={`text-xs flex items-center gap-1 ${estado.className}`}
                            >
                                <EstadoIcon className={`h-3 w-3 ${estado.iconClass}`} />
                                {estado.label}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={`text-xs ${user.habilitado
                                    ? 'border-border bg-card text-primary'
                                    : 'border-muted bg-muted text-muted-foreground'
                                }`}
                            >
                                {user.habilitado ? 'Habilitado' : 'Deshabilitado'}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                                {user.rol}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* ── Grid de secciones ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Datos personales */}
                    <SectionPanel title="Datos personales">
                        <InfoRow icon={User} label="Nombre completo">
                            {fullName}
                        </InfoRow>
                        <InfoRow icon={CreditCard} label="Cédula">
                            {user.cedula}
                        </InfoRow>
                        <InfoRow icon={Mail} label="Correo electrónico">
                            <span className="truncate block">{user.email}</span>
                        </InfoRow>
                        <InfoRow icon={Building2} label="Área">
                            {user.area?.nombre ?? (
                                <span className="text-muted-foreground italic">Sin área</span>
                            )}
                        </InfoRow>
                    </SectionPanel>

                    {/* Cuenta y acceso */}
                    <SectionPanel title="Cuenta y acceso">
                        <InfoRow icon={Shield} label="Rol">
                            <span className="capitalize">{user.rol}</span>
                        </InfoRow>
                        <InfoRow icon={CheckCircle2} label="Estado">
                            <Badge
                                variant="outline"
                                className={`text-xs flex items-center gap-1 w-fit ${estado.className}`}
                            >
                                <EstadoIcon className={`h-3 w-3 ${estado.iconClass}`} />
                                {estado.label}
                            </Badge>
                        </InfoRow>
                        <InfoRow icon={user.habilitado ? CheckCircle2 : XCircle} label="Habilitado">
                            <Badge
                                variant="outline"
                                className={`text-xs w-fit ${user.habilitado
                                    ? 'border-border bg-card text-primary'
                                    : 'border-muted bg-muted text-muted-foreground'
                                }`}
                            >
                                {user.habilitado ? 'Sí' : 'No'}
                            </Badge>
                        </InfoRow>
                        <InfoRow icon={CalendarDays} label="Verificado">
                            <span className="text-xs">{formatDate(user.email_verified_at)}</span>
                        </InfoRow>
                        <InfoRow icon={CalendarDays} label="Creado">
                            <span className="text-xs">{formatDate(user.created_at)}</span>
                        </InfoRow>
                    </SectionPanel>

                </div>
            </div>
        </>
    );
}
