// Exporta posição B3 no MAIN world usando idToken do sessionStorage.

const B3_POSICAO_API =
  "https://investidor.b3.com.br/negocio-posicao/api/extrato-posicao/v2/posicao";

const B3_TIPO_LABEL = {
  Acao: "Ação",
  BDR: "BDR",
  ETFFundoIndiceAcoes: "ETF",
  FundoInvestimentoImobiliario: "FII",
  FundoInvestimento: "Fundo",
  TesouroDireto: "Tesouro Direto",
};

const B3_TIPO_KEY = {
  Acao: "acoes",
  BDR: "bdrs",
  ETFFundoIndiceAcoes: "etfs",
  FundoInvestimentoImobiliario: "fiis",
  FundoInvestimento: "fundos",
  TesouroDireto: "tesouro_direto",
};

function tipoToKey(tipoProduto, tipoLabel) {
  if (B3_TIPO_KEY[tipoProduto]) return B3_TIPO_KEY[tipoProduto];
  return String(tipoLabel || tipoProduto || "outros")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function findB3IdToken() {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const val = sessionStorage.getItem(key);
    if (!val) continue;

    if (/^idtoken$/i.test(key) && val.length > 20) return val;

    try {
      const parsed = JSON.parse(val);
      const token =
        parsed?.idToken ||
        parsed?.id_token ||
        parsed?.body?.id_token ||
        parsed?.body?.idToken;
      if (token && typeof token === "string" && token.length > 20) return token;

      if (
        parsed?.credentialType === "IdToken" &&
        typeof parsed?.secret === "string" &&
        parsed.secret.length > 20
      )
        return parsed.secret;
    } catch {
      /* not json */
    }

    if (/idtoken/i.test(key) && /^eyJ/.test(val)) return val;
  }

  for (let i = 0; i < sessionStorage.length; i++) {
    const val = sessionStorage.getItem(sessionStorage.key(i));
    if (!val || !val.includes("idToken")) continue;
    const m = val.match(/"idToken"\s*:\s*"([^"]+)"/);
    if (m?.[1]?.startsWith("eyJ")) return m[1];
  }

  return null;
}

function findB3PosicaoUrl() {
  const urls = performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((n) => n.includes("/extrato-posicao/v2/posicao"));
  return urls.length ? urls[urls.length - 1] : null;
}

function getCapturedPosicao() {
  if (globalThis.__b3LastPosicao?.json?.itens)
    return globalThis.__b3LastPosicao;
  try {
    const raw = sessionStorage.getItem("__b3LastPosicao");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.json?.itens) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function trimStr(v) {
  return typeof v === "string" ? v.trim() : v;
}

function flattenB3Posicao(raw, dataRef) {
  const grupos = {};
  const resumoCats = {};

  for (const item of raw.itens || []) {
    const categoria = item.categoriaProduto;
    const tipoProduto = item.tipoProduto;
    const tipoLabel =
      B3_TIPO_LABEL[tipoProduto] || item.descricaoTipoProduto || tipoProduto;
    const key = tipoToKey(tipoProduto, tipoLabel);

    if (!grupos[key]) grupos[key] = [];
    if (!resumoCats[key]) {
      resumoCats[key] = {
        tipo: tipoLabel,
        categoria,
        valor_total: 0,
        quantidade_ativos: 0,
      };
    }
    resumoCats[key].valor_total += item.totalPosicao || 0;

    for (const p of item.posicoes || []) {
      const ticker = trimStr(p.codigoNegociacao) || trimStr(p.produto);
      const ativo = {
        ticker,
        nome:
          trimStr(p.razaoSocial) ||
          trimStr(p.nomeTituloPublico) ||
          trimStr(p.produto),
        tipo_ativo: trimStr(p.tipo) || null,
        quantidade: p.quantidade,
        preco: p.precoFechamento ?? null,
        valor: p.valorAtualizado,
        valor_aplicado: p.valorAplicado ?? null,
        valor_bruto: p.valorBruto ?? null,
        valor_liquido: p.valorLiquido ?? null,
        disponivel: p.disponivel ?? null,
        vencimento: p.vencimento ? String(p.vencimento).slice(0, 10) : null,
        indexador: p.indexador || null,
        rentabilidade_contratada_pct: p.percRentabilidadeContratada ?? null,
        isin: trimStr(p.codigoIsin) || null,
        instituicao: trimStr(p.instituicao) || null,
        conta: p.codigoConta || null,
        escriturador: trimStr(p.escriturador) || null,
        administrador: trimStr(p.administrador) || null,
        data_referencia: p.dataReferencia
          ? String(p.dataReferencia).slice(0, 10)
          : dataRef,
      };
      Object.keys(ativo).forEach((k) => {
        if (ativo[k] === null || ativo[k] === undefined) delete ativo[k];
      });
      grupos[key].push(ativo);
      resumoCats[key].quantidade_ativos++;
    }
  }

  for (const key of Object.keys(grupos)) {
    grupos[key].sort(
      (a, b) =>
        (b.valor || 0) - (a.valor || 0) || a.ticker.localeCompare(b.ticker),
    );
  }

  const por_categoria = Object.entries(resumoCats)
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => b.valor_total - a.valor_total);
  const valor_total = por_categoria.reduce((s, c) => s + c.valor_total, 0);
  const quantidade_ativos = por_categoria.reduce(
    (s, c) => s + c.quantidade_ativos,
    0,
  );

  for (const c of por_categoria) {
    c.percentual =
      valor_total > 0
        ? Math.round((c.valor_total / valor_total) * 10000) / 100
        : 0;
    c.valor_total = Math.round(c.valor_total * 100) / 100;
  }

  return {
    data_referencia: dataRef,
    exportado_em: new Date().toISOString(),
    moeda: "BRL",
    resumo: {
      valor_total: Math.round(valor_total * 100) / 100,
      quantidade_ativos,
      por_categoria,
    },
    ...grupos,
  };
}

