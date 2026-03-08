import { motion } from "motion/react";
import { Wallet, TrendingUp, ArrowRightLeft, Zap } from "lucide-react";

interface HoldingCardData {
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
  accentGradient: string;
}

const holdings: HoldingCardData[] = [
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
    accentGradient: "from-[#ff5252] to-[#ff7043]",
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
    accentGradient: "from-[#ffa726] to-[#ff7043]",
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
    accentGradient: "from-[#00e676] to-[#00d2ff]",
  },
];

function HoldingCard({ card, index }: { card: HoldingCardData; index: number }) {
  const totalPercent = card.buyPercent + card.sellPercent;
  const buyWidth = (card.buyPercent / totalPercent) * 100;
  const sellWidth = (card.sellPercent / totalPercent) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 * index, type: "spring", stiffness: 120 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
    >
      {/* Hover border glow */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.accentGradient} opacity-0 group-hover:opacity-15 blur-sm transition-opacity duration-700`}
      />

      <div className="relative bg-[#0f1225]/90 backdrop-blur-xl rounded-2xl border border-[#ffffff08] group-hover:border-[#ffffff15] transition-all duration-500 overflow-hidden">
        {/* Top accent line */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.accentGradient} opacity-40 group-hover:opacity-80 transition-opacity duration-500`}
        />

        <div className="p-5">
          {/* Header: Avatar + Name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div
                className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-500"
                style={{ backgroundColor: card.accentColor }}
              />
              <div
                className="relative w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{
                  background: `linear-gradient(135deg, ${card.accentColor}25, ${card.accentColor}10)`,
                  border: `1px solid ${card.accentColor}30`,
                }}
              >
                {card.avatar}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className="text-white text-base truncate"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
              >
                {card.name}
              </h3>
              <span
                className="text-[#8b8ea0] text-xs opacity-60"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {card.contractShort}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
            <div>
              <span className="text-[#8b8ea0] text-xs">市值</span>
              <div
                className="text-white text-sm mt-0.5"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
              >
                {card.marketCap}
              </div>
            </div>
            <div>
              <span className="text-[#8b8ea0] text-xs">平均买入价</span>
              <div
                className="text-white text-sm mt-0.5"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
              >
                {card.avgBuyPrice}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#ffffff0a] to-transparent mb-4" />

          {/* Activity Info */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-3 h-3 text-[#8b8ea0]" />
              <span className="text-[#8b8ea0] text-xs">{card.buyTime}</span>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" style={{ color: card.accentColor }} />
              <span className="text-xs" style={{ color: card.accentColor }}>
                {card.smartMoneyCount}个聪明钱正在交易
              </span>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-[#00e676]" />
              <span className="text-[#8b8ea0] text-xs">资金净流入</span>
              <span
                className="text-[#00e676] text-xs ml-auto"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {card.netInflow}
              </span>
            </div>
          </div>

          {/* Buy / Sell ratio bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#00e676]">买入({card.buyPercent}%)</span>
              <span className="text-[#ff5252]">卖出({card.sellPercent}%)</span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden bg-[#ffffff06]">
              {/* Buy portion */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${buyWidth}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                className="absolute left-0 top-0 h-full rounded-l-full"
                style={{
                  background: "linear-gradient(90deg, #00e676, #00c853)",
                  boxShadow: "0 0 8px #00e67640",
                }}
              />
              {/* Sell portion */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${sellWidth}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                className="absolute right-0 top-0 h-full rounded-r-full"
                style={{
                  background: "linear-gradient(90deg, #ff5252, #d32f2f)",
                  boxShadow: "0 0 8px #ff525240",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HoldingCards() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#6c5ce715] flex items-center justify-center">
          <Wallet className="w-4 h-4 text-[#6c5ce7]" />
        </div>
        <span className="text-white text-sm">聪明钱持仓</span>
        <span className="text-[#8b8ea0] text-xs px-2 py-0.5 rounded-full bg-[#ffffff06] border border-[#ffffff08]">
          {holdings.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {holdings.map((card, idx) => (
          <HoldingCard key={card.name} card={card} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}
