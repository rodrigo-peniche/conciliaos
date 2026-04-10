"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Empresa } from "@/lib/types/conciliaos.types";

interface EmpresaState {
  empresaActual: Empresa | null;
  empresas: Empresa[];
  setEmpresaActual: (empresa: Empresa) => void;
  setEmpresas: (empresas: Empresa[]) => void;
  clearEmpresa: () => void;
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresaActual: null,
      empresas: [],
      setEmpresaActual: (empresa) => set({ empresaActual: empresa }),
      setEmpresas: (empresas) => set({ empresas }),
      clearEmpresa: () => set({ empresaActual: null }),
    }),
    {
      name: "conciliaos-empresa",
    }
  )
);
