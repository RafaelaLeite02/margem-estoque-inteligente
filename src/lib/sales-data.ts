export type SaleRow = {
  data: string;
  produto: string;
  categoria: string;
  quantidade_vendida: number;
  preco_unitario: number;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
};

export type ProductSummary = {
  produto: string;
  categoria: string;
  quantidade: number;
  faturamento: number;
  custo: number;
  lucro: number;
  margem: number;
  estoque_atual: number;
  estoque_minimo: number;
  critico: boolean;
};

export type CategorySummary = { categoria: string; faturamento: number; lucro: number; participacao: number };

export type DashboardMetrics = {
  faturamentoTotal: number;
  lucroTotal: number;
  margemMedia: number;
  itensCriticos: number;
  produtos: ProductSummary[];
  categorias: CategorySummary[];
  periodo: { inicio: string; fim: string } | null;
};

export const REQUIRED_COLUMNS = [
  "data",
  "produto",
  "categoria",
  "quantidade_vendida",
  "preco_unitario",
  "custo_unitario",
  "estoque_atual",
  "estoque_minimo",
] as const;

/** A product is critical when its current stock is at or below the minimum stock. */
export function isCriticalStock(estoqueAtual: number, estoqueMinimo: number) {
  return estoqueAtual <= estoqueMinimo;
}

function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^\uFEFF/, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseNumber(raw: string): number {
  let v = raw.replace(/[R$\s]/g, "");
  if (v.includes(",") && v.includes(".")) {
    // 1.234,56 -> 1234.56
    v = v.lastIndexOf(",") > v.lastIndexOf(".") ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  } else if (v.includes(",")) {
    v = v.replace(",", ".");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function parseSalesCsv(text: string): SaleRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("O arquivo CSV está vazio ou não possui linhas de dados.");

  const first = lines[0] ?? "";
  const delimiter = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(first, delimiter).map(normalizeHeader);
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length) throw new Error(`Colunas ausentes no CSV: ${missing.join(", ")}`);

  const idx = Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, headers.indexOf(c)])) as Record<
    (typeof REQUIRED_COLUMNS)[number],
    number
  >;

  const rows: SaleRow[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = splitCsvLine(line, delimiter);
    const row: SaleRow = {
      data: cells[idx.data] ?? "",
      produto: cells[idx.produto] ?? "",
      categoria: cells[idx.categoria] || "Sem categoria",
      quantidade_vendida: parseNumber(cells[idx.quantidade_vendida] ?? ""),
      preco_unitario: parseNumber(cells[idx.preco_unitario] ?? ""),
      custo_unitario: parseNumber(cells[idx.custo_unitario] ?? ""),
      estoque_atual: parseNumber(cells[idx.estoque_atual] ?? ""),
      estoque_minimo: parseNumber(cells[idx.estoque_minimo] ?? ""),
    };
    const numeric = [
      row.quantidade_vendida,
      row.preco_unitario,
      row.custo_unitario,
      row.estoque_atual,
      row.estoque_minimo,
    ];
    if (!row.produto || numeric.some((n) => Number.isNaN(n))) {
      throw new Error(`Linha ${i + 2} inválida: verifique o produto e os valores numéricos.`);
    }
    rows.push(row);
  });
  return rows;
}

