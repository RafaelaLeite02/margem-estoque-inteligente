import { AlertTriangle, DollarSign, Percent, TrendingUp } from "lucide-react";
import type { DashboardMetrics } from "@/lib/sales-data";
import { brl, pct } from "@/lib/sales-data";
import { cn } from "@/lib/utils";

export function KpiCards({ metrics }: { metrics: DashboardMetrics }) {
  const items = [
    {
      label: "Faturamento Total",
      value: brl(metrics.faturamentoTotal),
      hint: `${metrics.produtos.length} produtos analisados`,
      icon: DollarSign,
      tone: "primary" as const,
    },
    {
      label: "Lucro Líquido Total",
      value: brl(metrics.lucroTotal),
      hint: "Faturamento − custo das vendas",
      icon: TrendingUp,
      tone: "success" as const,
    },
    {
      label: "Margem Média",
      value: pct(metrics.margemMedia),
      hint: "Lucro ÷ faturamento",
      icon: Percent,
      tone: "ai" as const,
    },
    {
      label: "Estoque Crítico",
      value: String(metrics.itensCriticos),
      hint: metrics.itensCriticos === 1 ? "produto abaixo do mínimo" : "produtos no ou abaixo do mínimo",
      icon: AlertTriangle,
      tone: metrics.itensCriticos > 0 ? ("destructive" as const) : ("success" as const),
    },
  ];

  const toneClasses = {
    primary: "bg-primary/12 text-primary",
    success: "bg-success/12 text-success",
    ai: "bg-ai/12 text-ai",
    destructive: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className="surface animate-rise relative overflow-hidden p-5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{it.label}</p>
            <span className={cn("grid size-9 place-items-center rounded-lg", toneClasses[it.tone])}>
              <it.icon className="size-4" />
            </span>
          </div>
          <p
            className={cn(
              "tabular mt-3 text-3xl font-semibold",
              it.tone === "destructive" ? "text-destructive" : "text-foreground",
            )}
          >
            {it.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{it.hint}</p>
        </div>
      ))}
    </div>
  );
}
