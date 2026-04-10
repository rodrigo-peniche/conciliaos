"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tenant, Usuario } from "@/lib/types/conciliaos.types";

interface TenantState {
  tenant: Tenant | null;
  usuario: Usuario | null;
  setTenant: (tenant: Tenant) => void;
  setUsuario: (usuario: Usuario) => void;
  clear: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenant: null,
      usuario: null,
      setTenant: (tenant) => set({ tenant }),
      setUsuario: (usuario) => set({ usuario }),
      clear: () => set({ tenant: null, usuario: null }),
    }),
    {
      name: "conciliaos-tenant",
    }
  )
);
