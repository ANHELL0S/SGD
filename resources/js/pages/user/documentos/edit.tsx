import { Head, Link, useForm } from '@inertiajs/react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import InputError from '@/components/input-error';
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

type Remitente = {
    id_remitente: number;
    nombre: string;
};

type Documento = {
    id_documento: number;
    numero_oficio: string | null;
    fecha_oficio: string | null;
    remitente_id: number;
    tipo: string;
    palabra_clave: string;
    archivo: string;
    recibido: string;
};

type Props = {
    documento: Documento;
    remitentes: Remitente[];
    tipos: string[];
};

type FormData = {
    numero_oficio: string;
    fecha_oficio: string;
    remitente_id: string;
    tipo: string;
    palabra_clave: string;
    archivo: File | null;
};

function getFileUrl(archivo: string): string {
    return `/storage/${archivo}`;
}

function isPdfFile(archivo: string): boolean {
    return archivo.toLowerCase().endsWith('.pdf');
}

export default function Edit({ documento, remitentes, tipos }: Props) {
    const fechaInicial = documento.fecha_oficio ? documento.fecha_oficio.slice(0, 10) : '';

    const { data, setData, post, transform, processing, progress, errors } = useForm<FormData>({
        numero_oficio: documento.numero_oficio ?? '',
        fecha_oficio: fechaInicial,
        remitente_id: String(documento.remitente_id),
        tipo: documento.tipo,
        palabra_clave: documento.palabra_clave,
        archivo: null,
    });

    const fileUrl = getFileUrl(documento.archivo);
    const shouldRenderProgress = Boolean(data.archivo) && (processing || Boolean(progress));
    const isServerProcessing = processing && Boolean(progress) && (progress?.percentage ?? 0) >= 100;
    const currentUploadPercentage = progress?.percentage ?? 0;
    const displayProgress = progress
        ? (processing ? Math.min(currentUploadPercentage, 90) : currentUploadPercentage)
        : (processing ? 90 : 0);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        if (processing) {
            return;
        }

        transform((formData) => ({
            ...formData,
            _method: 'patch',
        }));

        post(DocumentoController.update.url(documento.id_documento), {
            forceFormData: true,
        });
    };

    return (
        <>
            <Head title={`Editar oficio ${documento.numero_oficio ?? documento.id_documento}`} />

            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold">
                            {documento.numero_oficio ?? `Oficio ${documento.id_documento}`}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Actualiza los datos del oficio y, si lo necesitas, reemplaza el archivo original.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href={DocumentoController.show(documento.id_documento)}>
                            Volver al detalle
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos del oficio</CardTitle>
                            <CardDescription>
                                Edita los campos principales. El estado actual se mantiene como {documento.recibido.replaceAll('_', ' ')}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="numero_oficio">Numero de oficio</Label>
                                        <Input
                                            id="numero_oficio"
                                            disabled={processing}
                                            value={data.numero_oficio}
                                            onChange={(event) => setData('numero_oficio', event.target.value)}
                                            placeholder="OF-2026-001"
                                        />
                                        <InputError message={errors.numero_oficio} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fecha_oficio">Fecha de oficio  <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="fecha_oficio"
                                            type="date"
                                            disabled={processing}
                                            value={data.fecha_oficio}
                                            onChange={(event) => setData('fecha_oficio', event.target.value)}
                                        />
                                        <InputError message={errors.fecha_oficio} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Remitente <span className="text-red-500">*</span></Label>
                                        <Select disabled={processing} value={data.remitente_id} onValueChange={(value) => setData('remitente_id', value)}>
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
                                        <Select disabled={processing} value={data.tipo} onValueChange={(value) => setData('tipo', value)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecciona tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tipos.map((tipo) => (
                                                    <SelectItem key={tipo} value={tipo} >
                                                        {tipo}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.tipo} />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="palabra_clave">Palabra clave <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="palabra_clave"
                                            disabled={processing}
                                            value={data.palabra_clave}
                                            onChange={(event) => setData('palabra_clave', event.target.value)}
                                            placeholder="Contratacion"
                                        />
                                        <InputError message={errors.palabra_clave} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Archivo nuevo opcional</Label>
                                    <Input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        disabled={processing}
                                        onChange={(event) => setData('archivo', event.target.files?.[0] || null)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Si no seleccionas un archivo nuevo, se conservara el actual. Solo PDF, maximo 4 MB.
                                    </p>
                                    <InputError message={errors.archivo} />
                                </div>

                                {shouldRenderProgress ? (
                                    <div className="space-y-2">
                                        <Progress value={displayProgress} />
                                        <p className="text-xs text-muted-foreground">
                                            {isServerProcessing
                                                ? 'Archivo subido. Procesando documento...'
                                                : `Subiendo archivo: ${currentUploadPercentage}%`}
                                        </p>
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-3">
                                    <Button type="submit" disabled={processing} >
                                        {processing ? 'Actualizando...' : 'Actualizar oficio'}
                                    </Button>
                                    <Button asChild type="button" variant="outline">
                                        <Link href={DocumentoController.show(documento.id_documento)}>
                                            Cancelar
                                        </Link>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Archivo actual</CardTitle>
                            <CardDescription>
                                Revisa el archivo que esta guardado antes de reemplazarlo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-xl border bg-background">
                                {isPdfFile(documento.archivo) ? (
                                    <iframe title="Archivo actual" src={fileUrl} className="h-[32rem] w-full" />
                                ) : (
                                    <img
                                        src={fileUrl}
                                        alt="Archivo actual"
                                        className="h-[32rem] w-full object-contain"
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
