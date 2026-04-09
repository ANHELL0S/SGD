import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type AreaOption = {
    id_area: number;
    nombre: string;
};

type RegisterProps = {
    areas: AreaOption[];
};

export default function Register({ areas }: RegisterProps) {
    return (
        <>
            <Head title="Registro" />
            <Form
                action={store.url()}
                method="post"
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="nombre">Nombre</Label>
                                <Input
                                    id="nombre"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="given-name"
                                    name="nombre"
                                    placeholder="Ingresa tu nombre"
                                    pattern="^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$"
                                />
                                <InputError message={errors.nombre} className="mt-2" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="apellido">Apellido</Label>
                                <Input
                                    id="apellido"
                                    type="text"
                                    required
                                    tabIndex={2}
                                    autoComplete="family-name"
                                    name="apellido"
                                    placeholder="Ingresa tu apellido"
                                    pattern="^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$"
                                />
                                <InputError message={errors.apellido} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cedula">Cédula</Label>
                                <Input
                                    id="cedula"
                                    type="text"
                                    required
                                    tabIndex={3}
                                    name="cedula"
                                    placeholder="0123456789"
                                    inputMode="numeric"
                                    pattern="^[0-9]{10}$"
                                    maxLength={10}
                                />
                                <InputError message={errors.cedula} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="area_id">Área</Label>
                                <select
                                    id="area_id"
                                    name="area_id"
                                    required
                                    tabIndex={4}
                                    defaultValue=""
                                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="" disabled>
                                        Selecciona un área
                                    </option>
                                    {areas.map((area) => (
                                        <option key={area.id_area} value={area.id_area}>
                                            {area.nombre}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.area_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={5}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="correo@ejemplo.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Contraseña</Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={6}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Contraseña"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Debe tener minimo 8 caracteres, mayuscula, minuscula, numero y al menos uno de: . @ #
                                </p>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={7}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirma tu contraseña"
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={8}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Crear cuenta
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            ¿Ya tienes una cuenta?{' '}
                            <TextLink href={login()} tabIndex={9}>
                                Iniciar sesión
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Crea una cuenta',
    description: 'Completa tus datos para solicitar acceso al sistema',
};
