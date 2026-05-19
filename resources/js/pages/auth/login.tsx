import { Form, Head, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
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
        if (!countdown || countdown <= 0) {
return;
}

        const timer = setTimeout(() => setCountdown((prev) => (prev ?? 1) - 1), 1000);

        return () => clearTimeout(timer);
    }, [countdown]);

    return (
        <>
            <Head title="Iniciar sesión" />

            {status && (
                <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{status}</span>
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
                        <div className="grid gap-1.5">
                            <Label htmlFor="email" className="text-xs font-medium text-foreground">
                                Correo electrónico
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="correo@ejemplo.com"
                                className="h-11"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                                    Contraseña
                                </Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-xs font-medium text-muted-foreground hover:text-primary"
                                        tabIndex={5}
                                    >
                                        ¿Olvidaste tu contraseña?
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
                                className="h-11"
                            />
                            <InputError message={errors.password} />
                        </div>

                        {countdown !== null && countdown > 0 && (
                            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                                <Clock className="h-4 w-4 shrink-0" />
                                <span>
                                    Puedes intentar de nuevo en{' '}
                                    <span className="font-semibold tabular-nums">{countdown}</span>{' '}
                                    {countdown === 1 ? 'segundo' : 'segundos'}
                                </span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            tabIndex={4}
                            disabled={processing || (countdown !== null && countdown > 0)}
                            data-test="login-button"
                            className="mt-1 h-11 w-full text-sm font-semibold"
                        >
                            {processing && <Spinner />}
                            Iniciar sesión
                        </Button>

                        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                            Acceso exclusivo para personal autorizado del{' '}
                            <span className="font-medium text-foreground">CNE — Delegación Bolívar</span>.
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Bienvenido de nuevo',
    description: 'Ingrese sus credenciales para acceder al sistema de gestión de oficios.',
};
