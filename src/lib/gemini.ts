import type { DashboardMetrics } from "./sales-data";

export const GEMINI_MODEL = "gemini-2.5-flash";

export type Diagnostico = {
  resumo: string;
  alertas_reposicao: { produto: string; urgencia: string; motivo: string; acao: string }[];
  produtos_escalar: { produto: string; destaque: string; justificativa: string }[];
  acoes_margem: { titulo: string; descricao: string; impacto_estimado: string }[];
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    resumo: { type: "STRING" },
    alertas_reposicao: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          produto: { type: "STRING" },
          urgencia: { type: "STRING", enum: ["Alta", "Média", "Baixa"] },
          motivo: { type: "STRING" },
          acao: { type: "STRING" },
        },
        required: ["produto", "urgencia", "motivo", "acao"],
      },
    },
    produtos_escalar: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          produto: { type: "STRING" },
          destaque: { type: "STRING" },
          justificativa: { type: "STRING" },
        },
        required: ["produto", "destaque", "justificativa"],
      },
    },
    acoes_margem: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titulo: { type: "STRING" },
          descricao: { type: "STRING" },
          impacto_estimado: { type: "STRING" },
        },
        required: ["titulo", "descricao", "impacto_estimado"],
      },
    },
  },
  required: ["resumo", "alertas_reposicao", "produtos_escalar", "acoes_margem"],
};

function buildPrompt(m: DashboardMetrics) {
  const tabela = m.produtos
    .map(
      (p) =>
        `- ${p.produto} | ${p.categoria} | vendidos: ${p.quantidade} | faturamento: R$ ${p.faturamento.toFixed(2)} | lucro: R$ ${p.lucro.toFixed(2)} | margem: ${p.margem.toFixed(1)}% | estoque atual: ${p.estoque_atual} | estoque mínimo: ${p.estoque_minimo} | status: ${p.critico ? "CRÍTICO" : "Normal"}`,
    )
    .join("\n");

  return `Você é um analista sênior de operações e vendas de varejo. Analise os dados abaixo e responda em português do Brasil, de forma objetiva e prática.

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
Inclua também um resumo executivo de no máximo 2 frases.`;
}

export async function gerarDiagnostico(apiKey: string, metrics: DashboardMetrics, signal?: AbortSignal) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      signal: signal ?? null,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(metrics) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.4,
        },
      }),
    },
  );

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg: string = json?.error?.message ?? `Erro ${res.status}`;
    if (res.status === 400 && /api key/i.test(msg)) throw new Error("API Key inválida. Verifique a chave do Gemini.");
    if (res.status === 403) throw new Error("Acesso negado pela API do Gemini. Verifique as permissões da sua chave.");
    if (res.status === 429) throw new Error("Limite de uso do Gemini atingido. Aguarde alguns instantes e tente novamente.");
    throw new Error(msg);
  }

  const text: string | undefined = json?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new Error("O modelo não retornou conteúdo. Tente novamente mais tarde.");

  try {
    return JSON.parse(text) as Diagnostico;
  } catch {
    throw new Error("Não foi possível interpretar a resposta do modelo.");
  }
}