export function computeMetrics(rows: SaleRow[]): DashboardMetrics {
  const map = new Map<string, ProductSummary & { lastDate: string }>();

  for (const r of rows) {
    const fat = r.quantidade_vendida * r.preco_unitario;
    const custo = r.quantidade_vendida * r.custo_unitario;
    const existing = map.get(r.produto);
    if (!existing) {
      map.set(r.produto, {
        produto: r.produto,
        categoria: r.categoria,
        quantidade: r.quantidade_vendida,
        faturamento: fat,
        custo,
        lucro: 0,
        margem: 0,
        estoque_atual: r.estoque_atual,
        estoque_minimo: r.estoque_minimo,
        critico: false,
        lastDate: r.data,
      });
    } else {
      existing.quantidade += r.quantidade_vendida;
      existing.faturamento += fat;
      existing.custo += custo;
      // Stock comes from the most recent record of the product.
      if (r.data >= existing.lastDate) {
        existing.lastDate = r.data;
        existing.estoque_atual = r.estoque_atual;
        existing.estoque_minimo = r.estoque_minimo;
      }
    }
  }

  const produtos: ProductSummary[] = [...map.values()]
    .map(({ lastDate: _ignored, ...p }) => {
      const lucro = p.faturamento - p.custo;
      return {
        ...p,
        lucro,
        margem: p.faturamento > 0 ? (lucro / p.faturamento) * 100 : 0,
        critico: isCriticalStock(p.estoque_atual, p.estoque_minimo),
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);

  const faturamentoTotal = produtos.reduce((s, p) => s + p.faturamento, 0);
  const lucroTotal = produtos.reduce((s, p) => s + p.lucro, 0);

  const catMap = new Map<string, { faturamento: number; lucro: number }>();
  for (const p of produtos) {
    const c = catMap.get(p.categoria) ?? { faturamento: 0, lucro: 0 };
    c.faturamento += p.faturamento;
    c.lucro += p.lucro;
    catMap.set(p.categoria, c);
  }
  const categorias = [...catMap.entries()]
    .map(([categoria, v]) => ({
      categoria,
      ...v,
      participacao: faturamentoTotal > 0 ? (v.faturamento / faturamentoTotal) * 100 : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  const dates = rows.map((r) => r.data).filter(Boolean).sort();

  return {
    faturamentoTotal,
    lucroTotal,
    margemMedia: faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0,
    itensCriticos: produtos.filter((p) => p.critico).length,
    produtos,
    categorias,
    periodo: dates.length ? { inicio: dates[0] ?? "", fim: dates[dates.length - 1] ?? "" } : null,
  };
}

const DEMO_PRODUCTS = [
  { produto: "Fone Bluetooth Pro", categoria: "Eletrônicos", preco: 249.9, custo: 118, base: 64, estoqueFinal: 12, minimo: 20 },
  { produto: "Smartwatch Fit X", categoria: "Eletrônicos", preco: 599, custo: 340, base: 28, estoqueFinal: 45, minimo: 15 },
  { produto: "Carregador Turbo 65W", categoria: "Eletrônicos", preco: 129.9, custo: 42, base: 92, estoqueFinal: 8, minimo: 25 },
  { produto: "Cadeira Ergonômica Nova", categoria: "Móveis", preco: 1290, custo: 780, base: 11, estoqueFinal: 6, minimo: 6 },
  { produto: "Mesa Elevatória Duo", categoria: "Móveis", preco: 2190, custo: 1460, base: 6, estoqueFinal: 14, minimo: 5 },
  { produto: "Luminária LED Arc", categoria: "Casa", preco: 189, custo: 71, base: 37, estoqueFinal: 60, minimo: 20 },
  { produto: "Garrafa Térmica 1L", categoria: "Casa", preco: 89.9, custo: 31, base: 110, estoqueFinal: 120, minimo: 40 },
  { produto: "Kit Café Coado", categoria: "Casa", preco: 149, custo: 88, base: 33, estoqueFinal: 18, minimo: 25 },
  { produto: "Mochila Urbana 25L", categoria: "Acessórios", preco: 279, custo: 112, base: 26, estoqueFinal: 33, minimo: 15 },
  { produto: "Carteira Slim Couro", categoria: "Acessórios", preco: 159, custo: 49, base: 41, estoqueFinal: 75, minimo: 20 },
];

const DEMO_MONTHS = ["2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-31"];
// Fixed multipliers keep the demo identical on every load.
const DEMO_SEASONALITY = [0.82, 0.94, 1.0, 1.08, 1.17];

export function getDemoRows(): SaleRow[] {
  const rows: SaleRow[] = [];
  DEMO_PRODUCTS.forEach((p, pi) => {
    DEMO_MONTHS.forEach((data, mi) => {
      const wobble = 1 + (((pi * 7 + mi * 3) % 5) - 2) * 0.04;
      const qtd = Math.max(1, Math.round(p.base * (DEMO_SEASONALITY[mi] ?? 1) * wobble));
      const remainingMonths = DEMO_MONTHS.length - 1 - mi;
      rows.push({
        data,
        produto: p.produto,
        categoria: p.categoria,
        quantidade_vendida: qtd,
        preco_unitario: p.preco,
        custo_unitario: p.custo,
        estoque_atual: p.estoqueFinal + remainingMonths * Math.round(p.base * 0.6),
        estoque_minimo: p.minimo,
      });
    });
  });
  return rows;
}

export function rowsToCsv(rows: SaleRow[]): string {
  const header = REQUIRED_COLUMNS.join(",");
  const body = rows.map((r) =>
    REQUIRED_COLUMNS.map((c) => {
      const v = String(r[c]);
      return v.includes(",") ? `"${v}"` : v;
    }).join(","),
  );
  return [header, ...body].join("\n");
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const brlCompact = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
export const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
