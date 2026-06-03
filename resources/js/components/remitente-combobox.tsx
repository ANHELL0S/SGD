import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

type Remitente = { id_remitente: number; nombre: string };

interface Props {
    remitentes: Remitente[];
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
}

// Elimina tildes y convierte a minúsculas para comparaciones tolerantes
const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const comboFilter = (itemValue: string, search: string): number => {
    const v = normalize(itemValue);
    const q = normalize(search.trim());
    if (!q) return 1;
    if (v.includes(q)) return 1;
    // Todas las palabras del query deben aparecer en el valor
    const qWords = q.split(/\s+/);
    if (qWords.every((w) => v.includes(w))) return 0.9;
    // Al menos la primera palabra del query coincide con el inicio de alguna palabra del valor
    const vWords = v.split(/\s+/);
    if (vWords.some((w) => w.startsWith(qWords[0]))) return 0.7;
    return 0;
};

export function RemitenteCombobox({ remitentes, value, onValueChange, disabled }: Props) {
    const [open, setOpen] = useState(false);

    const selected = remitentes.find((r) => String(r.id_remitente) === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="h-8 w-full justify-between text-xs font-normal px-3"
                >
                    <span
                        className={cn('truncate', !selected && 'text-muted-foreground')}
                        title={selected ? selected.nombre : undefined}
                    >
                        {selected ? selected.nombre : 'Seleccionar...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
                align="start"
            >
                <Command filter={comboFilter}>
                    <CommandInput placeholder="Buscar remitente..." className="h-8 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-4 text-xs text-muted-foreground">
                            Sin resultados.
                        </CommandEmpty>
                        <CommandGroup>
                            {remitentes.map((r) => (
                                <CommandItem
                                    key={r.id_remitente}
                                    value={r.nombre}
                                    onSelect={() => {
                                        onValueChange(String(r.id_remitente));
                                        setOpen(false);
                                    }}
                                    className="text-xs"
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-3.5 w-3.5 shrink-0',
                                            value === String(r.id_remitente)
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate" title={r.nombre}>{r.nombre}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
