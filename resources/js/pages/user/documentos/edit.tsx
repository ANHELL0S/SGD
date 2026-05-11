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
import { Separator } from '@/components/ui/separator';
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

    // El botón solo se activa si TODOS los campos requeridos están llenos (excepto número de oficio)
    const isFormValid =
        Boolean(data.asunto?.trim()) &&
        Boolean(data.fecha_oficio?.trim()) &&
        Boolean(data.remitente_id) &&
        Boolean(data.tipo) &&
        Boolean(data.palabra_clave?.trim());

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

            <div className="mx-auto w-full max-w-screen-xl p-2 md:p-4 lg:p-6 animate-slide-in-up">
                {/* Header Superior idéntico al de Create */}
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

                <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[1fr_400px] items-start">

                    {/* COLUMNA IZQUIERDA: VISOR (Estructura idéntica a la que me pasaste) */}
                    <div className="xl:sticky xl:top-8 order-2 xl:order-1">
                        <Card className="overflow-hidden flex flex-col h-[500px]">
                            <CardContent className="p-0 pt-0 flex-1 relative bg-[var(--card)]">
                                <iframe
                                    title="Vista previa"
                                    src={`${pdfPreviewUrl}#view=FitH&navpanes=0`}
                                    className="h-full w-full border-none min-h-[320px]"
                                />
                                {!data.archivo && (
                                    <label className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg hover:opacity-90 transition-all">
                                        <Upload className="h-4 w-4" />
                                        <input type="file" accept=".pdf" className="hidden" onChange={(e) => setData('archivo', e.target.files?.[0] || null)} />
                                    </label>
                                )}
                            </CardContent>
                            {(shouldRenderProgress || errors.archivo) && (
                                <div className="px-3 py-2 border-t bg-white">
                                    {errors.archivo && (
                                        <p className="text-[10px] font-medium text-red-600 mb-1 flex items-center gap-1">
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
                    <div className="space-y-4 order-1 xl:order-2">
                        {/* Info principal */}
                        <Card className="border-t-2 border-t-[var(--primary)] shadow-sm">
                            <CardContent className="px-4 pb-4 pt-2 space-y-3 mt-2">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <FormField label="Número de oficio" icon={FileText} error={errors.numero_oficio}>
                                        <Input
                                            disabled={processing}
                                            value={data.numero_oficio}
                                            onChange={(e) => setData('numero_oficio', e.target.value)}
                                            className="h-8 text-xs"
                                            placeholder="OF-2026-001"
                                        />
                                    </FormField>
                                    <FormField label="Fecha de oficio" required icon={CalendarDays} error={errors.fecha_oficio}>
                                        <Input
                                            type="date"
                                            disabled={processing}
                                            value={data.fecha_oficio}
                                            onChange={(e) => setData('fecha_oficio', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </FormField>
                                    <FormField label="Asunto" required icon={FileText} error={errors.asunto} className="sm:col-span-2">
                                        <Input
                                            disabled={processing}
                                            value={data.asunto}
                                            onChange={(e) => setData('asunto', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>

                        <Separator  className=' ' />

                        {/* Clasificación separada */}
                        <Card className="border-t-2 border-t-[var(--primary)] shadow-sm">
                            <CardContent className="px-4 pt-0 pb-2">
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-row gap-2">
                                        {/* Remitente */}
                                        <div className="flex-1 min-w-0">
                                            <FormField label="Remitente" required icon={User} error={errors.remitente_id}>
                                                <Select
                                                    disabled={processing}
                                                    value={data.remitente_id}
                                                    onValueChange={(v) => setData('remitente_id', v)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {remitentes.map((r) => (
                                                            <SelectItem key={r.id_remitente} value={String(r.id_remitente)}>
                                                                <span className="truncate block max-w-[120px]" title={r.nombre}>{r.nombre}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                        </div>
                                        {/* Separador visual */}
                                        <div className="w-px bg-slate-200 mx-1" />
                                        {/* Tipo */}
                                        <div className="flex-1 min-w-0">
                                            <FormField label="Tipo" required icon={Layers} error={errors.tipo}>
                                                <Select
                                                    disabled={processing}
                                                    value={data.tipo}
                                                    onValueChange={(v) => setData('tipo', v)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tipos.map((t) => (
                                                            <SelectItem key={t} value={t}>
                                                                <span className="truncate block max-w-[80px]" title={t}>{t}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormField>
                                        </div>
                                    </div>
                                    <FormField label="Palabra clave" required icon={Tag} error={errors.palabra_clave} className="w-full">
                                        <Input
                                            disabled={processing}
                                            value={data.palabra_clave}
                                            onChange={(e) => setData('palabra_clave', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing || !isFormValid}
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
