import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { BarChart3, Database, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { CategoryDonut, RevenueProfitChart } from "@/components/dashboard/Charts";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import { AiAnalyst } from "@/components/dashboard/AiAnalyst";
import {
  REQUIRED_COLUMNS,
  computeMetrics,
  getDemoRows,
  parseSalesCsv,
  rowsToCsv,
  type SaleRow,
} from "@/lib/sales-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Operações e Vendas com IA" },
      {
        name: "description",
        content:
          "Dashboard de vendas e estoque com KPIs, gráficos interativos e diagnóstico estratégico gerado por IA (Gemini).",
      },
      { property: "og:title", content: "Painel de Operações e Vendas com IA" },
      {
        property: "og:description",
        content: "Envie um CSV ou use dados de demonstração e receba alertas de estoque e ações para aumentar a margem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

function Index() {
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [source, setSource] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const metrics = useMemo(() => (rows ? computeMetrics(rows) : null), [rows]);

  function loadDemo() {
    setRows(getDemoRows());
    setSource("Dados de demonstração");
    toast.success("Dados de demonstração carregados.");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = parseSalesCsv(await file.text());
      setRows(parsed);
      setSource(file.name);
      toast.success(`${parsed.length} linhas importadas de ${file.name}.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([rowsToCsv(getDemoRows())], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-vendas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const actions = (
    <>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      <Button variant="surface" size="xl" onClick={() => fileRef.current?.click()}>
        <Upload /> Upload de CSV
      </Button>
      <Button variant="hero" size="xl" onClick={loadDemo}>
        <Database /> Carregar Dados de Demonstração
      </Button>
    </>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <BarChart3 className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight md:text-xl">Operações &amp; Vendas</h1>
              <p className="text-xs text-muted-foreground">Painel analítico com inteligência artificial</p>
            </div>
          </div>
          {metrics && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:px-8 md:py-8">
        {!metrics ? (
          <section className="surface animate-rise mx-auto max-w-3xl p-8 text-center md:p-12">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FileSpreadsheet className="size-7" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold md:text-3xl">
              Transforme seus dados de vendas em <span className="text-gradient-primary">decisões</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Envie um arquivo CSV ou carregue os dados de demonstração para ver KPIs, gráficos, status de estoque e um
              diagnóstico estratégico gerado por IA.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>
            <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Colunas esperadas no CSV
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REQUIRED_COLUMNS.map((c) => (
                  <code key={c} className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">
                    {c}
                  </code>
                ))}
              </div>
              <Button variant="link" size="sm" className="mt-2 h-auto px-0" onClick={downloadTemplate}>
                <Download /> Baixar CSV modelo
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <p>
                Fonte: <span className="font-medium text-foreground">{source}</span>
                {metrics.periodo && (
                  <>
                    {" "}
                    · Período {formatDate(metrics.periodo.inicio)} a {formatDate(metrics.periodo.fim)}
                  </>
                )}
              </p>
              <Button variant="link" size="sm" className="h-auto px-0" onClick={downloadTemplate}>
                <Download /> Baixar CSV modelo
              </Button>
            </div>

            <KpiCards metrics={metrics} />

            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <RevenueProfitChart metrics={metrics} />
              <CategoryDonut metrics={metrics} />
            </div>
          </>
        )}

        <AiAnalyst metrics={metrics} />

        {metrics && <InventoryTable metrics={metrics} />}
      </main>
    </div>
  );
}
