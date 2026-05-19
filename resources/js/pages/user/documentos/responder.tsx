import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    FileText,
    Lock,
    MessageSquare,
    Reply,
    Send,
    Tag,
    Upload,
    User,
} from 'lucide-react';
import DocumentoController from '@/actions/App/Http/Controllers/User/DocumentoController';
import { storeRespuesta } from '@/actions/App/Http/Controllers/User/MovimientoController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProcessingOverlay } from '@/components/ui/processing-overlay';
import { Progress } from '@/components/ui/progress';
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
        remitente_id: number | null;
    } | null;
};

type Props = {
    movimiento: MovimientoDetalle;
    remitentes: Remitente[];
    tipos: string[];
};

type FormData = {
    movimiento_id: number;
    solo_comentario: boolean;
    numero_oficio: string;
    fecha_oficio: string;
    remitente_id: string;
    tipo: string;
    palabra_clave: string;
    archivo: File | null;
    comentario_envio: string;
};

const todayDate = (): string => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    return `${d.getFullYear()}-${mm}-${dd}`;
};

const formatDateDisplay = (iso: string): string => {
    const [y, m, d] = iso.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));

    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

function SectionPanel({
    title,
    icon: Icon,
    children,
    badge,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    badge?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{title}</span>
                </div>
                {badge}
            </div>
            <div className="px-4 py-4">{children}</div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, children }: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                <div className="text-sm text-foreground">{children}</div>
            </div>
        </div>
    );
}

