"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Database } from "@/lib/types/database.types";

type CuentaBancaria = Database["public"]["Tables"]["cuentas_bancarias"]["Row"];

const BANCOS_MX = [
  "BBVA", "Santander", "Banorte", "HSBC", "Scotiabank",
  "Citibanamex", "Banco Azteca", "Inbursa", "BanRegio", "Afirme",
  "Bansi", "Banbajío", "Monex", "Multiva", "Intercam",
  "Otro",
];

export default function CuentasBancariasPage() {
  const params = useParams();
  const empresaId = params.id as string;

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaBancaria | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [banco, setBanco] = useState("");
  const [alias, setAlias] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [clabe, setClabe] = useState("");
  const [moneda, setMoneda] = useState("MXN");
  const [tipo, setTipo] = useState<string>("cheques");
  const [saldoInicial, setSaldoInicial] = useState("");

  const cargarCuentas = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("cuentas_bancarias")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    if (data) setCuentas(data as unknown as CuentaBancaria[]);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  const resetForm = () => {
    setBanco("");
    setAlias("");
    setNumeroCuenta("");
    setClabe("");
    setMoneda("MXN");
    setTipo("cheques");
    setSaldoInicial("");
    setEditingCuenta(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (cuenta: CuentaBancaria) => {
    setEditingCuenta(cuenta);
    setBanco(cuenta.banco);
    setAlias(cuenta.alias || "");
    setNumeroCuenta(cuenta.numero_cuenta || "");
    setClabe(cuenta.clabe || "");
    setMoneda(cuenta.moneda);
    setTipo(cuenta.tipo || "cheques");
    setSaldoInicial(String(cuenta.saldo_inicial));
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!banco) {
      alert("Selecciona un banco.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const datos = {
      empresa_id: empresaId,
      banco,
      alias: alias || null,
      numero_cuenta: numeroCuenta || null,
      clabe: clabe || null,
      moneda,
      tipo: tipo as "cheques" | "ahorro" | "inversion" | "credito",
      saldo_inicial: parseFloat(saldoInicial) || 0,
      saldo_actual: parseFloat(saldoInicial) || 0,
      saldo_conciliado: 0,
      activa: true,
    };

    if (editingCuenta) {
      const { error } = await supabase
        .from("cuentas_bancarias")
        .update({
          banco: datos.banco,
          alias: datos.alias,
          activa: datos.activa,
        } as never)
        .eq("id", editingCuenta.id);
      if (error) alert("Error: " + error.message);
    } else {
      const { error } = await supabase
        .from("cuentas_bancarias")
        .insert(datos as never);
      if (error) alert("Error: " + error.message);
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    cargarCuentas();
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta bancaria?")) return;
    const supabase = createClient();
    await supabase
      .from("cuentas_bancarias")
      .update({ activa: false } as never)
      .eq("id", id);
    cargarCuentas();
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cuentasActivas = cuentas.filter(c => c.activa);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuentas Bancarias</h1>
          <p className="text-muted-foreground">
            Gestiona las cuentas bancarias e importa estados de cuenta.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar cuenta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCuenta ? "Editar cuenta" : "Nueva cuenta bancaria"}</DialogTitle>
              <DialogDescription>
                {editingCuenta ? "Modifica los datos de la cuenta." : "Agrega una cuenta bancaria para importar estados de cuenta."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANCOS_MX.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alias (opcional)</Label>
                <Input placeholder="Ej: Cuenta principal" value={alias} onChange={(e) => setAlias(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de cuenta</Label>
                  <Input placeholder="1234567890" value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CLABE</Label>
                  <Input placeholder="18 dígitos" maxLength={18} value={clabe} onChange={(e) => setClabe(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={moneda} onValueChange={setMoneda}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheques">Cheques</SelectItem>
                      <SelectItem value="ahorro">Ahorro</SelectItem>
                      <SelectItem value="inversion">Inversión</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo inicial</Label>
                  <Input type="number" placeholder="0.00" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleGuardar} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingCuenta ? "Guardar cambios" : "Crear cuenta"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cuentasActivas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Sin cuentas bancarias</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Agrega una cuenta bancaria para importar estados de cuenta.
          </p>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar cuenta
          </Button>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cuentas activas</CardTitle>
            <CardDescription>{cuentasActivas.length} cuenta(s) registrada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Número / CLABE</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Saldo actual</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuentasActivas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.banco}</TableCell>
                    <TableCell>{c.alias || "-"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.numero_cuenta || c.clabe || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.tipo || "cheques"}</Badge>
                    </TableCell>
                    <TableCell>{c.moneda}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(c.saldo_actual)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEliminar(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
