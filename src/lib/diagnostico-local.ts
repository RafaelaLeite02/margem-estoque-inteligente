import type { Diagnostico } from "./groq";
import { brl, pct, type DashboardMetrics, type ProductSummary } from "./sales-data";

/** Price increase simulated on the lowest-margin product. */
export const REAJUSTE_PRECO = 0.05;
/** Supplier cost reduction simulated on the lowest-margin category. */
export const REDUCAO_CUSTO = 0.03;

const un = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} un.`;
const coberturaRatio = (p: ProductSummary) =>
  p.estoque_minimo > 0 ? p.estoque_atual / p.estoque_minimo : Number.POSITIVE_INFINITY;

/** Units needed to bring stock back to twice the minimum. */
export function sugestaoReposicao(p: Pick<ProductSummary, "estoque_atual" | "estoque_minimo">) {
  return Math.max(0, Math.ceil(p.estoque_minimo * 2 - p.estoque_atual));
}

export function urgenciaReposicao(p: Pick<ProductSummary, "estoque_atual" | "estoque_minimo">) {
  const r = p.estoque_minimo > 0 ? p.estoque_atual / p.estoque_minimo : Number.POSITIVE_INFINITY;
  if (r < 0.75) return "Alta";
  if (r <= 1) return "Média";
  return "Baixa";
}

function alertas(m: DashboardMetrics): Diagnostico["alertas_reposicao"] {
  const ordenados = [...m.produtos].sort((a, b) => {
    if (a.critico !== b.critico) return a.critico ? -1 : 1;
    const r = coberturaRatio(a) - coberturaRatio(b);
    if (Math.abs(r) > 1e-9) return r;
    return b.quantidade - a.quantidade;
  });
  return ordenados.slice(0, 3).map((p) => {
    const repor = sugestaoReposicao(p);
    const cobertura = p.estoque_minimo > 0 ? pct((p.estoque_atual / p.estoque_minimo) * 100) : "—";
    return {
      produto: p.produto,
      urgencia: urgenciaReposicao(p),
      motivo: `${p.critico ? "Estoque crítico" : "Estoque próximo do mínimo"}: ${un(p.estoque_atual)} para mínimo de ${un(p.estoque_minimo)} (${cobertura} do mínimo), com ${un(p.quantidade)} vendidas no período.`,
      acao:
        repor > 0
          ? `Comprar ${un(repor)} para recompor o estoque ao dobro do mínimo (${un(p.estoque_minimo * 2)}), investindo cerca de ${brl(repor * custoUnitario(p))}.`
          : "Monitorar o giro semanalmente; estoque ainda acima do dobro do mínimo.",
    };
  });
}

function custoUnitario(p: ProductSummary) {
  return p.quantidade > 0 ? p.custo / p.quantidade : 0;
}

function escalar(m: DashboardMetrics): Diagnostico["produtos_escalar"] {
  return [...m.produtos]
    .filter((p) => p.lucro > 0)
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 2)
    .map((p) => {
      const share = m.lucroTotal > 0 ? (p.lucro / m.lucroTotal) * 100 : 0;
      return {
        produto: p.produto,
        destaque: `Lucro de ${brl(p.lucro)} · margem ${pct(p.margem)}`,
        justificativa: `Responde por ${pct(share)} do lucro total com ${un(p.quantidade)} vendidas.${
          p.critico
            ? " Atenção: o estoque está crítico — reponha antes de aumentar o investimento em mídia."
            : ` Estoque de ${un(p.estoque_atual)} sustenta o aumento de demanda.`
        }`,
      };
    });
}

function acoes(m: DashboardMetrics): Diagnostico["acoes_margem"] {
  const out: Diagnostico["acoes_margem"] = [];
  const vendidos = m.produtos.filter((p) => p.faturamento > 0);

  // 1. Price adjustment on the lowest-margin product.
  const menorMargem = [...vendidos].sort((a, b) => a.margem - b.margem)[0];
  if (menorMargem) {
    const ganho = menorMargem.faturamento * REAJUSTE_PRECO;
    out.push({
      titulo: `Reajustar o preço de ${menorMargem.produto}`,
      descricao: `É o produto de menor margem (${pct(menorMargem.margem)} contra ${pct(m.margemMedia)} da média). Um reajuste de ${pct(REAJUSTE_PRECO * 100)} mantendo o volume eleva o lucro sem novos custos.`,
      impacto_estimado: `+${brl(ganho)} no lucro do período`,
    });
  }

  // 2. Supplier renegotiation on the lowest-margin category.
  const catCusto = new Map<string, number>();
  for (const p of m.produtos) catCusto.set(p.categoria, (catCusto.get(p.categoria) ?? 0) + p.custo);
  const cat = [...m.categorias]
    .filter((c) => c.faturamento > 0)
    .sort((a, b) => a.lucro / a.faturamento - b.lucro / b.faturamento)[0];
  if (cat) {
    const custo = catCusto.get(cat.categoria) ?? 0;
    out.push({
      titulo: `Renegociar custos da categoria ${cat.categoria}`,
      descricao: `${cat.categoria} tem a menor margem entre as categorias (${pct((cat.lucro / cat.faturamento) * 100)}). Negocie ${pct(REDUCAO_CUSTO * 100)} de desconto com fornecedores ou compra em volume.`,
      impacto_estimado: `+${brl(custo * REDUCAO_CUSTO)} no lucro do período`,
    });
  }

  // 3. Release capital tied up in overstock, or push the highest-margin product.
  const excesso = m.produtos
    .filter((p) => !p.critico && p.estoque_atual > p.estoque_minimo * 2)
    .map((p) => ({ p, sobra: p.estoque_atual - p.estoque_minimo * 2 }))
    .sort((a, b) => b.sobra * custoUnitario(b.p) - a.sobra * custoUnitario(a.p))[0];
  if (excesso && custoUnitario(excesso.p) > 0) {
    out.push({
      titulo: `Girar o excesso de ${excesso.p.produto}`,
      descricao: `Há ${un(excesso.p.estoque_atual)} em estoque para mínimo de ${un(excesso.p.estoque_minimo)}. Crie um kit ou promoção relâmpago para vender ${un(excesso.sobra)} excedentes e reduzir custo de armazenagem.`,
      impacto_estimado: `Libera ~${brl(excesso.sobra * custoUnitario(excesso.p))} em capital de giro`,
    });
  } else {
    const maiorMargem = [...vendidos].sort((a, b) => b.margem - a.margem)[0];
    if (maiorMargem) {
      out.push({
        titulo: `Dar vitrine para ${maiorMargem.produto}`,
        descricao: `É o produto de maior margem (${pct(maiorMargem.margem)}). Destaque-o no checkout e em combos para puxar o mix de vendas para itens mais rentáveis.`,
        impacto_estimado: `Cada ${brl(1000)} vendidos geram ${brl(maiorMargem.margem * 10)} de lucro`,
      });
    }
  }
  return out;
}

/** Strategic diagnosis computed only from the loaded CSV numbers (used when Groq is unavailable). */
export function gerarDiagnosticoLocal(m: DashboardMetrics): Diagnostico {
  const lider = [...m.produtos].sort((a, b) => b.lucro - a.lucro)[0];
  const criticos =
    m.itensCriticos === 0
      ? "Nenhum produto está em estoque crítico"
      : `${m.itensCriticos} produto${m.itensCriticos > 1 ? "s estão" : " está"} em estoque crítico`;
  const resumo = m.produtos.length
    ? `Faturamento de ${brl(m.faturamentoTotal)} e lucro de ${brl(m.lucroTotal)}, com margem média de ${pct(m.margemMedia)}. ${criticos}${lider ? `; ${lider.produto} lidera o lucro.` : "."}`
    : "Não há produtos nos dados carregados.";
  return { resumo, alertas_reposicao: alertas(m), produtos_escalar: escalar(m), acoes_margem: acoes(m) };
}
