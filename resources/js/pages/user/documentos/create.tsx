import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    AlertCircle,
    FileText,
    Layers,
    Plus,
    Tag,
    Upload,
    User,
    ArrowLeft,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

/** Campo de formulario con icono, label, asterisco de requerido y zona de error/advertencia. */
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

/**
 * Formulario de carga de un nuevo documento (oficio).
 *
 * Layout de dos columnas: izquierda con preview del PDF (drag & drop o click) y barra
 * de progreso de subida; derecha con los campos del formulario gestionado por react-hook-form.
 * Incluye un Dialog de creación rápida de remitente que llama a `/user/remitentes/quick`
 * vía fetch nativo (no Inertia) para no interrumpir el formulario principal.
 * El PDF se convierte en un Object URL para la preview y se revoca al desmontar.
 * Accesible para usuarios con rol `user`.
 */
export default function Create({ remitentes, tipos }: Props) {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState<{ percentage: number } | null>(null);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const previewUrlRef = useRef<string | null>(null);
    const [arquivo, setArquivo] = useState<File | null>(null);

    // Estado para lista local de remitentes y dialog de creación rápida
    const [remitentesList, setRemitentesList] = useState<Remitente[]>(remitentes);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [quickNombre, setQuickNombre] = useState('');
    const [quickNombreError, setQuickNombreError] = useState<string | null>(null);
    const [quickProcessing, setQuickProcessing] = useState(false);
    const [quickServerError, setQuickServerError] = useState<string | null>(null);

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitted },
        watch,
        reset,
        setValue,
    } = useForm<FormData>({
        defaultValues: {
            numero_oficio: '',
            asunto: '',
            fecha_oficio: '',
            remitente_id: '',
            tipo: '',
            palabra_clave: '',
            archivo: null,
        },
        mode: 'onChange',
    });

    const watchedAsunto = watch('asunto');
    const watchedPalabraClave = watch('palabra_clave');
    const watchedNumeroOficio = watch('numero_oficio');

    const requiredError = (error?: { type?: string; message?: string }, serverError?: string): string | undefined => {
        if (serverError) return serverError;
        if (!error) return undefined;
        if (error.type === 'required' && !isSubmitted) return undefined;
        return error.message;
    };

    // ── Validaciones del dialog de remitente ──

    const validarQuickNombre = (v: string, alEnviar = false): boolean => {
        const trimmed = v.trim();
        if (trimmed.length === 0) {
            setQuickNombreError(alEnviar ? 'El nombre es requerido.' : null);
            return false;
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s]+$/.test(trimmed)) {
            setQuickNombreError('Solo letras, números y espacios.');
            return false;
        }
        if (trimmed.length > 50) {
            setQuickNombreError('Máximo 50 caracteres.');
            return false;
        }
        setQuickNombreError(null);
        return true;
    };

    const resetDialog = () => {
        setQuickNombre('');
        setQuickNombreError(null);
        setQuickServerError(null);
    };

    /**
     * Crea un remitente vía fetch JSON, lo inserta en la lista local ordenada alfabéticamente
     * y lo selecciona automáticamente en el campo del formulario principal.
     */
    const handleQuickStore = async () => {
        if (!validarQuickNombre(quickNombre, true)) return;

        setQuickProcessing(true);
        setQuickServerError(null);

        try {
            const xsrf = document.cookie
                .split('; ')
                .find((row) => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1];

            const res = await fetch('/user/remitentes/quick', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : '',
                },
                body: JSON.stringify({ nombre: quickNombre.trim().toUpperCase() }),
            });

            const body = await res.json();

            if (!res.ok) {
                if (body.errors?.nombre) setQuickNombreError(body.errors.nombre[0]);
                else setQuickServerError('Error al crear el remitente.');
                return;
            }

            const nuevo: Remitente = body;
            setRemitentesList((prev) =>
                [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
            );
            setValue('remitente_id', String(nuevo.id_remitente), { shouldValidate: true });
            setServerErrors((prev) => ({ ...prev, remitente_id: '' }));
            setDialogOpen(false);
            resetDialog();
            toast.success(`Remitente "${nuevo.nombre}" creado correctamente.`);
        } catch {
            setQuickServerError('Error de conexión. Intenta nuevamente.');
        } finally {
            setQuickProcessing(false);
        }
    };

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
URL.revokeObjectURL(previewUrlRef.current);
}
        };
    }, []);

    /**
     * Reemplaza el archivo seleccionado: revoca el Object URL anterior para liberar memoria
     * y crea uno nuevo para la preview del iframe.
     */
    const handleFile = (file: File | null): void => {
        if (processing) {
return;
}

        if (previewUrlRef.current) {
URL.revokeObjectURL(previewUrlRef.current);
}

        const newUrl = file ? URL.createObjectURL(file) : null;
        previewUrlRef.current = newUrl;
        setPdfPreviewUrl(newUrl);
        setArquivo(file);
        setServerErrors((prev) => ({ ...prev, archivo: '' }));
    };

    const onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();

        if (processing) {
return;
}

        const file = event.dataTransfer.files?.[0];

        if (file?.type === 'application/pdf') {
            handleFile(file);
        }
    };

    const onSubmit = async (formData: FormData) => {
        if (!arquivo) {
            setServerErrors({ archivo: 'El archivo PDF es requerido' });

            return;
        }

        setProcessing(true);
        setServerErrors({});

        const data = new FormData();
        data.append('numero_oficio', formData.numero_oficio);
        data.append('asunto', formData.asunto);
        data.append('fecha_oficio', formData.fecha_oficio);
        data.append('remitente_id', formData.remitente_id);
        data.append('tipo', formData.tipo);
        data.append('palabra_clave', formData.palabra_clave);
        data.append('archivo', arquivo);

        router.post(DocumentoController.store.url(), data, {
            forceFormData: true,
            preserveScroll: true,
            onProgress: (e) => {
                if (e && e.total) {
                    setProgress({ percentage: Math.round((e.loaded / e.total) * 100) });
                }
            },
            onSuccess: () => {
                reset();
                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current);
                    previewUrlRef.current = null;
                }
                setArquivo(null);
                setPdfPreviewUrl(null);
                setProgress(null);
                toast.success('El oficio fue creado correctamente.');
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

    // Lógica de progreso
    const shouldRenderProgress = Boolean(arquivo) && (processing || Boolean(progress));
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

                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[1fr_480px] items-start">

                    <div className="xl:sticky xl:top-8">
                        <Card className="overflow-hidden border-t-2 border-t-[var(--primary)] shadow-sm flex flex-col h-[600px]">
                            <CardHeader className=" border-b text-sm px-5 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                                        <Upload className="h-4 w-4 text-[var(--primary)]" />
                                        {arquivo ? 'Documento Listo' : 'Subir PDF'}
                                    </CardTitle>
                                    {arquivo && (
                                        <button
                                            type="button"
                                            onClick={() => handleFile(null)}
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
                                        <p className="text-[11px] text-[var(--foreground)]/70 mt-1">Máximo 2 MB</p>
                                    </div>
                                ) : (
                                    <iframe
                                        title="Vista previa"
                                        src={`${pdfPreviewUrl}#view=FitH&navpanes=0`}
                                        className="h-full w-full border-none"
                                    />
                                )}
                            </CardContent>



                            {(shouldRenderProgress || serverErrors.archivo) && (
                                <div className="px-5 py-3 border-t bg-white">
                                    {serverErrors.archivo && (
                                        <p className="text-[11px] font-medium text-red-600 mb-2 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> {serverErrors.archivo}
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

                                    <FormField label="Fecha de oficio" required icon={CalendarDays} error={requiredError(errors.fecha_oficio, serverErrors.fecha_oficio)}>
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

                                    <FormField label="Asunto" required icon={FileText} error={requiredError(errors.asunto, serverErrors.asunto)} className="sm:col-span-2">
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
                                            <FormField label="Remitente" required icon={User} error={requiredError(errors.remitente_id, serverErrors.remitente_id)}>
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
                                                                {remitentesList.map((r) => (
                                                                    <SelectItem key={r.id_remitente} value={String(r.id_remitente)}>
                                                                        <span className="truncate block max-w-[120px]" title={r.nombre}>{r.nombre}</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={processing}
                                                    onClick={() => { resetDialog(); setDialogOpen(true); }}
                                                    className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50 mt-0.5"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Crear remitente
                                                </button>
                                            </FormField>
                                        </div>
                                        <div className="w-px bg-slate-200 mx-1" />
                                        <div className="flex-1 min-w-0">
                                            <FormField label="Tipo" required icon={Layers} error={requiredError(errors.tipo, serverErrors.tipo)}>
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
                                    <FormField label="Palabra clave" required icon={Tag} error={requiredError(errors.palabra_clave, serverErrors.palabra_clave)} className="w-full">
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
                                disabled={processing || !isValid || !arquivo}
                                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all active:scale-[0.98] text-xs"
                            >
                                {processing ? 'Guardando...' : 'Guardar documento'}
                            </Button>
                        </div>
                    </div>

                </form>
            </div>

            {/* ── Dialog: Crear remitente rápido ── */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); setDialogOpen(open); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">Nuevo remitente</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 py-1">
                        {quickServerError && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {quickServerError}
                            </p>
                        )}

                        {/* Nombre */}
                        <div className="space-y-1">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Nombre <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={quickNombre}
                                maxLength={50}
                                placeholder="Ej. MINISTERIO DE SALUD"
                                className="h-8 text-xs"
                                onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setQuickNombre(v);
                                    validarQuickNombre(v);
                                }}
                                onBlur={() => validarQuickNombre(quickNombre)}
                            />
                            <div className="flex items-center justify-between text-[10px]">
                                {quickNombreError
                                    ? <span className="text-destructive">{quickNombreError}</span>
                                    : quickNombre.length >= 50
                                        ? <span className="text-amber-500">Límite de 50 caracteres alcanzado</span>
                                        : <span />}
                                <span className="text-muted-foreground/60">{quickNombre.length}/50</span>
                            </div>
                        </div>

                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDialogOpen(false)}
                            disabled={quickProcessing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={quickProcessing}
                            onClick={handleQuickStore}
                            className="text-white"
                        >
                            {quickProcessing ? 'Guardando...' : 'Guardar remitente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