export default function Responder({ movimiento, remitentes }: Props) {
    const remitenteNombre =
        remitentes.find((r) => r.id_remitente === movimiento.documento?.remitente_id)?.nombre ?? '-';

    const { data, setData, post, processing, progress, errors } = useForm<FormData>({
        movimiento_id: movimiento.id_movimiento,
        solo_comentario: false,
        numero_oficio: '',
        fecha_oficio: todayDate(),
        remitente_id: String(movimiento.documento?.remitente_id ?? ''),
        tipo: 'interno',
        palabra_clave: movimiento.documento?.palabra_clave ?? '',
        archivo: null,
        comentario_envio: movimiento.comentario ?? '',
    });

    const isServerProcessing = processing && Boolean(progress) && (progress?.percentage ?? 0) >= 100;

    const handleFile = (file: File | null): void => {
        if (!file) {
return;
}

        setData('archivo', file);
    };

    const onSubmit = (event: { preventDefault(): void }): void => {
        event.preventDefault();
        post(storeRespuesta.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['pendingMovimientosCount'] });
            },
        });
    };

    const oficioPadreLabel = movimiento.documento?.numero_oficio
        ?? `#${movimiento.documento?.id_documento ?? '-'}`;

    return (
        <>
            <Head title="Responder oficio" />
            <ProcessingOverlay
                show={processing}
                message={
                    data.solo_comentario
                        ? 'Enviando respuesta...'
                        : isServerProcessing
                          ? 'Enviando documento...'
                          : 'Subiendo archivo...'
                }
            />

            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
                        <Link href={DocumentoController.index.url()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold leading-tight">Responder oficio</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Respondiendo a <span className="font-medium text-foreground">{oficioPadreLabel}</span>
                        </p>
                    </div>
                </div>

                {/* Flujo del movimiento */}
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                    <Reply className="h-4 w-4 text-[var(--primary)]/80 shrink-0" />
                    <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                        <span className="text-[var(--secondary-foreground)]/80 ">{movimiento.a_area?.nombre ?? '-'}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--primary)]/80 shrink-0" />
                        <span className="text-[var(--secondary-foreground)]/80 ">{movimiento.de_area?.nombre ?? '-'}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[11px] border-primary/30 bg-primary/10 text-primary">
                            Oficio base: {oficioPadreLabel}
                        </Badge>
                        {!data.solo_comentario && (
                            <Badge variant="secondary" className="text-[11px]">
                                Se enlazará como respuesta
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Toggle de modo */}
                <div className="flex items-center gap-1 p-1 rounded-xl border bg-muted/30 w-fit">
                    <button
                        type="button"
                        onClick={() => setData('solo_comentario', false)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            !data.solo_comentario
                                ? 'bg-card shadow-sm text-foreground border border-border/60'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Con oficio adjunto
                    </button>
                    <button
                        type="button"
                        onClick={() => setData('solo_comentario', true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            data.solo_comentario
                                ? 'bg-card shadow-sm text-foreground border border-border/60'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Solo comentario
                    </button>
                </div>

                {/* Grid principal */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 items-start">

                    {/* Columna izquierda — formulario */}
                    <form className="space-y-4" onSubmit={onSubmit}>

                        {data.solo_comentario ? (
                            /* Modo: solo comentario */
                            <SectionPanel title="Comentario de respuesta" icon={MessageSquare}>
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        Escribe la respuesta. No se creará un nuevo oficio; el comentario quedará registrado en este movimiento.
                                    </p>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="comentario_envio" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Respuesta <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            id="comentario_envio"
                                            value={data.comentario_envio}
                                            onChange={(e) => setData('comentario_envio', e.target.value)}
                                            placeholder="Ej: El préstamo de sillas se realizó exitosamente..."
                                            rows={6}
                                            className="resize-none"
                                            required
                                        />
                                        <InputError message={errors.comentario_envio} />
                                    </div>
                                </div>
                            </SectionPanel>
                        ) : (
                            /* Modo: con documento */
                            <>
                                <SectionPanel title="Datos del oficio" icon={FileText}>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="numero_oficio" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                Número de oficio <span className="normal-case text-muted-foreground/60">(opcional)</span>
                                            </Label>
                                            <Input
                                                id="numero_oficio"
                                                value={data.numero_oficio}
                                                onChange={(e) => setData('numero_oficio', e.target.value)}
                                                placeholder="Ej: OF-2026-042"
                                                className="h-9"
                                            />
                                            <InputError message={errors.numero_oficio} />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="comentario_envio" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                Comentario / motivo <span className="text-red-500">*</span>
                                            </Label>
                                            <Textarea
                                                id="comentario_envio"
                                                value={data.comentario_envio}
                                                onChange={(e) => setData('comentario_envio', e.target.value)}
                                                placeholder="Describe el motivo de esta respuesta..."
                                                rows={4}
                                                className="resize-none"
                                                required
                                            />
                                            <InputError message={errors.comentario_envio} />
                                        </div>
                                    </div>
                                </SectionPanel>

                                <SectionPanel title="Documento adjunto" icon={Upload}>
                                    <div className="space-y-3">
                                        <div
                                            className="border-2 border-dashed border-border rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                                            onClick={() => document.getElementById('archivo-input')?.click()}
                                        >
                                            <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                {data.archivo
                                                    ? <span className="font-medium text-foreground">{data.archivo.name}</span>
                                                    : <>Haz clic para seleccionar o arrastra el archivo</>
                                                }
                                            </p>
                                            <p className="text-xs text-muted-foreground/60 mt-1">Solo PDF · Máximo 4 MB</p>
                                        </div>
                                        <input
                                            id="archivo-input"
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            className="hidden"
                                            onChange={(e) => handleFile(e.target.files?.[0] || null)}
                                        />
                                        <InputError message={errors.archivo} />

                                        {progress && (
                                            <div className="space-y-1.5">
                                                <Progress value={progress.percentage} className="h-1.5" />
                                                <p className="text-xs text-muted-foreground text-right">{progress.percentage}%</p>
                                            </div>
                                        )}
                                    </div>
                                </SectionPanel>
                            </>
                        )}

                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-blue-600 hover:bg-[var(--primary)]/90 text-white h-10"
                        >
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Enviando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Send className="h-3.5 w-3.5" />
                                    {data.solo_comentario ? 'Registrar respuesta' : 'Crear y enviar respuesta'}
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Columna derecha — campos automáticos + contexto */}
                    <div className="space-y-4">

                        {/* Campos automáticos (solo en modo documento) */}
                        {!data.solo_comentario && (
                            <SectionPanel
                                title="Campos automáticos"
                                icon={Lock}
                                badge={
                                    <Badge variant="outline" className="text-[10px] border-[--border] bg-[var(--card)] text-[var(--text)]">
                                        No editables
                                    </Badge>
                                }
                            >
                                <div className="-mx-0">
                                    <InfoRow icon={Calendar} label="Fecha del oficio">
                                        {formatDateDisplay(data.fecha_oficio)}
                                    </InfoRow>
                                    <InfoRow icon={User} label="Remitente">
                                        {remitenteNombre}
                                    </InfoRow>
                                    <InfoRow icon={FileText} label="Tipo">
                                        <Badge variant="outline" className="text-xs border-[var(--border)] bg-[var(--card)] text-[var(--text)]">
                                            Interno
                                        </Badge>
                                    </InfoRow>
                                    <InfoRow icon={Tag} label="Palabra clave">
                                        {data.palabra_clave || '-'}
                                    </InfoRow>
                                </div>
                            </SectionPanel>
                        )}

                        {/* Contexto del movimiento original */}
                        {movimiento.comentario && (
                            <SectionPanel title="Motivo original" icon={MessageSquare}>
                                <p className="text-sm text-muted-foreground italic leading-relaxed">
                                    "{movimiento.comentario}"
                                </p>
                            </SectionPanel>
                        )}

                    </div>
                </div>
            </div>
        </>
    );
}

Responder.layout = {
    breadcrumbs: [
        { title: 'Mis documentos', href: DocumentoController.index.url() },
        { title: 'Responder oficio', href: '#' },
    ],
};
