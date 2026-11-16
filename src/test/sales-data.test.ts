import { describe, expect, it } from "vitest";
import { computeMetrics, isCriticalStock, parseSalesCsv } from "@/lib/sales-data";

describe("estoque crítico", () => {
  it("é crítico quando estoque_atual é igual ao estoque_minimo", () => {
    expect(isCriticalStock(6, 6)).toBe(true);
  });
  it("é crítico quando estoque_atual está abaixo do estoque_minimo", () => {
    expect(isCriticalStock(5, 6)).toBe(true);
  });
  it("é normal quando estoque_atual está acima do estoque_minimo", () => {
    expect(isCriticalStock(7, 6)).toBe(false);
  });
});

describe("KPIs", () => {
  const csv = `data,produto,categoria,quantidade_vendida,preco_unitario,custo_unitario,estoque_atual,estoque_minimo
2026-01-01,A,X,10,100,60,50,10
2026-02-01,A,X,5,100,60,8,10
2026-01-01,B,Y,4,50,20,30,5`;
  const m = computeMetrics(parseSalesCsv(csv));

  it("soma faturamento e lucro", () => {
    expect(m.faturamentoTotal).toBe(1700);
    expect(m.lucroTotal).toBe(720);
  });
  it("calcula a margem média sobre o faturamento", () => {
    expect(m.margemMedia).toBeCloseTo((720 / 1700) * 100, 5);
  });
  it("usa o estoque do registro mais recente para contar críticos", () => {
    expect(m.itensCriticos).toBe(1);
  });
});
