import { Head, Link, useForm } from '@inertiajs/react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import { storeRespuesta } from '@/actions/App/Http/Controllers/User/MovimientoController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Remitente = {
    id_remitente: number;
    nombre: string;
};

type MovimientoDetalle = {
    id_movimiento: number;
    de_area: { nombre: string } | null;
    a_area: { nombre: string } | null;
    comentario: string | null;
    documento: {
        id_documento: number;
        numero_oficio: string | null;
        palabra_clave: string;
        tipo: string;
    } | null;
};

type Props = {
    movimiento: MovimientoDetalle;
    remitentes: Remitente[];
    tipos: string[];
};

type FormData = {
    movimiento_id: number;
    numero_oficio: string;
    fecha_oficio: string;
    remitente_id: string;
    tipo: string;
    palabra_clave: string;
    archivo: File | null;
    comentario_envio: string;
};

export default function Responder({ movimiento, remitentes, tipos }: Props) {
    const { data, setData, post, processing, progress, errors } = useForm<FormData>({
        movimiento_id: movimiento.id_movimiento,
        numero_oficio: '',
        fecha_oficio: '',
        remitente_id: '',
        tipo: movimiento.documento?.tipo ?? '',
        palabra_clave: movimiento.documento?.palabra_clave ?? '',
        archivo: null,
        comentario_envio: movimiento.comentario ?? '',
    });

    const handleFile = (file: File | null): void => {
        if (!file) {
            return;
        }

        setData('archivo', file);
    };

    const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        post(storeRespuesta.url(), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Responder oficio" />

            <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Responder oficio</h1>
                        <p className="text-sm text-muted-foreground">
                            Crea el oficio de respuesta y se enviara automaticamente al area de origen.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={DocumentoController.index.url()}>Volver a documentos</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Contexto del movimiento</CardTitle>
                        <CardDescription>
                            Flujo actual: {movimiento.a_area?.nombre ?? '-'} {'->'} {movimiento.de_area?.nombre ?? '-'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">Oficio base: {movimiento.documento?.numero_oficio ?? movimiento.documento?.id_documento ?? '-'}</Badge>
                            <Badge variant="secondary">Este nuevo oficio quedara enlazado como respuesta</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Nuevo oficio de respuesta</CardTitle>
                        <CardDescription>
                            Usa el mismo comentario del envio original para enlazar la respuesta con el mismo motivo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-6" onSubmit={onSubmit}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="numero_oficio">Numero de oficio</Label>
                                    <Input
                                        id="numero_oficio"
                                        value={data.numero_oficio}
                                        onChange={(event) => setData('numero_oficio', event.target.value)}
                                        placeholder="OF-2026-010"
                                    />
                                    <InputError message={errors.numero_oficio} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fecha_oficio">Fecha de oficio <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="fecha_oficio"
                                        type="date"
                                        value={data.fecha_oficio}
                                        onChange={(event) => setData('fecha_oficio', event.target.value)}
                                    />
                                    <InputError message={errors.fecha_oficio} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Remitente <span className="text-red-500">*</span></Label>
                                    <Select value={String(data.remitente_id || '')} onValueChange={(value) => setData('remitente_id', value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecciona remitente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {remitentes.map((remitente) => (
                                                <SelectItem key={remitente.id_remitente} value={String(remitente.id_remitente)}>
                                                    {remitente.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.remitente_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Tipo <span className="text-red-500">*</span></Label>
                                    <Select value={data.tipo} onValueChange={(value) => setData('tipo', value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecciona tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tipos.map((tipo) => (
                                                <SelectItem key={tipo} value={tipo}>
                                                    {tipo}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.tipo} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="palabra_clave">Palabra clave <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="palabra_clave"
                                        value={data.palabra_clave}
                                        onChange={(event) => setData('palabra_clave', event.target.value)}
                                        placeholder="Respuesta"
                                    />
                                    <InputError message={errors.palabra_clave} />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="comentario_envio">Comentario / motivo <span className="text-red-500">*</span></Label>
                                    <Textarea
                                        id="comentario_envio"
                                        value={data.comentario_envio}
                                        onChange={(event) => setData('comentario_envio', event.target.value)}
                                        placeholder="Escribe el mismo motivo del movimiento original..."
                                        required
                                    />
                                    <InputError message={errors.comentario_envio} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Archivo PDF <span className="text-red-500">*</span></Label>
                                <Input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={(event) => handleFile(event.target.files?.[0] || null)}
                                />
                                <p className="text-xs text-muted-foreground">Solo PDF, maximo 4 MB.</p>
                                <InputError message={errors.archivo} />
                            </div>

                            {progress ? (
                                <div className="space-y-2">
                                    <Progress value={progress.percentage} />
                                    <p className="text-xs text-muted-foreground">Subiendo archivo: {progress.percentage}%</p>
                                </div>
                            ) : null}

                            <Button type="submit" disabled={processing}>
                                {processing ? 'Enviando respuesta...' : 'Crear y enviar respuesta'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Responder.layout = {
    breadcrumbs: [
        {
            title: 'Mis documentos',
            href: DocumentoController.index.url(),
        },
        {
            title: 'Responder oficio',
            href: '#',
        },
    ],
};
