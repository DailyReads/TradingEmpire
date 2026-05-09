import { useState, useEffect, useRef, useCallback } from "react";

// ─── Asset Type Detection ───────────────────────────────────────────────────
const CRYPTO_LIST = ["BTC","ETH","SOL","BNB","XRP","ADA","AVAX","DOT","MATIC","LINK","DOGE","SHIB","LTC","BCH","ATOM","UNI","AAVE","CRV","MKR","SNX","OP","ARB","INJ","SUI","APT"];
const FOREX_PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCHF","NZDUSD","EURGBP","EURJPY","GBPJPY","USDCNH","USDINR","USDBRL","USDMXN","USDKRW","USDZAR","USDSGD","USDTRY","USDSEK","USDNOK","EURCHF","EURCAD","CADCHF","AUDNZD","GBPAUD"];
const INDICES = ["SPX","NDX","DJI","RUT","VIX","FTSE","DAX","CAC","NIKKEI","HSI","KOSPI","ASX","SENSEX","IBEX","MIB"];

const detectAssetType = (sym) => {
  if (CRYPTO_LIST.includes(sym)) return "crypto";
  if (FOREX_PAIRS.includes(sym)) return "forex";
  if (INDICES.includes(sym)) return "index";
  return "stock";
};

const POPULAR = {
  stocks: ["NVDA","AAPL","TSLA","MSFT","META","GOOGL","AMZN","JPM","TSM","BABA","ASML","SAP","SHOP","NVO","TM","SNY"],
  crypto: ["BTC","ETH","SOL","BNB","XRP","AVAX","LINK","ARB"],
  forex:  ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","USDCNH"],
  indices:["SPX","NDX","VIX","FTSE","DAX","NIKKEI","HSI"],
};

// ─── Quant Math Helpers ─────────────────────────────────────────────────────
const quantFormulas = {
  sharpe: "Sharpe = (Rp − Rf) / σp",
  sortino: "Sortino = (Rp − Rf) / σd",
  beta: "β = Cov(Ri, Rm) / Var(Rm)",
  alpha: "α = Rp − [Rf + β(Rm − Rf)]",
  capm: "E(Ri) = Rf + βi × (E(Rm) − Rf)",
  blackScholes: "C = S·N(d1) − K·e^(−rT)·N(d2)",
  dcf: "DCF = Σ CFt / (1+r)^t",
  ev: "EV = Market Cap + Debt − Cash",
};

// ─── UI Components ──────────────────────────────────────────────────────────
const Badge = ({ type }) => {
  const cfg = {
    stock:  { c: "#4fc3f7", bg: "rgba(79,195,247,0.1)",  label: "EQUITY" },
    crypto: { c: "#f97316", bg: "rgba(249,115,22,0.1)",   label: "CRYPTO" },
    forex:  { c: "#a78bfa", bg: "rgba(167,139,250,0.1)",  label: "FX" },
    index:  { c: "#34d399", bg: "rgba(52,211,153,0.1)",   label: "INDEX" },
  }[type] || { c: "#888", bg: "rgba(128,128,128,0.1)", label: "—" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.c,
      border: `1px solid ${cfg.c}40`,
      padding: "2px 8px", borderRadius: "3px",
      fontSize: "9px", fontFamily: "monospace",
      fontWeight: "700", letterSpacing: "0.12em",
    }}>{cfg.label}</span>
  );
};

const SentimentBadge = ({ sentiment }) => {
  const cfg = {
    bullish: { c: "#00ff88", bg: "rgba(0,255,136,0.1)",  label: "▲ BULLISH" },
    bearish: { c: "#ff4455", bg: "rgba(255,68,85,0.1)",   label: "▼ BEARISH" },
    neutral: { c: "#ffcc00", bg: "rgba(255,204,0,0.1)",   label: "◆ NEUTRAL" },
  }[sentiment?.toLowerCase()] || { c: "#888", bg: "rgba(128,128,128,0.1)", label: "— N/A" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.c,
      border: `1px solid ${cfg.c}40`,
      padding: "3px 12px", borderRadius: "3px",
      fontSize: "10px", fontFamily: "monospace",
      fontWeight: "700", letterSpacing: "0.08em",
    }}>{cfg.label}</span>
  );
};

