import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, User, Building2, Lock } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { index, store } from '@/routes/admin/usuarios';

// ============================================================================
// TIPOS
// ============================================================================

type AreaOption = {
    id_area: number;
    nombre: string;
};

type RoleOption = {
    value: 'user' | 'admin' | 'consultor';
    label: string;
};

type Props = {
    areas: AreaOption[];
    roles: RoleOption[];
};

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
                <p className="text-xs font-medium">{title}</p>
                {description && (
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string | null;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </Label>
            {children}
            <div className="min-h-[1.1rem]">
                {error && (
                    <InputError
                        message={error}
                        className="flex items-center gap-1 text-xs"
                    />
                )}
            </div>
        </div>
    );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
    return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Create({ areas, roles }: Props) {
    const [nombreError, setNombreError] = React.useState<string | null>(null);
    const [apellidoError, setApellidoError] = React.useState<string | null>(null);
    const [cedulaError, setCedulaError] = React.useState<string | null>(null);
    const [passwordError, setPasswordError] = React.useState<string | null>(null);
    const [confirmPasswordError, setConfirmPasswordError] = React.useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        nombre: '',
        apellido: '',
        cedula: '',
        email: '',
        area_id: '',
        rol: 'user',
        password: '',
        password_confirmation: '',
    });

    // ── Validaciones ──

    const validarNombre = (valor: string): boolean => {
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]*$/.test(valor)) {
            setNombreError('Solo se permiten letras.');
            return false;
        }
        if (valor.trim().length > 0 && valor.trim().length < 3) {
            setNombreError('Mínimo 3 letras.');
            return false;
        }
        setNombreError(null);
        return true;
    };

    const validarApellido = (valor: string): boolean => {
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]*$/.test(valor)) {
            setApellidoError('Solo se permiten letras.');
            return false;
        }
        if (valor.trim().length > 0 && valor.trim().length < 3) {
            setApellidoError('Mínimo 3 letras.');
            return false;
        }
        setApellidoError(null);
        return true;
    };

    const validarCedulaEcuador = (cedula: string): boolean => {
        if (!/^\d{10}$/.test(cedula)) return false;
        const provincia = parseInt(cedula.substring(0, 2), 10);
        if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
        if (parseInt(cedula[2], 10) >= 6) return false;
        const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;
        for (let i = 0; i < 9; i++) {
            let val = parseInt(cedula[i], 10) * coef[i];
            if (val >= 10) val -= 9;
            suma += val;
        }
        let digitoVerificador = Math.ceil(suma / 10) * 10 - suma;
        if (digitoVerificador === 10) digitoVerificador = 0;
        return parseInt(cedula[9], 10) === digitoVerificador;
    };

    const validarCedula = (valor: string): boolean => {
        if (valor.length === 0) { setCedulaError('La cédula es requerida.'); return false; }
        if (valor.length < 10) { setCedulaError('La cédula debe tener 10 dígitos.'); return false; }
        if (!validarCedulaEcuador(valor)) { setCedulaError('Cédula no válida.'); return false; }
        setCedulaError(null);
        return true;
    };

    const validarPassword = (valor: string): boolean => {
        if (valor.length < 8) { setPasswordError('Mínimo 8 caracteres.'); return false; }
        if (!/[A-Z]/.test(valor)) { setPasswordError('Debe incluir una mayúscula.'); return false; }
        if (!/[a-z]/.test(valor)) { setPasswordError('Debe incluir una minúscula.'); return false; }
        if (!/\d/.test(valor)) { setPasswordError('Debe incluir un número.'); return false; }
        if (!/[^A-Za-z0-9]/.test(valor)) { setPasswordError('Debe incluir un carácter especial.'); return false; }
        setPasswordError(null);
        return true;
    };

    const validarConfirmacion = (confirmacion: string, passwordActual = data.password): boolean => {
        if (confirmacion.length === 0) { setConfirmPasswordError(null); return true; }
        if (confirmacion !== passwordActual) {
            setConfirmPasswordError('Las contraseñas no coinciden.');
            return false;
        }
        setConfirmPasswordError(null);
        return true;
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nombreValido      = validarNombre(data.nombre);
        const apellidoValido    = validarApellido(data.apellido);
        const cedulaValida      = validarCedula(data.cedula);
        const passwordValida    = validarPassword(data.password);
        const confirmacionValida = validarConfirmacion(data.password_confirmation);

        if (!nombreValido || !apellidoValido || !cedulaValida || !passwordValida || !confirmacionValida) {
            return;
        }
        post(store.url(), {
            preserveScroll: true,
            onSuccess: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Crear usuario" />

            <div className="mx-auto w-full space-y-6 px-4 py-6 md:px-8">
                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="shrink-0 rounded-full"
                    >
                        <Link href={index()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-xl leading-tight font-semibold">
                            Crear usuario
                        </h1>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            El usuario quedará activo y aprobado desde el inicio.
                        </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                        Nuevo
                    </Badge>
                </div>

                {/* ── Formulario ── */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Sección: Información personal */}
                    <div className="space-y-4 rounded-xl border bg-card px-5 py-4">
                        <div className="[&_svg]:text-primary/70">
                            <SectionHeader
                                icon={User}
                                title="Información personal"
                                description="Nombre, apellido e identificación del usuario"
                            />
                        </div>
                        <FieldGroup>
                            <Field label="Nombre" error={nombreError || errors.nombre}>
                                <Input
                                    id="nombre"
                                    value={data.nombre}
                                    autoComplete="off"
                                    placeholder="Ej. María"
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '');
                                        setData('nombre', v);
                                        validarNombre(v);
                                    }}
                                    onBlur={(e) => validarNombre(e.target.value)}
                                />
                            </Field>
                            <Field label="Apellido" error={apellidoError || errors.apellido}>
                                <Input
                                    id="apellido"
                                    value={data.apellido}
                                    autoComplete="off"
                                    placeholder="Ej. Torres"
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '');
                                        setData('apellido', v);
                                        validarApellido(v);
                                    }}
                                    onBlur={(e) => validarApellido(e.target.value)}
                                />
                            </Field>
                            <Field label="Cédula" error={cedulaError || errors.cedula}>
                                <Input
                                    id="cedula"
                                    value={data.cedula}
                                    autoComplete="off"
                                    maxLength={10}
                                    placeholder="0000000000"
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, '');
                                        setData('cedula', v);
                                        validarCedula(v);
                                    }}
                                    onBlur={(e) => validarCedula(e.target.value)}
                                />
                            </Field>
                            <Field label="Correo electrónico" error={errors.email}>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    placeholder="usuario@correo.com"
                                    onChange={(e) => setData('email', e.target.value.toLowerCase())}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* Sección: Área y rol */}
                    <div className="space-y-4 rounded-xl border bg-card px-5 py-4">
                        <div className="[&_svg]:text-primary/70">
                            <SectionHeader
                                icon={Building2}
                                title="Área y rol"
                                description="Define dónde trabajará y qué permisos tendrá"
                            />
                        </div>
                        <FieldGroup>
                            <Field label="Área" error={errors.area_id}>
                                <Select
                                    value={data.area_id}
                                    onValueChange={(v) => setData('area_id', v)}
                                >
                                    <SelectTrigger id="area_id">
                                        <SelectValue placeholder="Selecciona una área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {areas.map((area) => (
                                            <SelectItem
                                                key={area.id_area}
                                                value={String(area.id_area)}
                                            >
                                                {area.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Rol" error={errors.rol}>
                                <Select
                                    value={data.rol}
                                    onValueChange={(v) => setData('rol', v)}
                                >
                                    <SelectTrigger id="rol">
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.value}
                                                value={role.value}
                                            >
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* Sección: Contraseña */}
                    <div className="space-y-4 rounded-xl border bg-card px-5 py-4">
                        <div className="[&_svg]:text-primary/70">
                            <SectionHeader
                                icon={Lock}
                                title="Contraseña"
                                description="Requerida para el nuevo usuario"
                            />
                        </div>
                        <div className="text-[var(--secondary-foreground)]/70 text-xs">
                            Su contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales como @*.
                        </div>
                        <FieldGroup>
                            <Field label="Contraseña" error={passwordError || errors.password}>
                                <PasswordInput
                                    id="password"
                                    value={data.password}
                                    placeholder="••••••••"
                                    onChange={(e) => {
                                        setData('password', e.target.value);
                                        validarPassword(e.target.value);
                                        if (data.password_confirmation) {
                                            validarConfirmacion(data.password_confirmation, e.target.value);
                                        }
                                    }}
                                    onBlur={(e) => validarPassword(e.target.value)}
                                />
                            </Field>
                            <Field label="Confirmar contraseña" error={confirmPasswordError || errors.password_confirmation}>
                                <PasswordInput
                                    id="password_confirmation"
                                    value={data.password_confirmation}
                                    placeholder="••••••••"
                                    onChange={(e) => {
                                        setData('password_confirmation', e.target.value);
                                        validarConfirmacion(e.target.value);
                                    }}
                                    onBlur={(e) => validarConfirmacion(e.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    {/* ── Acciones ── */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            asChild
                            type="button"
                            variant="outline"
                            className="bg-[var(--primary)] text-white hover:bg-primary/90 hover:text-white focus-visible:bg-primary/90 focus-visible:text-white"
                        >
                            <Link href={index()}>Cancelar</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            variant="default"
                            className="min-w-[130px] text-white"
                        >
                            {processing ? 'Guardando...' : 'Guardar usuario'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
