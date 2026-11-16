import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardMetrics } from "@/lib/sales-data";
import { brl, brlCompact, pct } from "@/lib/sales-data";

const barConfig = {
  faturamento: { label: "Faturamento", color: "var(--chart-1)" },
  lucro: { label: "Lucro", color: "var(--chart-2)" },
} satisfies ChartConfig;

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function shortName(name: string) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

export function RevenueProfitChart({ metrics }: { metrics: DashboardMetrics }) {
  const data = metrics.produtos.map((p) => ({
    produto: p.produto,
    faturamento: Math.round(p.faturamento),
    lucro: Math.round(p.lucro),
  }));

  return (
    <div className="surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Faturamento vs. Lucro por Produto</h3>
          <p className="text-sm text-muted-foreground">Ordenado pelo maior faturamento</p>
        </div>
      </div>
      <ChartContainer config={barConfig} className="aspect-auto h-[340px] w-full">
        <BarChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="produto"
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={70}
            tickFormatter={shortName}
          />
          <YAxis tickLine={false} axisLine={false} width={70} tickFormatter={(v) => brlCompact(Number(v))} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{barConfig[name as keyof typeof barConfig]?.label}</span>
                    <span className="tabular font-medium text-foreground">{brl(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="lucro" fill="var(--color-lucro)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function CategoryDonut({ metrics }: { metrics: DashboardMetrics }) {
  const config: ChartConfig = Object.fromEntries(
    metrics.categorias.map((c, i) => [c.categoria, { label: c.categoria, color: PIE_COLORS[i % PIE_COLORS.length] }]),
  );
  const top = metrics.categorias[0];

  return (
    <div className="surface flex flex-col p-5">
      <div className="mb-2">
        <h3 className="text-base font-semibold">Participação por Categoria</h3>
        <p className="text-sm text-muted-foreground">Share do faturamento total</p>
      </div>
      <div className="relative">
        <ChartContainer config={config} className="mx-auto aspect-square h-[230px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="tabular font-medium text-foreground">{brl(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={metrics.categorias}
              dataKey="faturamento"
              nameKey="categoria"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={3}
              strokeWidth={0}
            >
              {metrics.categorias.map((c, i) => (
                <Cell key={c.categoria} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {top && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="tabular text-2xl font-semibold">{pct(top.participacao)}</p>
              <p className="text-xs text-muted-foreground">{top.categoria}</p>
            </div>
          </div>
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {metrics.categorias.map((c, i) => (
          <li key={c.categoria} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {c.categoria}
            </span>
            <span className="tabular text-muted-foreground">
              {brlCompact(c.faturamento)} · <span className="text-foreground">{pct(c.participacao)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
