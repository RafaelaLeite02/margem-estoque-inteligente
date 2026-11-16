import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardMetrics } from "@/lib/sales-data";
import { brl, pct } from "@/lib/sales-data";
import { cn } from "@/lib/utils";

type Filter = "todos" | "criticos";

export function InventoryTable({ metrics }: { metrics: DashboardMetrics }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const rows = useMemo(
    () =>
      [...metrics.produtos]
        .filter((p) => (filter === "criticos" ? p.critico : true))
        .sort((a, b) => Number(b.critico) - Number(a.critico) || b.lucro - a.lucro),
    [metrics.produtos, filter],
  );

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Estoque e Rentabilidade</h3>
          <p className="text-sm text-muted-foreground">
            Crítico quando o estoque atual é menor ou igual ao estoque mínimo
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {(
            [
              ["todos", `Todos (${metrics.produtos.length})`],
              ["criticos", `Críticos (${metrics.itensCriticos})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "secondary" : "ghost"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Vendidos</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="min-w-[170px]">Estoque (atual / mín.)</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const ratio = p.estoque_minimo > 0 ? Math.min(p.estoque_atual / (p.estoque_minimo * 3), 1) : 1;
              return (
                <TableRow key={p.produto} className={cn(p.critico && "bg-destructive/5")}>
                  <TableCell className="pl-5 font-medium">{p.produto}</TableCell>
                  <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                  <TableCell className="tabular text-right">{p.quantidade.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="tabular text-right">{brl(p.faturamento)}</TableCell>
                  <TableCell className={cn("tabular text-right", p.lucro < 0 ? "text-destructive" : "text-success")}>
                    {brl(p.lucro)}
                  </TableCell>
                  <TableCell className="tabular text-right">{pct(p.margem)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", p.critico ? "bg-destructive" : "bg-success")}
                          style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                        />
                      </div>
                      <span className="tabular text-sm">
                        {p.estoque_atual} <span className="text-muted-foreground">/ {p.estoque_minimo}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-5">
                    {p.critico ? (
                      <Badge variant="critical">
                        <span className="size-1.5 rounded-full bg-destructive" /> Crítico
                      </Badge>
                    ) : (
                      <Badge variant="normal">
                        <span className="size-1.5 rounded-full bg-success" /> Normal
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