const Chip = ({ label, onClick, color = "#00ff88" }) => (
  <button onClick={onClick} style={{
    background: `${color}0d`,
    border: `1px solid ${color}44`,
    color, padding: "3px 10px",
    borderRadius: "4px", fontSize: "10px",
    fontFamily: "monospace", cursor: "pointer",
    transition: "all 0.15s", letterSpacing: "0.05em",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = `${color}22`; }}
    onMouseLeave={e => { e.currentTarget.style.background = `${color}0d`; }}
  >{label}</button>
);

const SectionCard = ({ icon, title, children, accentColor = "#00ff88" }) => (
  <div style={{
    background: "rgba(255,255,255,0.018)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px", padding: "20px",
    marginBottom: "14px", position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "1px",
      background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
    }} />
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      marginBottom: "12px", color: accentColor,
      fontSize: "10px", fontFamily: "monospace",
      letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: "700",
    }}>
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <span>{title}</span>
    </div>
    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13.5px", lineHeight: "1.8" }}>
      {children}
    </div>
  </div>
);

const QuantMetric = ({ label, formula, value, color = "#a78bfa" }) => (
  <div style={{
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(167,139,250,0.15)",
    borderRadius: "8px", padding: "12px 14px",
    flex: "1 1 200px",
  }}>
    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</div>
    <div style={{ fontSize: "11px", color, fontFamily: "monospace", marginBottom: "6px", opacity: 0.8 }}>{formula}</div>
    <div style={{ fontSize: "13px", color: "#fff", fontFamily: "monospace", fontWeight: "600" }}>{value || "—"}</div>
  </div>
);

const StatRow = ({ label, value, highlight }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    fontSize: "13px",
  }}>
    <span style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.05em" }}>{label}</span>
    <span style={{ color: highlight || "#fff", fontFamily: "monospace", fontWeight: "600", fontSize: "12px" }}>{value || "—"}</span>
  </div>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{
    display: "flex", gap: "4px", flexWrap: "wrap",
    marginBottom: "20px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px", padding: "6px",
  }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        background: active === t.id ? "rgba(0,255,136,0.12)" : "transparent",
        border: active === t.id ? "1px solid rgba(0,255,136,0.3)" : "1px solid transparent",
        color: active === t.id ? "#00ff88" : "rgba(255,255,255,0.4)",
        padding: "6px 14px", borderRadius: "6px",
        fontSize: "10px", fontFamily: "monospace",
        letterSpacing: "0.08em", cursor: "pointer",
        transition: "all 0.15s", fontWeight: active === t.id ? "700" : "400",
        whiteSpace: "nowrap",
      }}>
        {t.icon} {t.label}
      </button>
    ))}
  </div>
);

