import type { DashboardMetrics } from "./sales-data";

export const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type Diagnostico = {
  resumo: string;
  alertas_reposicao: { produto: string; urgencia: string; motivo: string; acao: string }[];
  produtos_escalar: { produto: string; destaque: string; justificativa: string }[];
  acoes_margem: { titulo: string; descricao: string; impacto_estimado: string }[];
};

const FORMATO_JSON = `{
  "resumo": "string (no máximo 2 frases)",
  "alertas_reposicao": [{ "produto": "string", "urgencia": "Alta" | "Média" | "Baixa", "motivo": "string", "acao": "string" }],
  "produtos_escalar": [{ "produto": "string", "destaque": "string", "justificativa": "string" }],
  "acoes_margem": [{ "titulo": "string", "descricao": "string", "impacto_estimado": "string" }]
}`;

function buildPrompt(m: DashboardMetrics) {
  const tabela = m.produtos
    .map(
      (p) =>
        `- ${p.produto} | ${p.categoria} | vendidos: ${p.quantidade} | faturamento: R$ ${p.faturamento.toFixed(2)} | lucro: R$ ${p.lucro.toFixed(2)} | margem: ${p.margem.toFixed(1)}% | estoque atual: ${p.estoque_atual} | estoque mínimo: ${p.estoque_minimo} | status: ${p.critico ? "CRÍTICO" : "Normal"}`,
    )
    .join("\n");

  return `Analise os dados abaixo e responda em português do Brasil, de forma objetiva e prática.

Período: ${m.periodo ? `${m.periodo.inicio} a ${m.periodo.fim}` : "não informado"}
Faturamento total: R$ ${m.faturamentoTotal.toFixed(2)}
Lucro líquido total: R$ ${m.lucroTotal.toFixed(2)}
Margem média: ${m.margemMedia.toFixed(1)}%
Produtos em estoque crítico: ${m.itensCriticos}

Produto | Categoria | Vendidos | Faturamento | Lucro | Margem | Estoque atual | Estoque mínimo | Status
${tabela}

Entregue:
(a) exatamente 3 alertas urgentes de reposição de estoque (priorize produtos críticos e com alto giro), com o motivo e a ação recomendada (inclua quantidade sugerida de reposição quando possível);
(b) exatamente 2 produtos mais lucrativos para escalar investimento em marketing, com um destaque numérico curto e a justificativa;
(c) exatamente 3 ações práticas para aumentar a margem operacional ainda esta semana, cada uma com impacto estimado.
Inclua também um resumo executivo de no máximo 2 frases.

Responda SOMENTE com um objeto JSON válido neste formato exato:
${FORMATO_JSON}`;
}

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export async function gerarDiagnostico(apiKey: string, metrics: DashboardMetrics, signal?: AbortSignal) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    signal: signal ?? null,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é um analista sênior de operações e vendas de varejo. Sempre responda apenas com JSON válido, em português do Brasil.",
        },
        { role: "user", content: buildPrompt(metrics) },
      ],
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg: string = json?.error?.message ?? `Erro ${res.status}`;
    if (res.status === 401 || /invalid api key/i.test(msg))
      throw new Error("API Key inválida. Verifique a chave da Groq.");
    if (res.status === 403) throw new Error("Acesso negado pela API da Groq. Verifique as permissões da sua chave.");
    if (res.status === 404) throw new Error(`O modelo ${GROQ_MODEL} não está disponível para a sua chave.`);
    if (res.status === 429) throw new Error("Limite de uso da Groq atingido. Aguarde alguns instantes e tente novamente.");
    throw new Error(msg);
  }

  const text: string | undefined = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("O modelo não retornou conteúdo. Tente novamente mais tarde.");

  let parsed: Partial<Diagnostico>;
  try {
    parsed = JSON.parse(text) as Partial<Diagnostico>;
  } catch {
    throw new Error("Não foi possível interpretar a resposta do modelo.");
  }
  return {
    resumo: typeof parsed.resumo === "string" ? parsed.resumo : "",
    alertas_reposicao: asArray<Diagnostico["alertas_reposicao"][number]>(parsed.alertas_reposicao),
    produtos_escalar: asArray<Diagnostico["produtos_escalar"][number]>(parsed.produtos_escalar),
    acoes_margem: asArray<Diagnostico["acoes_margem"][number]>(parsed.acoes_margem),
  } satisfies Diagnostico;
}
