import { motion } from "motion/react";
import {
  TrendingUp,
  ArrowRightLeft,
  Zap,
  Copy,
  ChevronRight,
  Flame,
  CircleDot,
  Sparkles,
  BarChart3,
  ExternalLink,
} from "lucide-react";

interface CardData {
  name: string;
  avatar: string;
  contractShort: string;
  marketCap: string;
  avgBuyPrice: string;
  buyTime: string;
  smartMoneyCount: number;
  netInflow: string;
  buyPercent: number;
  sellPercent: number;
  accentColor: string;
}

const holdings: CardData[] = [
  {
    name: "我的刀盾",
    avatar: "⚔️",
    contractShort: "6iA73gWC...KBpump",
    marketCap: "$3.70M",
    avgBuyPrice: "$0.0043",
    buyTime: "1d以前买入",
    smartMoneyCount: 4,
    netInflow: "$9143.97",
    buyPercent: 17,
    sellPercent: 83,
    accentColor: "#ff5252",
  },
  {
    name: "TripleT",
    avatar: "🔥",
    contractShort: "J8PSdNP3...KZpump",
    marketCap: "$1.34M",
    avgBuyPrice: "$0.0019",
    buyTime: "1d以前买入",
    smartMoneyCount: 4,
    netInflow: "$5080.85",
    buyPercent: 19,
    sellPercent: 81,
    accentColor: "#ffa726",
  },
  {
    name: "Punch",
    avatar: "🥊",
    contractShort: "NV2RYH9S...FSpump",
    marketCap: "$10.26M",
    avgBuyPrice: "$0.0136",
    buyTime: "4d以前买入",
    smartMoneyCount: 4,
    netInflow: "$16432.11",
    buyPercent: 97,
    sellPercent: 3,
    accentColor: "#00e676",
  },
];

/* ═══════════════════════════════════════════
   Style A — 极简扁平
   ═══════════════════════════════════════════ */
