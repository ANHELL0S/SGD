import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
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
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type Remitente = { id_remitente: number; nombre: string; };
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

type Props = { documento: Documento; remitentes: Remitente[]; tipos: string[]; };
type FormData = {
    numero_oficio: string; asunto: string; fecha_oficio: string;
    remitente_id: string; tipo: string; palabra_clave: string; archivo: File | null;
};

function FormField({ label, required, icon: Icon, error, children, className = '' }: any) {
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

export default function Edit({ documento, remitentes, tipos }: Props) {
    const { data, setData, post, transform, processing, progress, errors } = useForm<FormData>({
        numero_oficio: documento.numero_oficio ?? '',
        asunto: documento.asunto ?? '',
        fecha_oficio: documento.fecha_oficio?.slice(0, 10) ?? '',
        remitente_id: String(documento.remitente_id),
        tipo: documento.tipo,
        palabra_clave: documento.palabra_clave,
        archivo: null,
    });

    const pdfPreviewUrl = useMemo(() => {
        if (data.archivo) return URL.createObjectURL(data.archivo);
        return `/storage/${documento.archivo}`;
    }, [data.archivo, documento.archivo]);

    useEffect(() => {
        return () => { if (data.archivo) URL.revokeObjectURL(pdfPreviewUrl); };
    }, [pdfPreviewUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((data) => ({ ...data, _method: 'patch' }));
        post(DocumentoController.update.url(documento.id_documento), {
            forceFormData: true,
            onSuccess: () => toast.success('El oficio fue actualizado correctamente.'),
        });
    };

    const shouldRenderProgress = Boolean(data.archivo) && processing;
    const displayProgress = progress?.percentage ?? 0;

    return (
        <>
            <Head title="Editar documento" />
            <ProcessingOverlay show={processing} message="Actualizando documento..." />

            <div className="mx-auto w-full max-w-screen-xl p-4 md:p-6 lg:p-8 animate-slide-in-up">
                {/* Header Superior idéntico al de Create */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className='flex items-center gap-4 '>
                           <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0 mt-0.5">
                        <Link href={DocumentoController.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                                <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Editar documento</h1>
                                <p className="text-xs text-muted-foreground">Actualiza la información técnica o reemplaza el PDF.</p>
                            </div>
                        </div>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_480px] items-start">

                    {/* COLUMNA IZQUIERDA: VISOR (Estructura idéntica a la que me pasaste) */}
                    <div className="xl:sticky xl:top-8 order-2 xl:order-1">
                        <Card className="overflow-hidden border-t-2 border-t-[var(--primary)] shadow-sm flex flex-col h-[600px]">
                            <CardHeader className="border-b text-sm px-5 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                                        <FileText className="h-4 w-4 text-[var(--primary)]" />
                                        {data.archivo ? 'Nuevo PDF Listo' : 'Archivo Actual'}
                                    </CardTitle>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 relative bg-[var(--card)]">
                                <iframe
                                    title="Vista previa"
                                    src={`${pdfPreviewUrl}#view=FitH&navpanes=0`}
                                    className="h-full w-full border-none"
                                />
                                {/* Botón de carga sobre el iframe solo cuando no hay archivo seleccionado */}
                                {!data.archivo && (
                                    <label className="absolute bottom-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg hover:opacity-90 transition-all">
                                        <Upload className="h-4 w-4" />
                                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => setData('archivo', e.target.files?.[0] || null)} />
                                    </label>
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
                    <div className="space-y-6 order-1 xl:order-2">
                        <Card className="border-t-2 border-t-[var(--primary)] shadow-sm">
                            <CardContent className="px-6 pb-6 pt-0 space-y-6 mt-4">

                                {/* Sección 1: Identificación */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField label="Número de oficio" icon={FileText} error={errors.numero_oficio}>
                                        <Input
                                            disabled={processing}
                                            value={data.numero_oficio}
                                            onChange={(e) => setData('numero_oficio', e.target.value)}
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
                                            className="h-9"
                                        />
                                    </FormField>
                                </div>

                                {/* Separador idéntico */}
                                <div className="flex items-center gap-4 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--secondary-foreground)]">Clasificación</span>
                                    <div className="h-[1px] w-full bg-slate-100" />
                                </div>

                                {/* Sección 2: Clasificación */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField label="Remitente" required icon={User} error={errors.remitente_id}>
                                        <Select
                                            disabled={processing}
                                            value={data.remitente_id}
                                            onValueChange={(v) => setData('remitente_id', v)}
                                        >
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                                            className="h-9"
                                        />
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all active:scale-[0.98]"
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
