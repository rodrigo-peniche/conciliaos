"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEmpresaStore } from "@/hooks/use-empresa";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmpresaSwitcher() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { empresaActual, empresas, setEmpresaActual } = useEmpresaStore();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center justify-between w-[280px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          {empresaActual ? (
            <span className="truncate">
              {empresaActual.nombre_comercial || empresaActual.razon_social}
            </span>
          ) : (
            <span className="text-muted-foreground">Seleccionar empresa...</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>No se encontraron empresas.</CommandEmpty>
            <CommandGroup heading="Empresas">
              {empresas.map((empresa) => (
                <CommandItem
                  key={empresa.id}
                  value={empresa.razon_social}
                  onSelect={() => {
                    setEmpresaActual(empresa);
                    setOpen(false);
                    router.push(`/empresas/${empresa.id}`);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      empresaActual?.id === empresa.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {empresa.nombre_comercial || empresa.razon_social}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {empresa.rfc}
                    </span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {empresa.regimen_codigo}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/empresas/nueva");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar empresa
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