function StyleACard({ card, index }: { card: CardData; index: number }) {
  const buyW = (card.buyPercent / (card.buyPercent + card.sellPercent)) * 100;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="bg-[#10131e] rounded-xl p-5 border border-[#1c1f30] hover:border-[#2a2e44] transition-colors duration-300 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-[#1a1d2e] flex items-center justify-center text-base">
          {card.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm" style={{ fontWeight: 600 }}>{card.name}</span>
            <span className="text-[#555870] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {card.contractShort}
            </span>
          </div>
          <span className="text-[#555870] text-xs">{card.buyTime}</span>
        </div>
        <Copy className="w-3.5 h-3.5 text-[#555870] hover:text-[#8b8ea0] transition-colors cursor-pointer" />
      </div>

      {/* Data row */}
      <div className="flex gap-6 mb-5">
        <div>
          <div className="text-[#555870] text-[10px] uppercase tracking-wider mb-1">市值</div>
          <div className="text-white text-sm" style={{ fontWeight: 600 }}>{card.marketCap}</div>
        </div>
        <div>
          <div className="text-[#555870] text-[10px] uppercase tracking-wider mb-1">均价</div>
          <div className="text-white text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.avgBuyPrice}</div>
        </div>
        <div>
          <div className="text-[#555870] text-[10px] uppercase tracking-wider mb-1">净流入</div>
          <div className="text-[#00e676] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.netInflow}</div>
        </div>
      </div>

      {/* Smart money */}
      <div className="flex items-center gap-1.5 mb-4">
        <CircleDot className="w-3 h-3" style={{ color: card.accentColor }} />
        <span className="text-[#8b8ea0] text-xs">{card.smartMoneyCount} 个聪明钱正在交易</span>
      </div>

      {/* Bar */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-[#00e676] w-8">{card.buyPercent}%</span>
        <div className="flex-1 h-1.5 rounded-full bg-[#1a1d2e] overflow-hidden flex">
          <div className="h-full bg-[#00e676] rounded-l-full" style={{ width: `${buyW}%` }} />
          <div className="h-full bg-[#ff5252] rounded-r-full flex-1" />
        </div>
        <span className="text-[#ff5252] w-8 text-right">{card.sellPercent}%</span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Style B — 渐变光谱
   ═══════════════════════════════════════════ */
function StyleBCard({ card, index }: { card: CardData; index: number }) {
  const buyW = (card.buyPercent / (card.buyPercent + card.sellPercent)) * 100;
  const gradients: Record<string, string> = {
    "#ff5252": "linear-gradient(135deg, #ff525218 0%, #ff704308 50%, transparent 100%)",
    "#ffa726": "linear-gradient(135deg, #ffa72618 0%, #ff704308 50%, transparent 100%)",
    "#00e676": "linear-gradient(135deg, #00e67618 0%, #00d2ff08 50%, transparent 100%)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
    >
      <div
        className="relative rounded-2xl p-5 border border-[#ffffff0a] hover:border-[#ffffff18] transition-all duration-500"
        style={{ background: gradients[card.accentColor] || gradients["#ff5252"] }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-700"
          style={{ backgroundColor: card.accentColor }}
        />

        {/* Header */}
        <div className="relative flex items-center gap-3.5 mb-5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${card.accentColor}30, ${card.accentColor}10)`,
              boxShadow: `0 4px 16px ${card.accentColor}20`,
            }}
          >
            {card.avatar}
          </div>
          <div className="flex-1">
            <h3 className="text-white text-base" style={{ fontWeight: 600 }}>{card.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[#8b8ea0] text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {card.contractShort}
              </span>
              <ExternalLink className="w-2.5 h-2.5 text-[#555870]" />
            </div>
          </div>
          <div
            className="px-2.5 py-1 rounded-full text-[10px]"
            style={{ backgroundColor: `${card.accentColor}15`, color: card.accentColor }}
          >
            {card.smartMoneyCount} SM
          </div>
        </div>

        {/* Stats cards inside */}
        <div className="relative grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "市值", value: card.marketCap },
            { label: "均价", value: card.avgBuyPrice, mono: true },
            { label: "净流入", value: card.netInflow, green: true, mono: true },
          ].map((s) => (
            <div key={s.label} className="bg-[#ffffff04] rounded-xl p-2.5 text-center">
              <div className="text-[#555870] text-[10px] mb-1">{s.label}</div>
              <div
                className={`text-xs ${s.green ? "text-[#00e676]" : "text-white"}`}
                style={{ fontFamily: s.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif", fontWeight: 600 }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="relative flex items-center gap-2 mb-4">
          <Flame className="w-3 h-3" style={{ color: card.accentColor }} />
          <span className="text-[#8b8ea0] text-xs">{card.buyTime}</span>
          <span className="text-[#555870] text-xs">·</span>
          <Zap className="w-3 h-3 text-[#ffa726]" />
          <span className="text-xs" style={{ color: card.accentColor }}>聪明钱活跃</span>
        </div>

        {/* Progress with labels */}
        <div className="relative">
          <div className="h-2.5 rounded-full overflow-hidden bg-[#ffffff06] flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${buyW}%` }}
              transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
              className="h-full rounded-l-full"
              style={{ background: `linear-gradient(90deg, #00e676, ${card.accentColor === "#00e676" ? "#00d2ff" : "#00e676"})` }}
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${100 - buyW}%` }}
              transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
              className="h-full rounded-r-full"
              style={{ background: "linear-gradient(90deg, #ff525280, #ff5252)" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px]">
            <span className="text-[#00e676]">买入 {card.buyPercent}%</span>
            <span className="text-[#ff5252]">卖出 {card.sellPercent}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* 霓虹朋克主色：蓝色 */
const NEON_BLUE = "#00d4ff";
const NEON_BLUE_DIM = "#0099cc";
const NEON_BLUE_GLOW = "rgba(0, 212, 255, 0.4)";

/* ═══════════════════════════════════════════
   Style C — 霓虹朋克（蓝色）
   ═══════════════════════════════════════════ */
function StyleCCard({ card, index }: { card: CardData; index: number }) {
  const buyW = (card.buyPercent / (card.buyPercent + card.sellPercent)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.5 }}
      className="group relative cursor-pointer"
    >
      {/* Neon outer glow — 蓝色 */}
      <div
        className="absolute -inset-[1px] rounded-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${NEON_BLUE}, transparent 50%, ${NEON_BLUE}80)`,
          boxShadow: `0 0 20px ${NEON_BLUE_GLOW}`,
        }}
      />

      <div className="relative bg-[#08091a] rounded-xl overflow-hidden border border-[#00d4ff18]">
        {/* Scanline effect */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
          }}
        />

        {/* Top bar with accent — 蓝色 */}
        <div
          className="h-8 flex items-center px-4 gap-2 text-[10px] uppercase tracking-widest"
          style={{ backgroundColor: `${NEON_BLUE}10`, borderBottom: `1px solid ${NEON_BLUE}25` }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: NEON_BLUE, boxShadow: `0 0 6px ${NEON_BLUE}` }} />
          <span style={{ color: NEON_BLUE, fontFamily: "'JetBrains Mono', monospace", textShadow: `0 0 8px ${NEON_BLUE_GLOW}` }}>LIVE</span>
          <span className="ml-auto text-[#555870]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            SM:{card.smartMoneyCount}
          </span>
        </div>

        <div className="p-4 pt-3">
          {/* Name row */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border"
              style={{ borderColor: `${NEON_BLUE}40`, boxShadow: `0 0 12px ${NEON_BLUE}20, inset 0 0 12px ${NEON_BLUE}08` }}
            >
              {card.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-white text-base" style={{ fontWeight: 600 }}>{card.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#555870] group-hover:text-[#00d4ff] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#555870] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.contractShort}</span>
              </div>
            </div>
          </div>

          {/* Stats in horizontal layout with dividers — 净流入用蓝色 */}
          <div className="flex items-stretch gap-0 mb-4 rounded-lg border border-[#ffffff08] overflow-hidden">
            {[
              { label: "MCAP", value: card.marketCap },
              { label: "AVG", value: card.avgBuyPrice },
              { label: "INFLOW", value: card.netInflow, color: NEON_BLUE },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex-1 py-2.5 px-3 text-center ${i < 2 ? "border-r border-[#ffffff08]" : ""}`}
                style={{ backgroundColor: "rgba(255,255,255,0.015)" }}
              >
                <div className="text-[#555870] text-[9px] tracking-wider mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
                <div
                  className="text-xs"
                  style={{ color: s.color || "#fff", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, textShadow: s.color === NEON_BLUE ? `0 0 6px ${NEON_BLUE_GLOW}` : "none" }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Time + activity — 蓝色 */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <ArrowRightLeft className="w-3 h-3 text-[#555870]" />
            <span className="text-[#555870]">{card.buyTime}</span>
            <div className="flex-1" />
            <Zap className="w-3 h-3" style={{ color: NEON_BLUE, filter: `drop-shadow(0 0 4px ${NEON_BLUE_GLOW})` }} />
            <span style={{ color: NEON_BLUE, fontSize: "11px", textShadow: `0 0 6px ${NEON_BLUE_GLOW}` }}>Active</span>
          </div>

          {/* Cyberpunk style bar — 买入蓝 / 卖出红 */}
          <div className="relative">
            <div className="flex gap-[2px] h-3 rounded overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${buyW}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                className="h-full"
                style={{
                  background: `repeating-linear-gradient(90deg, ${NEON_BLUE}, ${NEON_BLUE} 4px, ${NEON_BLUE_DIM} 4px, ${NEON_BLUE_DIM} 6px)`,
                  boxShadow: `0 0 8px ${NEON_BLUE_GLOW}`,
                }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - buyW}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                className="h-full"
                style={{
                  background: `repeating-linear-gradient(90deg, #ff5252, #ff5252 4px, #ff525290 4px, #ff525290 6px)`,
                  boxShadow: "0 0 6px rgba(255,82,82,0.4)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span className="text-[#00d4ff]" style={{ textShadow: `0 0 4px ${NEON_BLUE_GLOW}` }}>BUY {card.buyPercent}%</span>
              <span className="text-[#ff5252]">SELL {card.sellPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Style D — 深邃浮雕
   ═══════════════════════════════════════════ */
function StyleDCard({ card, index }: { card: CardData; index: number }) {
  const buyW = (card.buyPercent / (card.buyPercent + card.sellPercent)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group cursor-pointer rounded-3xl p-5"
      style={{
        background: "linear-gradient(145deg, #13162b, #0c0e1f)",
        boxShadow: "8px 8px 24px #06071280, -8px -8px 24px #1a1e3815",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
          style={{
            background: "linear-gradient(145deg, #181c35, #0e1025)",
            boxShadow: `inset 3px 3px 6px #0a0c1d, inset -3px -3px 6px #1e2240, 0 0 0 1px ${card.accentColor}15`,
          }}
        >
          {card.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-base truncate" style={{ fontWeight: 600 }}>{card.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[#555870] text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {card.contractShort}
            </span>
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #181c35, #0e1025)",
            boxShadow: "3px 3px 8px #06071280, -3px -3px 8px #1a1e3815",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: card.accentColor }} />
        </div>
      </div>

      {/* Recessed stats */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(145deg, #0c0e1f, #13162b)",
          boxShadow: "inset 4px 4px 10px #08091580, inset -4px -4px 10px #1a1e3815",
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "市值", value: card.marketCap },
            { label: "均价", value: card.avgBuyPrice, mono: true },
            { label: "净流入", value: card.netInflow, mono: true, green: true },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[#555870] text-[10px] mb-1.5">{s.label}</div>
              <div
                className={`text-sm ${s.green ? "text-[#00e676]" : "text-white"}`}
                style={{ fontFamily: s.mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif", fontWeight: 600 }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="flex items-center gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className="w-3 h-3 text-[#555870]" />
          <span className="text-[#8b8ea0]">{card.buyTime}</span>
        </div>
        <div className="h-3 w-px bg-[#ffffff08]" />
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3" style={{ color: card.accentColor }} />
          <span style={{ color: card.accentColor }}>{card.smartMoneyCount} SM</span>
        </div>
      </div>

      {/* Raised bar */}
      <div>
        <div className="flex justify-between text-[10px] mb-2">
          <span className="text-[#00e676]">买入 {card.buyPercent}%</span>
          <span className="text-[#ff5252]">卖出 {card.sellPercent}%</span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden flex"
          style={{
            background: "linear-gradient(145deg, #0c0e1f, #13162b)",
            boxShadow: "inset 2px 2px 5px #08091580, inset -2px -2px 5px #1a1e3815",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${buyW}%` }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
            className="h-full rounded-l-full"
            style={{
              background: "linear-gradient(90deg, #00e676, #00c853)",
              boxShadow: "2px 0 8px #00e67640",
            }}
          />
          <div className="flex-1" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - buyW}%` }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
            className="h-full rounded-r-full"
            style={{
              background: "linear-gradient(90deg, #ff525280, #ff5252)",
              boxShadow: "-2px 0 8px #ff525240",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Style E — 数据仪表盘
   ═══════════════════════════════════════════ */
function StyleECard({ card, index }: { card: CardData; index: number }) {
  const buyW = (card.buyPercent / (card.buyPercent + card.sellPercent)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative bg-[#0b0e1c] rounded-2xl border border-[#ffffff06] hover:border-[#ffffff12] transition-all duration-500 overflow-hidden cursor-pointer"
    >
      {/* Background mesh pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative p-5">
        {/* Top row with avatar and quick stats */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-[#ffffff08] bg-[#ffffff03]"
          >
            {card.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm" style={{ fontWeight: 600 }}>{card.name}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${card.accentColor}12`,
                  color: card.accentColor,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {card.smartMoneyCount} SM
              </span>
            </div>
            <span className="text-[#444766] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {card.contractShort}
            </span>
          </div>
          <div className="text-right">
            <div className="text-white text-sm" style={{ fontWeight: 600 }}>{card.marketCap}</div>
            <div className="text-[#444766] text-[10px]">MCAP</div>
          </div>
        </div>

        {/* Metric strip */}
        <div className="flex gap-2 mb-4">
          {[
            { icon: BarChart3, label: "均价", value: card.avgBuyPrice, color: "#8b8ea0" },
            { icon: TrendingUp, label: "净流入", value: card.netInflow, color: "#00e676" },
          ].map((m) => (
            <div key={m.label} className="flex-1 flex items-center gap-2 bg-[#ffffff03] rounded-lg px-3 py-2">
              <m.icon className="w-3 h-3 flex-shrink-0" style={{ color: m.color }} />
              <div className="min-w-0">
                <div className="text-[#444766] text-[9px]">{m.label}</div>
                <div
                  className="text-xs truncate"
                  style={{ color: m.color === "#00e676" ? "#00e676" : "#fff", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {m.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline row */}
        <div className="flex items-center gap-2 mb-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-[#555870]">
            <ArrowRightLeft className="w-3 h-3" />
            {card.buyTime}
          </div>
          <div className="flex-1 h-px bg-[#ffffff06]" />
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" style={{ color: card.accentColor }} />
            <span style={{ color: card.accentColor }}>活跃</span>
          </div>
        </div>

        {/* Segmented bar */}
        <div>
          <div className="flex gap-[1px] h-1.5 rounded-full overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => {
              const isBuy = i < Math.round(buyW / 5);
              return (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.4 + i * 0.02 + index * 0.1, duration: 0.2 }}
                  className="flex-1 rounded-sm"
                  style={{
                    backgroundColor: isBuy ? "#00e676" : "#ff5252",
                    opacity: isBuy ? 0.8 : 0.4,
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="text-[#00e676]">{card.buyPercent}% BUY</span>
            <span className="text-[#ff5252]">{card.sellPercent}% SELL</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Showcase Container
   ═══════════════════════════════════════════ */
export function CardShowcase() {
  const styles = [
    { name: "霓虹朋克（蓝）", desc: "Neon Cyberpunk · 聪明钱流入", Component: StyleCCard },
    { name: "极简扁平", desc: "Minimal Flat", Component: StyleACard },
    { name: "渐变光谱", desc: "Gradient Spectrum", Component: StyleBCard },
    { name: "深邃浮雕", desc: "Dark Neumorphic", Component: StyleDCard },
    { name: "数据仪表盘", desc: "Data Dashboard", Component: StyleECard },
  ];

  return (
    <div className="space-y-12">
      {styles.map((style, sIdx) => (
        <motion.section
          key={style.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: sIdx * 0.15, duration: 0.5 }}
        >
          {/* Section title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#ffffff06] border border-[#ffffff08] text-xs text-[#8b8ea0]" style={{ fontWeight: 600 }}>
              {String.fromCharCode(65 + sIdx)}
            </div>
            <div>
              <h2 className="text-white text-base" style={{ fontWeight: 600 }}>{style.name}</h2>
              <p className="text-[#555870] text-xs">{style.desc}</p>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-[#ffffff08] to-transparent ml-3" />
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.map((card, idx) => (
              <style.Component key={card.name} card={card} index={idx} />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
