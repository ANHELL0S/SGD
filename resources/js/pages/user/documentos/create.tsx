import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
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

type Props = {
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

export default function Create({ remitentes, tipos }: Props) {
    const { data, setData, post, processing, progress, errors, reset } = useForm<FormData>({
        numero_oficio: '',
        fecha_oficio: '',
        remitente_id: '',
        tipo: '',
        palabra_clave: '',
        archivo: null,
    });

    const pdfPreviewUrl = useMemo(() => {
        if (!data.archivo) {
return null;
}

        return URL.createObjectURL(data.archivo);
    }, [data.archivo]);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) {
URL.revokeObjectURL(pdfPreviewUrl);
}
        };
    }, [pdfPreviewUrl]);

    const handleFile = (file: File | null): void => {
        if (processing) {
            return;
        }

        setData('archivo', file);
    };

    const shouldRenderProgress = Boolean(data.archivo) && (processing || Boolean(progress));
    const isServerProcessing = processing && Boolean(progress) && (progress?.percentage ?? 0) >= 100;
    const currentUploadPercentage = progress?.percentage ?? 0;
    const displayProgress = progress
        ? (processing ? Math.min(currentUploadPercentage, 90) : currentUploadPercentage)
        : (processing ? 90 : 0);

    const onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();

        if (processing) {
            return;
        }

        handleFile(event.dataTransfer.files?.[0] ?? null);
    };

    const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        post(DocumentoController.store.url(), {
            forceFormData: true,
            onSuccess: () => reset('numero_oficio', 'fecha_oficio', 'remitente_id', 'tipo', 'palabra_clave', 'archivo'),
        });
    };

    return (
        <>
            <Head title="Subir documento" />

            <div className="space-y-4 p-4 md:p-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Subir documento</h1>
                        <p className="text-sm text-muted-foreground">
                            Registra un nuevo oficio y extrae su contenido OCR automaticamente.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={DocumentoController.index.url()}>Ver mis documentos</Link>
                    </Button>
                </div>

                {/* Layout principal */}
                <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">

                    {/* Columna izquierda — campos */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Datos del oficio</CardTitle>
                                <CardDescription>Completa la información principal del documento.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="numero_oficio">Número de oficio</Label>
                                        <Input
                                            id="numero_oficio"
                                            disabled={processing}
                                            value={data.numero_oficio}
                                            onChange={(e) => setData('numero_oficio', e.target.value)}
                                            placeholder="OF-2026-001"
                                        />
                                        <InputError message={errors.numero_oficio} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="fecha_oficio">
                                            Fecha de oficio <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="fecha_oficio"
                                            type="date"
                                            disabled={processing}
                                            value={data.fecha_oficio}
                                            onChange={(e) => setData('fecha_oficio', e.target.value)}
                                        />
                                        <InputError message={errors.fecha_oficio} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Remitente <span className="text-red-500">*</span></Label>
                                        <Select
                                            disabled={processing}
                                            value={String(data.remitente_id || '')}
                                            onValueChange={(value) => setData('remitente_id', value)}
                                        >
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

                                    <div className="space-y-1.5">
                                        <Label>Tipo <span className="text-red-500">*</span></Label>
                                        <Select disabled={processing} value={data.tipo} onValueChange={(value) => setData('tipo', value)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecciona tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tipos.map((tipo) => (
                                                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.tipo} />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label htmlFor="palabra_clave">
                                            Palabra clave <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="palabra_clave"
                                            disabled={processing}
                                            value={data.palabra_clave}
                                            onChange={(e) => setData('palabra_clave', e.target.value)}
                                            placeholder="Contratacion"
                                        />
                                        <InputError message={errors.palabra_clave} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Archivo</CardTitle>
                                <CardDescription>Solo PDF, máximo 4 MB.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={onDrop}
                                    className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
                                >
                                    <p className="text-sm text-muted-foreground">
                                        Arrastra y suelta tu archivo aquí o selecciona desde tu equipo.
                                    </p>
                                    <Input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        disabled={processing}
                                        className="mt-3"
                                        onChange={(e) => handleFile(e.target.files?.[0] || null)}
                                    />
                                    {data.archivo && (
                                        <p className="mt-2 text-sm font-medium text-slate-700">{data.archivo.name}</p>
                                    )}
                                </div>
                                <InputError message={errors.archivo} />

                                {shouldRenderProgress && (
                                    <div className="space-y-1.5">
                                        <Progress value={displayProgress} />
                                        <p className="text-xs text-muted-foreground">
                                            {isServerProcessing
                                                ? 'Archivo subido. Procesando documento...'
                                                : `Subiendo: ${currentUploadPercentage}%`}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {processing ? 'Guardando...' : 'Guardar documento'}
                        </Button>
                    </div>

                    {/* Columna derecha — preview */}
                    <Card className="h-fit xl:sticky xl:top-6">
                        <CardHeader>
                            <CardTitle>Vista previa</CardTitle>
                            <CardDescription>
                                {pdfPreviewUrl
                                    ? 'Vista local antes de guardar el oficio.'
                                    : 'El PDF aparecerá aquí una vez que lo selecciones.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {pdfPreviewUrl ? (
                                <div className="overflow-hidden rounded-lg border bg-white">
                                    <iframe
                                        title="Vista previa del PDF"
                                        src={pdfPreviewUrl}
                                        className="h-[600px] w-full"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-[600px] items-center justify-center rounded-lg border border-dashed bg-muted/20">
                                    <p className="text-sm text-muted-foreground">Sin archivo seleccionado</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </form>
            </div>
        </>
    );
}
