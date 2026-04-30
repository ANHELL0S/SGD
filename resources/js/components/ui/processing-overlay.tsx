import { Spinner } from '@/components/ui/spinner';

type ProcessingOverlayProps = {
    show: boolean;
    message: string;
};

export function ProcessingOverlay({ show, message }: ProcessingOverlayProps) {
    if (!show) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 backdrop-blur-[1px]" aria-live="polite" aria-busy="true">
            <div className="flex min-w-[18rem] items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-xl">
                <Spinner className="size-5 text-blue-600" />
                <p className="text-sm font-medium text-slate-800">{message}</p>
            </div>
        </div>
    );
}