async function fetchB3Pagina(data, pagina, cacheGuid, token) {
  const params = new URLSearchParams({ data, pagina: String(pagina) });
  if (cacheGuid) params.set("cache-guid", cacheGuid);
  const res = await fetch(`${B3_POSICAO_API}?${params}`, {
    credentials: "include",
    headers: {
      Accept: "application/json, text/plain, */*",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status}${body ? ` — ${body.slice(0, 180)}` : ""}`,
    );
  }
  return res.json();
}

async function fetchAllPages(data, cacheGuid, token) {
  const primeira = await fetchB3Pagina(data, 1, cacheGuid, token);
  const totalPaginas = primeira.totalPaginas || 1;
  const itens = [...(primeira.itens || [])];
  for (let p = 2; p <= totalPaginas; p++) {
    const page = await fetchB3Pagina(data, p, cacheGuid, token);
    itens.push(...(page.itens || []));
  }
  return { ...primeira, itens, paginaAtual: 1, totalPaginas };
}

function buildResult(raw, data) {
  const organized = flattenB3Posicao(raw, data);
  return {
    ok: true,
    data: organized,
    filename: `b3-posicao-${data}.json`,
    count: organized.resumo.quantidade_ativos,
  };
}

globalThis.__b3ExportPosicao = async function __b3ExportPosicao() {
  if (!/investidor\.b3\.com\.br$/i.test(location.hostname)) {
    return {
      ok: false,
      error:
        "Abra o site investidor.b3.com.br (já autenticado) e tente de novo.",
    };
  }

  const captured = getCapturedPosicao();
  if (captured?.json) {
    let data = yesterdayISO();
    try {
      if (captured.url)
        data = new URL(captured.url).searchParams.get("data") || data;
    } catch {
      /* ignore */
    }
    return buildResult(captured.json, data);
  }

  const token = findB3IdToken();
  if (!token) {
    return {
      ok: false,
      error:
        "idToken não encontrado no sessionStorage.\nRecarregue a B3 logado e tente de novo.",
    };
  }

  const existing = findB3PosicaoUrl();
  let data = yesterdayISO();
  // Preferir o cache-guid da própria página; senão gera um novo
  let cacheGuid = crypto.randomUUID();
  if (existing) {
    try {
      const u = new URL(existing);
      data = u.searchParams.get("data") || data;
      cacheGuid = u.searchParams.get("cache-guid") || cacheGuid;
    } catch {
      /* ignore */
    }
  }

  try {
    const raw = await fetchAllPages(data, cacheGuid, token);
    return buildResult(raw, data);
  } catch (e1) {
    // Se o guid da página estiver velho (504), tenta GUID novo
    try {
      const raw = await fetchAllPages(data, crypto.randomUUID(), token);
      return buildResult(raw, data);
    } catch (e2) {
      return {
        ok: false,
        error: `${e2.message}\n\nidToken: sim | data: ${data}\nRecarregue Posição, espere a lista, e tente de novo.`,
      };
    }
  }
};
