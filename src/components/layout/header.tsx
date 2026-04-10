"use client";

import { EmpresaSwitcher } from "./empresa-switcher";
import { useTenantStore } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut, Settings, User } from "lucide-react";

export function Header() {
  const { usuario, tenant } = useTenantStore();

  const initials = usuario
    ? `${usuario.nombre.charAt(0)}${(usuario.apellidos || "").charAt(0)}`.toUpperCase()
    : "??";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Izquierda: Empresa switcher */}
      <div className="flex items-center gap-4">
        <EmpresaSwitcher />
        {tenant && (
          <Badge variant="secondary" className="hidden md:inline-flex">
            {tenant.plan}
          </Badge>
        )}
      </div>

      {/* Derecha: Notificaciones y usuario */}
      <div className="flex items-center gap-3">
        {/* Notificaciones */}
        <button className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Menú de usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {usuario?.nombre} {usuario?.apellidos}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {usuario?.email}
                </p>
                <Badge variant="outline" className="mt-1 w-fit text-xs">
                  {usuario?.rol?.replace("_", " ")}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
