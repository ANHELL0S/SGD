import { Form, Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const { flash } = usePage<{ flash: { retry_after?: number | null } }>().props;
    const [countdown, setCountdown] = useState<number | null>(flash?.retry_after ?? null);

    useEffect(() => {
        setCountdown(flash?.retry_after ?? null);
    }, [flash?.retry_after]);

    useEffect(() => {
        if (!countdown || countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((prev) => (prev ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    return (
        <>
            <Head title="Iniciar sesión" />

            {status && (
                <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center text-sm text-green-700">
                    {status}
                </div>
            )}

            <Form
                action={store.url()}
                method="post"
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="correo@ejemplo.com"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Contraseña</Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-xs text-muted-foreground hover:text-primary"
                                        tabIndex={5}
                                    >
                                        ¿Olvidó su contraseña?
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox id="remember" name="remember" tabIndex={3} />
                            <Label htmlFor="remember" className="font-normal cursor-pointer">
                                Recordarme
                            </Label>
                        </div>

                        {countdown !== null && countdown > 0 && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center text-sm text-amber-700">
                                Puedes intentar de nuevo en{' '}
                                <span className="font-semibold tabular-nums">{countdown}</span>{' '}
                                {countdown === 1 ? 'segundo' : 'segundos'}
                            </div>
                        )}

                        <Button
                            type="submit"
                            tabIndex={4}
                            disabled={processing || (countdown !== null && countdown > 0)}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Iniciar sesión
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Iniciar sesión',
    description: 'Ingrese su correo y contraseña para acceder',
};

