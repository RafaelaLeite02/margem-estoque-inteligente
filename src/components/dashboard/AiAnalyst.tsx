import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff, KeyRound, Loader2, PackageX, Rocket, Sparkles, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GEMINI_MODEL, gerarDiagnostico, type Diagnostico } from "@/lib/gemini";
import type { DashboardMetrics } from "@/lib/sales-data";

const ENV_KEY = (import.meta.env["VITE_GEMINI_API_KEY"] as string | undefined)?.trim() || "";

function urgencyVariant(u: string) {
  const v = u.toLowerCase();
  if (v.startsWith("alta")) return "urgencyHigh" as const;
  if (v.startsWith("m")) return "urgencyMedium" as const;
  return "urgencyLow" as const;
}

export function AiAnalyst({ metrics }: { metrics: DashboardMetrics | null }) {
  const [apiKey, setApiKey] = useState("");
  const [useEnv, setUseEnv] = useState(Boolean(ENV_KEY));
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnostico | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [metrics]);

  const effectiveKey = useEnv && ENV_KEY ? ENV_KEY : apiKey.trim();

  async function run() {
    if (!metrics) {
      toast.error("Carregue os dados antes de gerar o diagnóstico.");
      return;
    }
    if (!effectiveKey) {
      toast.error("Informe sua API Key do Gemini.");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const d = await gerarDiagnostico(effectiveKey, metrics, ctrl.signal);
      setResult(d);
      toast.success("Diagnóstico estratégico gerado.");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = (e as Error).message || "Falha ao gerar o diagnóstico.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <section className="surface-ai relative overflow-hidden p-5 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-[image:var(--gradient-ai)] text-ai-foreground">
                <Sparkles className="size-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">
                  Analista de Operações <span className="text-gradient-ai">IA</span>
                </h2>
                <p className="text-xs text-muted-foreground">Powered by Google Gemini · {GEMINI_MODEL}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Envia o resumo da tabela de estoque e rentabilidade e retorna um diagnóstico estratégico pronto para
              ação.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="flex items-center gap-1.5 text-sm">
              <KeyRound className="size-3.5" /> API Key do Gemini
            </Label>
            {ENV_KEY && (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={useEnv}
                  onChange={(e) => setUseEnv(e.target.checked)}
                  className="accent-[var(--ai)]"
                />
                Usar chave configurada (VITE_GEMINI_API_KEY)
              </label>
            )}
            {!(useEnv && ENV_KEY) && (
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={show ? "text" : "password"}
                  placeholder="AIza..."
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Ocultar chave" : "Mostrar chave"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              A chave fica só no seu navegador e é enviada diretamente ao Google.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-ai underline-offset-2 hover:underline"
              >
                Obter chave grátis
              </a>
            </p>
          </div>

          {loading ? (
            <Button variant="surface" size="xl" className="w-full" onClick={stop}>
              <Loader2 className="animate-spin" /> Analisando… (cancelar)
            </Button>
          ) : (
            <Button variant="ai" size="xl" className="w-full" onClick={run} disabled={!metrics}>
              <Zap /> Gerar Diagnóstico Estratégico
            </Button>
          )}
          {!metrics && <p className="text-xs text-muted-foreground">Carregue um CSV ou os dados de demonstração.</p>}
        </div>

        {/* Results */}
        <div className="min-w-0">
          {loading && <LoadingState />}
          {!loading && error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && !result && <IdleState />}
          {!loading && result && <Results d={result} />}
        </div>
      </div>
    </section>
  );
}

function IdleState() {
  const items = [
    { icon: PackageX, title: "3 alertas de reposição", text: "Produtos que precisam de compra urgente" },
    { icon: Rocket, title: "2 produtos para escalar", text: "Onde investir em marketing agora" },
    { icon: Target, title: "3 ações de margem", text: "Movimentos práticos para esta semana" },
  ];
  return (
    <div className="grid h-full gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <div
          key={i.title}
          className="flex flex-col justify-center rounded-xl border border-dashed border-ai/30 bg-background/30 p-5"
        >
          <i.icon className="size-5 text-ai" />
          <p className="mt-3 text-sm font-semibold">{i.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{i.text}</p>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="animate-shimmer h-14 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-shimmer h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="animate-shimmer h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Sparkles; children: ReactNode }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5 text-ai" /> {children}
    </h4>
  );
}

function Results({ d }: { d: Diagnostico }) {
  return (
    <div className="space-y-6">
      {d.resumo && (
        <div className="animate-rise rounded-xl border border-ai/25 bg-ai/8 p-4 text-sm leading-relaxed">
          <span className="font-semibold text-ai">Resumo executivo · </span>
          {d.resumo}
        </div>
      )}

      <div>
        <SectionTitle icon={PackageX}>(a) Alertas urgentes de reposição</SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {d.alertas_reposicao.slice(0, 3).map((a, i) => (
            <article
              key={i}
              className="animate-rise rounded-xl border border-destructive/30 bg-card p-4"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{a.produto}</p>
                <Badge variant={urgencyVariant(a.urgencia)}>{a.urgencia}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.motivo}</p>
              <p className="mt-3 border-t border-border pt-3 text-sm">
                <span className="font-medium text-destructive">Ação: </span>
                {a.acao}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle icon={Rocket}>(b) Produtos para escalar marketing</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {d.produtos_escalar.slice(0, 2).map((p, i) => (
            <article
              key={i}
              className="animate-rise rounded-xl border border-primary/30 bg-card p-4"
              style={{ animationDelay: `${i * 70 + 200}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="tabular grid size-8 place-items-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{p.produto}</p>
                  <p className="text-xs font-medium text-primary">{p.destaque}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.justificativa}</p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle icon={Target}>(c) Ações para aumentar a margem esta semana</SectionTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {d.acoes_margem.slice(0, 3).map((a, i) => (
            <article
              key={i}
              className="animate-rise flex flex-col rounded-xl border border-border bg-card p-4"
              style={{ animationDelay: `${i * 70 + 340}ms` }}
            >
              <p className="tabular text-xs text-ai">0{i + 1}</p>
              <p className="mt-1 font-semibold leading-tight">{a.titulo}</p>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.descricao}</p>
              <p className="mt-3 rounded-md bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
                Impacto: {a.impacto_estimado}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
