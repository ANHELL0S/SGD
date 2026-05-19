import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    FileText,
    Tag,
    User,
    Layers,
    Upload,
    AlertCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

type Remitente = { id_remitente: number; nombre: string };
type Documento = {
    id_documento: number;
    numero_oficio: string | null;
    asunto: string | null;
    fecha_oficio: string | null;
    remitente_id: number;
    tipo: string;
    palabra_clave: string;
    archivo: string;
    recibido: string;
};
type Props = { documento: Documento; remitentes: Remitente[]; tipos: string[] };
type FormValues = {
    numero_oficio: string;
    asunto: string;
    fecha_oficio: string;
    remitente_id: string;
    tipo: string;
    palabra_clave: string;
};

function FormField({
    label,
    required,
    icon: Icon,
    error,
    warning,
    children,
    className = '',
}: {
    label: string;
    required?: boolean;
    icon: React.ElementType;
    error?: string;
    warning?: string | null;
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
            {error ? (
                <InputError message={error} />
            ) : warning ? (
                <p className="text-xs text-amber-500">{warning}</p>
            ) : null}
        </div>
    );
}

export default function Edit({ documento, remitentes, tipos }: Props) {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState<{ percentage: number } | null>(null);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [arquivo, setArquivo] = useState<File | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>(`/storage/${documento.archivo}`);
    const previewUrlRef = useRef<string | null>(null);

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitted },
        watch,
    } = useForm<FormValues>({
        defaultValues: {
            numero_oficio: documento.numero_oficio ?? '',
            asunto: documento.asunto ?? '',
            fecha_oficio: documento.fecha_oficio?.slice(0, 10) ?? '',
            remitente_id: String(documento.remitente_id),
            tipo: documento.tipo,
            palabra_clave: documento.palabra_clave,
        },
        mode: 'onChange',
    });

    const watchedNumeroOficio = watch('numero_oficio');
    const watchedAsunto = watch('asunto');
    const watchedPalabraClave = watch('palabra_clave');
    const watchedFechaOficio = watch('fecha_oficio');


    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    const handleFile = (file: File | null): void => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }

        if (file) {
            const newUrl = URL.createObjectURL(file);
            previewUrlRef.current = newUrl;
            setPdfPreviewUrl(newUrl);
            setArquivo(file);
        } else {
            setPdfPreviewUrl(`/storage/${documento.archivo}`);
            setArquivo(null);
        }
        setServerErrors((prev) => ({ ...prev, archivo: '' }));
    };

    const { onChange: onChangeNumeroOficio, ...regNumeroOficio } = register('numero_oficio', {
        maxLength: { value: 100, message: 'Máximo 100 caracteres' },
    });
    const { onChange: onChangeFechaOficio, ...regFechaOficio } = register('fecha_oficio', {
        required: 'La fecha de oficio es requerida',
    });
    const { onChange: onChangeAsunto, ...regAsunto } = register('asunto', {
        required: 'El asunto es requerido',
        maxLength: { value: 255, message: 'Máximo 255 caracteres' },
    });
    const { onChange: onChangePalabraClave, ...regPalabraClave } = register('palabra_clave', {
        required: 'La palabra clave es requerida',
        maxLength: { value: 30, message: 'Máximo 30 caracteres' },
    });

    const onSubmit = (formValues: FormValues) => {
        setProcessing(true);
        setServerErrors({});

        const data = new FormData();
        data.append('_method', 'PATCH');
        data.append('numero_oficio', formValues.numero_oficio);
        data.append('asunto', formValues.asunto);
        data.append('fecha_oficio', formValues.fecha_oficio);
        data.append('remitente_id', formValues.remitente_id);
        data.append('tipo', formValues.tipo);
        data.append('palabra_clave', formValues.palabra_clave);
        if (arquivo) {
            data.append('archivo', arquivo);
        }

        router.post(DocumentoController.update.url(documento.id_documento), data, {
            forceFormData: true,
            preserveScroll: true,
            onProgress: (e) => {
                if (e && e.total) {
                    setProgress({ percentage: Math.round((e.loaded / e.total) * 100) });
                }
            },
            onSuccess: () => {
                toast.success('El oficio fue actualizado correctamente.');
            },
            onError: (errors) => {
                setServerErrors(errors as Record<string, string>);
                window.scrollTo(0, 0);
            },
            onFinish: () => {
                setProcessing(false);
                setProgress(null);
            },
        });
    };

    const shouldRenderProgress = Boolean(arquivo) && (processing || Boolean(progress));
    const displayProgress = progress?.percentage ?? 0;

    return (
        <>
            <Head title="Editar documento" />
            <ProcessingOverlay show={processing} message="Actualizando documento..." />

            <div className="mx-auto w-full max-w-screen-xl p-2 md:p-4 lg:p-6 animate-slide-in-up">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0 mt-0.5">
                            <Link href={DocumentoController.index.url()}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-base font-semibold tracking-tight text-[var(--text)]">Editar documento</h1>
                    </div>
                    <p className="text-xs text-muted-foreground ml-10 sm:ml-0">Actualiza la información técnica o reemplaza el PDF.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_400px] items-start">

                    {/* COLUMNA IZQUIERDA: VISOR */}
                    <div className="xl:sticky xl:top-8 order-2 xl:order-1">
                        <Card className="overflow-hidden flex flex-col h-[500px]">
                            <CardContent className="p-0 pt-0 flex-1 relative bg-[var(--card)]">
                                <iframe
                                    title="Vista previa"
                                    src={`${pdfPreviewUrl}#view=FitH&navpanes=0`}
                                    className="h-full w-full border-none min-h-[320px]"
                                />
                                {!arquivo ? (
                                    <label className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg hover:opacity-90 transition-all">
                                        <Upload className="h-4 w-4" />
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            disabled={processing}
                                            onChange={(e) => handleFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleFile(null)}
                                        className="absolute bottom-2 right-2 text-[10px] font-bold text-red-500 bg-white px-2 py-1 rounded shadow hover:underline tracking-tighter"
                                    >
                                        REEMPLAZAR
                                    </button>
                                )}
                            </CardContent>

                            {(shouldRenderProgress || serverErrors.archivo) && (
                                <div className="px-3 py-2 border-t bg-white">
                                    {serverErrors.archivo && (
                                        <p className="text-[10px] font-medium text-red-600 mb-1 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> {serverErrors.archivo}
                                        </p>
                                    )}
                                    {shouldRenderProgress && (
                                        <div className="space-y-1">
                                            <Progress value={displayProgress} className="h-1" />
                                            <div className="flex justify-between text-[9px] uppercase font-bold text-[var(--secondary-foreground)]">
                                                <span>Subiendo cambio</span>
                                                <span>{displayProgress}%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* COLUMNA DERECHA: FORMULARIO */}
                    <div className="space-y-4 order-1 xl:order-2">
                        <Card className="border-t-2 border-t-[var(--primary)] shadow-sm">
                            <CardContent className="px-4 pb-4 pt-2 space-y-3 mt-2">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <FormField label="Número de oficio" icon={FileText} error={serverErrors.numero_oficio || errors.numero_oficio?.message}>
                                        <div className="space-y-1">
                                            <Input
                                                disabled={processing}
                                                placeholder="OF-2026-001"
                                                className="h-8 text-xs"
                                                {...regNumeroOficio}
                                                maxLength={100}
                                                onChange={(e) => {
                                                    onChangeNumeroOficio(e);
                                                    setServerErrors((prev) => ({ ...prev, numero_oficio: '' }));
                                                }}
                                            />
                                            <div className="flex items-center justify-between text-[10px]">
                                                {watchedNumeroOficio.length >= 100
                                                    ? <span className="text-amber-500">Límite de 100 caracteres alcanzado</span>
                                                    : <span />}
                                                <span className="text-[var(--secondary-foreground)]/50">{watchedNumeroOficio.length}/100</span>
                                            </div>
                                        </div>
                                    </FormField>

                                    <FormField label="Fecha de oficio" required icon={CalendarDays} error={serverErrors.fecha_oficio || (watchedFechaOficio || isSubmitted ? errors.fecha_oficio?.message : undefined)}>
                                        <Input
                                            type="date"
                                            disabled={processing}
                                            className="h-8 text-xs"
                                            {...regFechaOficio}
                                            onChange={(e) => {
                                                onChangeFechaOficio(e);
                                                setServerErrors((prev) => ({ ...prev, fecha_oficio: '' }));
                                            }}
                                        />
                                    </FormField>

                                    <FormField label="Asunto" required icon={FileText} error={serverErrors.asunto || (watchedAsunto || isSubmitted ? errors.asunto?.message : undefined)} className="sm:col-span-2">
                                        <div className="space-y-1">
                                            <Input
                                                disabled={processing}
                                                placeholder="Descripción del contenido"
                                                className="h-8 text-xs"
                                                {...regAsunto}
                                                maxLength={255}
                                                onChange={(e) => {
                                                    onChangeAsunto(e);
                                                    setServerErrors((prev) => ({ ...prev, asunto: '' }));
                                                }}
                                            />
                                            <div className="flex items-center justify-between text-[10px]">
                                                {watchedAsunto.length >= 255
                                                    ? <span className="text-amber-500">Límite de 255 caracteres alcanzado</span>
                                                    : <span />}
                                                <span className="text-[var(--secondary-foreground)]/50">{watchedAsunto.length}/255</span>
                                            </div>
                                        </div>
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>

                        <Separator />

                        <Card className="border-t-2 border-t-[var(--primary)] shadow-sm">
                            <CardContent className="px-4 pt-0 pb-2">
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-row gap-2">
                                        <div className="flex-1 min-w-0">
                                            <FormField label="Remitente" required icon={User} error={serverErrors.remitente_id || errors.remitente_id?.message}>
                                                <Controller
                                                    name="remitente_id"
                                                    control={control}
                                                    rules={{ required: 'El remitente es requerido' }}
                                                    render={({ field }) => (
                                                        <Select
                                                            disabled={processing}
                                                            value={String(field.value || '')}
                                                            onValueChange={(v) => {
                                                                field.onChange(v);
                                                                setServerErrors((prev) => ({ ...prev, remitente_id: '' }));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs w-full">
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {remitentes.map((r) => (
                                                                    <SelectItem key={r.id_remitente} value={String(r.id_remitente)}>
                                                                        <span className="truncate block max-w-[120px]" title={r.nombre}>{r.nombre}</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </FormField>
                                        </div>
                                        <div className="w-px bg-slate-200 mx-1" />
                                        <div className="flex-1 min-w-0">
                                            <FormField label="Tipo" required icon={Layers} error={serverErrors.tipo || errors.tipo?.message}>
                                                <Controller
                                                    name="tipo"
                                                    control={control}
                                                    rules={{ required: 'El tipo es requerido' }}
                                                    render={({ field }) => (
                                                        <Select
                                                            disabled={processing}
                                                            value={field.value}
                                                            onValueChange={(v) => {
                                                                field.onChange(v);
                                                                setServerErrors((prev) => ({ ...prev, tipo: '' }));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs w-full">
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {tipos.map((t) => (
                                                                    <SelectItem key={t} value={t}>
                                                                        <span className="truncate block max-w-[80px]" title={t}>{t}</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                    <FormField label="Palabra clave" required icon={Tag} error={serverErrors.palabra_clave || (watchedPalabraClave || isSubmitted ? errors.palabra_clave?.message : undefined)} className="w-full">
                                        <div className="space-y-1">
                                            <Input
                                                disabled={processing}
                                                placeholder="Ej: Contratación, Presupuesto..."
                                                className="h-8 text-xs"
                                                {...regPalabraClave}
                                                maxLength={30}
                                                onChange={(e) => {
                                                    onChangePalabraClave(e);
                                                    setServerErrors((prev) => ({ ...prev, palabra_clave: '' }));
                                                }}
                                            />
                                            <div className="flex items-center justify-between text-[10px]">
                                                {watchedPalabraClave.length >= 30
                                                    ? <span className="text-amber-500">Límite de 30 caracteres alcanzado</span>
                                                    : <span />}
                                                <span className="text-[var(--secondary-foreground)]/50">{watchedPalabraClave.length}/30</span>
                                            </div>
                                        </div>
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing || !isValid}
                                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all active:scale-[0.98] text-xs"
                            >
                                {processing ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