const LoadingBlock = () => (
  <div style={{ padding: "20px 0" }}>
    {[100,80,90,65,75].map((w,i) => (
      <div key={i} style={{
        height: "13px", width: `${w}%`,
        background: "rgba(255,255,255,0.04)",
        borderRadius: "4px", marginBottom: "10px",
        animation: `shimmer 1.4s ease-in-out ${i*0.12}s infinite`,
      }} />
    ))}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
export default function FinancialTerminal() {
  const [query, setQuery]       = useState("");
  const [assetType, setAssetType] = useState("stock");
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState("overview");
  const [history, setHistory]   = useState([]);
  const [newsQuery, setNewsQuery] = useState("");
  const [newsSearching, setNewsSearching] = useState(false);
  const [newsResults, setNewsResults] = useState(null);
  const [activeCategory, setActiveCategory] = useState("stocks");
  const inputRef = useRef(null);

  const TABS = [
    { id: "overview",    icon: "◎", label: "Overview"   },
    { id: "news",        icon: "⌁", label: "News"       },
    { id: "financials",  icon: "⬡", label: "Financials" },
    { id: "quant",       icon: "∑", label: "Quant"      },
    { id: "sentiment",   icon: "◈", label: "Sentiment"  },
    { id: "catalysts",   icon: "⚡", label: "Catalysts"  },
    { id: "risks",       icon: "⚠", label: "Risks"      },
  ];

  const buildPrompt = (sym, type) => {
    const assetLabel = { stock: "stock", crypto: "cryptocurrency", forex: "forex currency pair", index: "market index" }[type];

    const financialsSection = type === "stock" ? `
## FINANCIAL STATEMENTS & FUNDAMENTALS
Provide key financial data in structured format:
- Revenue (TTM, YoY growth %), Gross Margin %, Operating Margin %, Net Margin %
- EPS (TTM), P/E Ratio, Forward P/E, PEG Ratio, P/S Ratio, P/B Ratio, EV/EBITDA
- Market Cap, Enterprise Value, Total Debt, Cash & Equivalents, Free Cash Flow
- ROE %, ROA %, ROIC %, Current Ratio, Debt/Equity
- Revenue CAGR (3Y), EPS CAGR (3Y), Dividend Yield (if any)

## QUANTITATIVE ANALYSIS
Provide quantitative/mathematical finance metrics:
- Beta (52W vs S&P 500 or relevant benchmark), Annualized Volatility %, Max Drawdown %
- 52W High, 52W Low, Distance from ATH %, RSI (14-day estimate)
- Estimated Sharpe Ratio (use risk-free rate ~5.25%), Sortino Ratio estimate
- Implied Volatility (if options exist), Short Interest %, Institutional Ownership %
- Volume trends, Average Daily Volume, Float
- Any DCF or fair value estimates from analysts` : type === "crypto" ? `
## ON-CHAIN & MARKET METRICS
- Market Cap, Fully Diluted Valuation, 24h Volume, Circulating Supply, Max Supply
- 52W High / Low, Distance from ATH %
- Dominance %, NVT Ratio estimate, Active Addresses trend
- Exchange inflows/outflows trend, Funding Rates, Open Interest
- Annualized Volatility %, Correlation with BTC (if not BTC)
- Estimated Sharpe Ratio (1Y), Max Drawdown (1Y)` : type === "forex" ? `
## FX ANALYTICS & MACRO DATA
- Current rate, 52W range, YTD change %, 1M/3M/1Y performance
- Central bank rates for both currencies, rate differential
- Interest Rate Parity estimate, Purchasing Power Parity estimate vs spot
- Carry trade appeal (positive/negative), Volatility (realized 30D, 90D)
- COT positioning data (speculative net longs/shorts if available)
- Key support/resistance levels, correlation with risk-on/risk-off` : `
## INDEX FUNDAMENTALS & ANALYTICS
- Current level, 52W High/Low, YTD return %, 1Y return %
- P/E Ratio (for equity indices), constituent count, top holdings %
- Annualized volatility, Sharpe Ratio (3Y), Max Drawdown (recent)
- Correlation with major assets, VIX relationship` ;

    return `You are an elite institutional-grade financial research analyst with access to real-time market data. Analyze the following ${assetLabel}: ${sym}

Structure your response with EXACTLY these sections:

## ASSET OVERVIEW
Comprehensive overview of ${sym}. What it is, key metrics, current price environment, recent performance. Include actual current price data if available from web search.

## LATEST NEWS & MARKET MOVING EVENTS
5-6 most recent and impactful news stories for ${sym} with specific dates, figures, and context. Search for the very latest information.
${financialsSection}

## SECTOR & MACRO CONTEXT
Broader market environment, sector trends, macro factors (rates, inflation, USD, geopolitics) affecting ${sym}.

## MARKET SENTIMENT & ANALYST VIEWS
Wall Street consensus, price targets (low/mid/high), analyst ratings breakdown, institutional sentiment, options market signals. Give a clear BULLISH / BEARISH / NEUTRAL overall signal.

## KEY CATALYSTS
4-5 upcoming catalysts with expected dates that could move ${sym} significantly.

## RISK FACTORS
4-5 key risks with severity assessment (HIGH/MED/LOW).

Be specific, data-driven, and use actual numbers. Search for the most current data available. No generic statements.`;
  };

  const parseData = (text, sym, type) => {
    const extract = (patterns) => {
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]?.trim()) return m[1].trim();
      }
      return null;
    };

    const sentimentText = text.toLowerCase();
    const bull = (sentimentText.match(/bullish|positive|upside|growth|strong|beat|outperform|buy|accumulate/g)||[]).length;
    const bear = (sentimentText.match(/bearish|negative|downside|risk|weak|miss|underperform|sell|reduce/g)||[]).length;
    let signal = "neutral";
    if (bull > bear + 2) signal = "bullish";
    else if (bear > bull + 2) signal = "bearish";

    return {
      symbol: sym, type,
      signal,
      raw: text,
      overview:    extract([/##\s*ASSET OVERVIEW\s*\n([\s\S]*?)(?=\n##|$)/i]),
      news:        extract([/##\s*LATEST NEWS.*?\n([\s\S]*?)(?=\n##|$)/i]),
      financials:  extract([/##\s*(?:FINANCIAL STATEMENTS|ON-CHAIN|FX ANALYTICS|INDEX FUND).*?\n([\s\S]*?)(?=\n##|$)/i]),
      quant:       extract([/##\s*QUANTITATIVE.*?\n([\s\S]*?)(?=\n##|$)/i]),
      sector:      extract([/##\s*SECTOR.*?\n([\s\S]*?)(?=\n##|$)/i]),
      sentiment:   extract([/##\s*MARKET SENTIMENT.*?\n([\s\S]*?)(?=\n##|$)/i]),
      catalysts:   extract([/##\s*KEY CATALYSTS.*?\n([\s\S]*?)(?=\n##|$)/i]),
      risks:       extract([/##\s*RISK FACTORS.*?\n([\s\S]*?)(?=\n##|$)/i]),
    };
  };

  const runResearch = useCallback(async (sym) => {
    const symbol = (sym || query).trim().toUpperCase().replace(/\s+/g,"");
    if (!symbol) return;
    const type = detectAssetType(symbol);
    setLoading(true); setError(null); setData(null); setQuery(symbol); setTab("overview"); setAssetType(type);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: buildPrompt(symbol, type) }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      const text = json.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      const parsed = parseData(text, symbol, type);
      setData(parsed);
      setHistory(prev => [{ symbol, type, signal: parsed.signal, ts: Date.now() }, ...prev.filter(h => h.symbol !== symbol)].slice(0, 8));
    } catch (e) {
      setError(e.message || "Research failed.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const searchNews = useCallback(async () => {
    if (!newsQuery.trim()) return;
    setNewsSearching(true); setNewsResults(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search for the very latest financial market news about: "${newsQuery}". 
Find 6-8 specific, recent news stories with dates and key facts. Format each as:
**[DATE] HEADLINE**
Brief 2-3 sentence summary with specific numbers and market impact.

Focus on market-moving information, earnings, regulatory news, analyst calls, macro events. Be specific and factual.`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      const text = json.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      setNewsResults(text);
    } catch (e) {
      setNewsResults("Error fetching news: " + e.message);
    } finally {
      setNewsSearching(false);
    }
  }, [newsQuery]);

  const accentFor = (type) => ({ stock: "#00ff88", crypto: "#f97316", forex: "#a78bfa", index: "#34d399" }[type] || "#00ff88");
  const accent = data ? accentFor(data.type) : "#00ff88";

  const renderTabContent = () => {
    if (!data) return null;
    const a = accent;

    const contentMap = {
      overview:   { icon: "◎", title: "Asset Overview",                key: "overview",   color: a },
      news:       { icon: "⌁", title: "Latest News & Market Events",   key: "news",       color: "#4fc3f7" },
      sector:     { icon: "⬡", title: "Sector & Macro Context",        key: "sector",     color: "#34d399" },
      sentiment:  { icon: "◈", title: "Market Sentiment & Analyst Views", key: "sentiment", color: "#ffcc00" },
      catalysts:  { icon: "⚡", title: "Key Catalysts",                key: "catalysts",  color: "#f97316" },
      risks:      { icon: "⚠", title: "Risk Factors",                  key: "risks",      color: "#ff4455" },
    };

    if (tab === "financials") {
      return (
        <div style={{ animation: "fadeIn 0.35s ease" }}>
          <SectionCard icon="📊" title={data.type === "crypto" ? "On-Chain & Market Metrics" : data.type === "forex" ? "FX Analytics & Macro Data" : "Financial Statements & Fundamentals"} accentColor={a}>
            {data.financials
              ? <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "12.5px", lineHeight: "1.9", color: "rgba(255,255,255,0.82)" }}>{data.financials}</pre>
              : <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: "12px" }}>No structured financial data extracted. Check raw tab.</div>
            }
          </SectionCard>

          {/* Quant Formulas Reference */}
          <SectionCard icon="∑" title="Quantitative Finance Formulas Reference" accentColor="#a78bfa">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              {Object.entries(quantFormulas).map(([k, v]) => (
                <div key={k} style={{
                  background: "rgba(167,139,250,0.06)",
                  border: "1px solid rgba(167,139,250,0.15)",
                  borderRadius: "6px", padding: "8px 12px",
                  flex: "1 1 180px",
                }}>
                  <div style={{ fontSize: "9px", color: "rgba(167,139,250,0.6)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{k}</div>
                  <div style={{ fontSize: "11px", color: "#a78bfa", fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      );
    }

    if (tab === "quant") {
      return (
        <div style={{ animation: "fadeIn 0.35s ease" }}>
          <SectionCard icon="∑" title="Quantitative Analysis" accentColor="#a78bfa">
            {data.quant
              ? <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "12.5px", lineHeight: "1.9", color: "rgba(255,255,255,0.82)" }}>{data.quant}</pre>
              : <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: "12px" }}>See Financials tab for integrated data.</div>
            }
          </SectionCard>

          {/* Formula Cards */}
          <SectionCard icon="📐" title="Applied Formulas" accentColor="#a78bfa">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
              <QuantMetric label="CAPM" formula="E(Ri) = Rf + β(Rm−Rf)" value="See overview data" />
              <QuantMetric label="Sharpe Ratio" formula="(Rp−Rf) / σp" value="See quant section" />
              <QuantMetric label="Sortino Ratio" formula="(Rp−Rf) / σd" value="See quant section" />
              <QuantMetric label="Beta" formula="Cov(Ri,Rm) / Var(Rm)" value="See quant section" />
              <QuantMetric label="Black-Scholes" formula="C = SN(d1)−Ke^(−rT)N(d2)" value="Options pricing" />
              <QuantMetric label="DCF Valuation" formula="Σ CFt / (1+r)^t" value="See analyst targets" />
              <QuantMetric label="EV/EBITDA" formula="(Market Cap+Debt−Cash) / EBITDA" value="See financials" />
              <QuantMetric label="PEG Ratio" formula="P/E ÷ EPS Growth Rate" value="See financials" />
            </div>
          </SectionCard>
        </div>
      );
    }

    const cfg = contentMap[tab];
    if (cfg) {
      return (
        <div style={{ animation: "fadeIn 0.35s ease" }}>
          <SectionCard icon={cfg.icon} title={cfg.title} accentColor={cfg.color}>
            {data[cfg.key]
              ? <div style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: "1.8" }}>{data[cfg.key]}</div>
              : <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: "12px" }}>Data not available. Check raw analysis.</div>
            }
          </SectionCard>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07090d",
      color: "#fff",
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(0,255,136,0.25);border-radius:2px;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes shimmer{0%,100%{opacity:0.35}50%{opacity:0.75}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        input::placeholder{color:rgba(255,255,255,0.2);}
        input{caret-color:#00ff88;}
      `}</style>

      {/* BG Grid */}
      <div style={{
        position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:`linear-gradient(rgba(0,255,136,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.025) 1px,transparent 1px)`,
        backgroundSize:"52px 52px",
      }}/>
      <div style={{position:"fixed",top:"-300px",left:"50%",transform:"translateX(-50%)",width:"900px",height:"600px",background:"radial-gradient(ellipse,rgba(0,255,136,0.03) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"-200px",right:"-100px",width:"500px",height:"500px",background:"radial-gradient(circle,rgba(167,139,250,0.03) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(0,255,136,0.4),transparent)",animation:"scan 10s linear infinite",pointerEvents:"none",zIndex:1}}/>

      <div style={{maxWidth:"960px",margin:"0 auto",padding:"36px 20px 80px",position:"relative",zIndex:2}}>

        {/* ── HEADER ── */}
        <div style={{marginBottom:"36px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
            <div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 10px #00ff88",animation:"pulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:"9px",color:"#00ff88",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.22em",textTransform:"uppercase"}}>
              Global Markets Intelligence Terminal · Live AI Research
            </span>
          </div>
          <h1 style={{fontSize:"clamp(24px,4.5vw,40px)",fontWeight:"300",letterSpacing:"-0.025em",lineHeight:"1.15",color:"#fff",marginBottom:"6px"}}>
            Multi-Asset Financial<br/>
            <span style={{fontWeight:"700",background:"linear-gradient(135deg,#00ff88,#4fc3f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Research Terminal</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.35)",fontSize:"13px",fontWeight:"300",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.04em"}}>
            Stocks · Crypto · Forex · Indices · Quant Analytics · Financial Statements
          </p>
        </div>

        {/* ── MAIN SEARCH ── */}
        <div style={{
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"14px",
          padding:"20px",
          marginBottom:"20px",
        }}>
          <div style={{display:"flex",gap:"10px",marginBottom:"14px"}}>
            <div style={{position:"relative",flex:1}}>
              <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"#00ff88",fontFamily:"'IBM Plex Mono',monospace",fontSize:"15px",fontWeight:"700",pointerEvents:"none"}}>$</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && runResearch()}
                placeholder="AAPL · BTC · EURUSD · SPX · TSM · NVO..."
                maxLength={10}
                style={{
                  width:"100%",
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(0,255,136,0.22)",
                  borderRadius:"8px",
                  padding:"13px 14px 13px 34px",
                  color:"#fff",
                  fontSize:"16px",
                  fontFamily:"'IBM Plex Mono',monospace",
                  fontWeight:"600",
                  letterSpacing:"0.08em",
                  outline:"none",
                  transition:"all 0.2s",
                }}
                onFocus={e=>{e.target.style.borderColor="#00ff88";e.target.style.boxShadow="0 0 0 3px rgba(0,255,136,0.07)";}}
                onBlur={e=>{e.target.style.borderColor="rgba(0,255,136,0.22)";e.target.style.boxShadow="none";}}
              />
            </div>
            <button
              onClick={() => runResearch()}
              disabled={loading || !query.trim()}
              style={{
                background: loading ? "rgba(0,255,136,0.08)" : "#00ff88",
                color: loading ? "#00ff88" : "#000",
                border: "none", borderRadius:"8px",
                padding:"13px 24px",
                fontSize:"11px", fontFamily:"'IBM Plex Mono',monospace",
                fontWeight:"700", letterSpacing:"0.1em",
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                transition:"all 0.2s", whiteSpace:"nowrap",
                opacity: !query.trim() ? 0.4 : 1,
              }}
            >
              {loading ? "ANALYZING..." : "RESEARCH →"}
            </button>
          </div>

          {/* Category Tabs */}
          <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
            {Object.keys(POPULAR).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                background: activeCategory === cat ? "rgba(255,255,255,0.06)" : "transparent",
                border: `1px solid ${activeCategory === cat ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                color: activeCategory === cat ? "#fff" : "rgba(255,255,255,0.35)",
                padding:"4px 12px", borderRadius:"5px",
                fontSize:"9px", fontFamily:"'IBM Plex Mono',monospace",
                letterSpacing:"0.1em", cursor:"pointer",
                textTransform:"uppercase", transition:"all 0.15s",
              }}>{cat}</button>
            ))}
          </div>

          {/* Popular chips */}
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:"0.1em",marginRight:"4px"}}>QUICK:</span>
            {POPULAR[activeCategory].map(sym => {
              const t = detectAssetType(sym);
              const c = accentFor(t);
              return <Chip key={sym} label={sym} color={c} onClick={() => { setQuery(sym); runResearch(sym); }} />;
            })}
          </div>
        </div>

        {/* ── NEWS SEARCH ── */}
        <div style={{
          background:"rgba(255,255,255,0.015)",
          border:"1px solid rgba(79,195,247,0.12)",
          borderRadius:"14px",
          padding:"18px 20px",
          marginBottom:"24px",
        }}>
          <div style={{fontSize:"9px",color:"#4fc3f7",fontFamily:"monospace",letterSpacing:"0.15em",marginBottom:"10px",textTransform:"uppercase",fontWeight:"700"}}>
            ⌁ Custom News Search
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <input
              value={newsQuery}
              onChange={e => setNewsQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchNews()}
              placeholder='e.g. "Fed rate cuts 2025" · "Bitcoin ETF" · "China tech crackdown"'
              style={{
                flex:1,
                background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(79,195,247,0.2)",
                borderRadius:"7px",
                padding:"10px 14px",
                color:"#fff",
                fontSize:"13px",
                fontFamily:"'IBM Plex Sans',sans-serif",
                outline:"none",
                transition:"all 0.2s",
              }}
              onFocus={e=>{e.target.style.borderColor="#4fc3f7";}}
              onBlur={e=>{e.target.style.borderColor="rgba(79,195,247,0.2)";}}
            />
            <button
              onClick={searchNews}
              disabled={newsSearching || !newsQuery.trim()}
              style={{
                background:"rgba(79,195,247,0.12)",
                border:"1px solid rgba(79,195,247,0.3)",
                color:"#4fc3f7",
                borderRadius:"7px",
                padding:"10px 18px",
                fontSize:"10px",
                fontFamily:"'IBM Plex Mono',monospace",
                fontWeight:"700",
                letterSpacing:"0.08em",
                cursor: newsSearching || !newsQuery.trim() ? "not-allowed" : "pointer",
                whiteSpace:"nowrap",
                opacity: !newsQuery.trim() ? 0.4 : 1,
              }}
            >{newsSearching ? "SEARCHING..." : "SEARCH NEWS"}</button>
          </div>
          {newsSearching && <LoadingBlock />}
          {newsResults && !newsSearching && (
            <div style={{
              marginTop:"16px",
              padding:"16px",
              background:"rgba(79,195,247,0.04)",
              border:"1px solid rgba(79,195,247,0.1)",
              borderRadius:"8px",
              color:"rgba(255,255,255,0.8)",
              fontSize:"13px",
              lineHeight:"1.8",
              whiteSpace:"pre-wrap",
              animation:"fadeIn 0.3s ease",
            }}>{newsResults}</div>
          )}
        </div>

        {/* ── HISTORY ── */}
        {history.length > 0 && (
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center",marginBottom:"20px"}}>
            <span style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace",letterSpacing:"0.1em"}}>RECENT:</span>
            {history.map(h => (
              <button key={h.symbol} onClick={() => { setQuery(h.symbol); runResearch(h.symbol); }} style={{
                display:"flex",alignItems:"center",gap:"5px",
                background:"rgba(255,255,255,0.025)",
                border:"1px solid rgba(255,255,255,0.06)",
                borderRadius:"4px",
                padding:"3px 10px",
                color:"rgba(255,255,255,0.5)",
                fontSize:"10px",
                fontFamily:"monospace",
                cursor:"pointer",
                transition:"all 0.15s",
              }}>
                <span style={{fontSize:"7px",color:{bullish:"#00ff88",bearish:"#ff4455",neutral:"#ffcc00"}[h.signal]}}>●</span>
                <Badge type={h.type}/>
                <span style={{marginLeft:"2px"}}>{h.symbol}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={{background:"rgba(255,68,85,0.08)",border:"1px solid rgba(255,68,85,0.25)",borderRadius:"8px",padding:"14px 18px",color:"#ff4455",fontSize:"12px",marginBottom:"20px",fontFamily:"monospace"}}>
            ⚠ {error}
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(0,255,136,0.08)",borderRadius:"12px",padding:"28px",marginBottom:"20px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
              <div style={{width:"28px",height:"28px",border:"2px solid rgba(0,255,136,0.15)",borderTop:"2px solid #00ff88",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div>
                <div style={{color:"#00ff88",fontSize:"12px",fontFamily:"monospace",fontWeight:"600"}}>Searching live market data & news...</div>
                <div style={{color:"rgba(255,255,255,0.3)",fontSize:"11px",marginTop:"2px"}}>Financials · Quant metrics · Analyst sentiment · Risk factors</div>
              </div>
            </div>
            <LoadingBlock/>
          </div>
        )}

        {/* ── RESULTS ── */}
        {data && !loading && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {/* Header bar */}
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              flexWrap:"wrap",gap:"12px",
              marginBottom:"20px",
              padding:"18px 22px",
              background:"rgba(255,255,255,0.02)",
              border:`1px solid ${accent}22`,
              borderRadius:"12px",
              position:"relative",overflow:"hidden",
            }}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${accent}66,transparent)`}}/>
              <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap"}}>
                <div style={{fontSize:"26px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:"700",color:"#fff",letterSpacing:"-0.02em"}}>
                  {data.symbol}
                </div>
                <Badge type={data.type}/>
                <SentimentBadge sentiment={data.signal}/>
              </div>
              <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace",letterSpacing:"0.06em"}}>
                  {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · AI Research
                </div>
              </div>
            </div>

            {/* Tabs */}
            <TabBar tabs={TABS} active={tab} onChange={setTab}/>

            {/* Tab Content */}
            {renderTabContent()}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!data && !loading && !error && (
          <div style={{textAlign:"center",padding:"60px 20px",color:"rgba(255,255,255,0.15)"}}>
            <div style={{fontSize:"48px",marginBottom:"16px",opacity:0.3}}>◎</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:"8px"}}>
              Enter any symbol to begin research
            </div>
            <div style={{fontSize:"11px",fontFamily:"monospace",opacity:0.6}}>
              Global Equities · Cryptocurrencies · Forex Pairs · Market Indices
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{marginTop:"48px",paddingTop:"20px",borderTop:"1px solid rgba(255,255,255,0.04)",textAlign:"center"}}>
          <p style={{color:"rgba(255,255,255,0.15)",fontSize:"10px",fontFamily:"monospace",letterSpacing:"0.08em",lineHeight:"1.7"}}>
            AI-generated research for informational purposes only · Not financial advice<br/>
            Data sourced via live web search · Always verify with primary sources before investing
          </p>
        </div>
      </div>
    </div>
  );
}
