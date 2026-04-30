import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    CalendarDays,
    AlertCircle,
    FileText,
    Layers,
    Tag,
    Upload,
    User,
} from 'lucide-react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ExternalLink } from 'lucide-react';
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
    asunto: string;
    fecha_oficio: string;
    remitente_id: string;
    tipo: string;
    palabra_clave: string;
    archivo: File | null;
};

// Componente FormField optimizado
function FormField({
    label,
    required,
    icon: Icon,
    error,
    children,
    className = '',
}: {
    label: string;
    required?: boolean;
    icon: React.ElementType;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label className="flex items-center gap-1.5 text-sm font-medium text-[var(--secondary-foreground)]/70">
                <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                {label}
                {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {error && <InputError message={error} />}
        </div>
    );
}

export default function Create({ remitentes, tipos }: Props) {
    const { data, setData, post, processing, progress, errors, reset } =
        useForm<FormData>({
            numero_oficio: '',
            asunto: '',
            fecha_oficio: '',
            remitente_id: '',
            tipo: '',
            palabra_clave: '',
            archivo: null,
        });

    // Manejo de la URL de vista previa para evitar fugas de memoria
    const pdfPreviewUrl = useMemo(() => {
        if (!data.archivo) return null;
        return URL.createObjectURL(data.archivo);
    }, [data.archivo]);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    const handleFile = (file: File | null): void => {
        if (processing) return;
        setData('archivo', file);
    };

    const onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        if (processing) return;
        const file = event.dataTransfer.files?.[0];
        if (file?.type === 'application/pdf') {
            handleFile(file);
        }
    };

    const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        post(DocumentoController.store.url(), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                toast.success('El oficio fue creado correctamente.');
            },
        });
    };

    // Lógica de progreso
    const shouldRenderProgress = Boolean(data.archivo) && (processing || Boolean(progress));
    const isServerProcessing = processing && (progress?.percentage ?? 0) >= 100;
    const displayProgress = progress?.percentage ?? 0;

    return (
        <>
            <Head title="Subir documento" />
            <ProcessingOverlay
                show={processing}
                message={isServerProcessing ? 'Procesando documento...' : 'Subiendo archivo...'}
            />

            <div className="mx-auto w-full max-w-screen-xl p-4 md:p-6 lg:p-8">
                {/* Header Superior */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className='flex items-center gap-4 '>
                           <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0 mt-0.5">
                        <Link href={DocumentoController.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Subir documento</h1>
                            <p className="text-xs text-muted-foreground">Llena los datos y adjunta el PDF correspondiente.</p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-9">
                        <Link href={DocumentoController.index.url()}>Ver mis documentos</Link>
                    </Button>
                </div>

                <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_480px] items-start">

                    <div className="xl:sticky xl:top-8">
                        <Card className="overflow-hidden border-t-2 border-t-[var(--primary)] shadow-sm flex flex-col h-[600px]">
                            <CardHeader className=" border-b text-sm px-5 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                                        <Upload className="h-4 w-4 text-[var(--primary)]" />
                                        {data.archivo ? 'Documento Listo' : 'Subir PDF'}
                                    </CardTitle>
                                    {data.archivo && (
                                        <button
                                            type="button"
                                            onClick={() => { setData('archivo', null); }}
                                            className="text-[10px] font-bold text-red-500 hover:underline tracking-tighter"
                                        >
                                            REEMPLAZAR
                                        </button>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 relative bg-[var(--card)]">
                                {!pdfPreviewUrl ? (
                                    <div
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={onDrop}
                                        className="group flex h-full flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors hover:bg-[var(--sidebar)]/40"
                                    >
                                        <input
                                            type="file" accept=".pdf"
                                            disabled={processing}
                                            onChange={(e) => handleFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                        />
                                        <div className="rounded-full bg-[var(--sidebar)]/0 p-4 group-hover:bg-[var(--sidebar)]/80 transition-colors">
                                            <Upload className="h-8 w-8 text-blue-400" />
                                        </div>
                                        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">Arrastra el archivo aquí</p>
                                        <p className="text-[11px] text-[var(--foreground)]/70 mt-1">Máximo 4 MB</p>
                                    </div>
                                ) : (
                                    <iframe
                                        title="Vista previa"
                                        src={`${pdfPreviewUrl}#view=FitH&navpanes=0`}
                                        className="h-full w-full border-none"
                                    />
                                )}
                            </CardContent>



                            {(shouldRenderProgress || errors.archivo) && (
                                <div className="px-5 py-3 border-t bg-white">
                                    {errors.archivo && (
                                        <p className="text-[11px] font-medium text-red-600 mb-2 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> {errors.archivo}
                                        </p>
                                    )}
                                    {shouldRenderProgress && (
                                        <div className="space-y-1">
                                            <Progress value={displayProgress} className="h-1" />
                                            <div className="flex justify-between text-[9px] uppercase font-bold text-[var(--secondary-foreground)]">
                                                <span>{isServerProcessing ? 'Finalizando...' : 'Subiendo'}</span>
                                                <span>{displayProgress}%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>


                    </div>
                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <div className="space-y-6">
                        <Card className="border-t-2 border-t-[var(--primary)] shadow-sm">
                            <CardContent className="px-6 pb-6 pt-0 space-y-6">

                                {/* Sección 1: Identificación */}
                                <div className="grid gap-4 sm:grid-cols-2 ">

                                    <FormField label="Número de oficio" icon={FileText} error={errors.numero_oficio} >
                                        <Input
                                            disabled={processing}
                                            value={data.numero_oficio}
                                            onChange={(e) => setData('numero_oficio', e.target.value)}
                                            placeholder="OF-2026-001"
                                            className="h-9"
                                        />
                                    </FormField>

                                    <FormField label="Fecha de oficio" required icon={CalendarDays} error={errors.fecha_oficio}>
                                        <Input
                                            type="date"
                                            disabled={processing}
                                            value={data.fecha_oficio}
                                            onChange={(e) => setData('fecha_oficio', e.target.value)}
                                            className="h-9"
                                        />
                                    </FormField>

                                    <FormField label="Asunto" required icon={FileText} error={errors.asunto} className="sm:col-span-2">
                                        <Input
                                            disabled={processing}
                                            value={data.asunto}
                                            onChange={(e) => setData('asunto', e.target.value)}
                                            placeholder="Descripción del contenido"
                                            className="h-9"
                                        />
                                    </FormField>
                                </div>

                                {/* Separador */}
                                <div className="flex items-center gap-4 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--secondary-foreground)]">Clasificación</span>
                                    <div className="h-[1px] w-full bg-slate-100" />
                                </div>

                                {/* Sección 2: Clasificación */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField label="Remitente" required icon={User} error={errors.remitente_id}>
                                        <Select
                                            disabled={processing}
                                            value={String(data.remitente_id || '')}
                                            onValueChange={(v) => setData('remitente_id', v)}
                                        >
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                            <SelectContent>
                                                {remitentes.map((r) => (
                                                    <SelectItem key={r.id_remitente} value={String(r.id_remitente)}>{r.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormField>

                                    <FormField label="Tipo" required icon={Layers} error={errors.tipo}>
                                        <Select
                                            disabled={processing}
                                            value={data.tipo}
                                            onValueChange={(v) => setData('tipo', v)}
                                        >
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                            <SelectContent>
                                                {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormField>

                                    <FormField label="Palabra clave" required icon={Tag} error={errors.palabra_clave} className="sm:col-span-2">
                                        <Input
                                            disabled={processing}
                                            value={data.palabra_clave}
                                            onChange={(e) => setData('palabra_clave', e.target.value)}
                                            placeholder="Ej: Contratación, Presupuesto..."
                                            className="h-9"
                                        />
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing || !data.archivo}
                                className="w-full sm:w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                                {processing ? 'Guardando...' : 'Guardar documento'}
                            </Button>
                        </div>
                    </div>

                </form>
            </div>
        </>
    );
}
