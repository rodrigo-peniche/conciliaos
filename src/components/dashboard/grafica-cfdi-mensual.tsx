"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface DatoMensual {
  mes: string;
  deducible: number;
  noDeducible: number;
}

interface Props {
  datos: DatoMensual[];
}

export function GraficaCfdiMensual({ datos }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Gastos deducibles vs no deducibles (últimos 6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                v >= 1000000
                  ? `$${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `$${(v / 1000).toFixed(0)}K`
                  : `$${v}`
              }
            />
            <Tooltip
              formatter={(value) =>
                `$${Number(value).toLocaleString("es-MX")}`
              }
            />
            <Legend />
            <Bar
              dataKey="deducible"
              name="Deducible"
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="noDeducible"
              name="No deducible"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
