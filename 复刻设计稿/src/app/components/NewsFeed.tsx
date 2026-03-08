import { motion } from "motion/react";
import { Rss, ExternalLink } from "lucide-react";

const sourceColors: Record<string, { bg: string; text: string }> = {
  Twitter: { bg: "#1d9bf015", text: "#1d9bf0" },
  twitter: { bg: "#1d9bf015", text: "#1d9bf0" },
  true: { bg: "#ff525215", text: "#ff5252" },
  phoenixnews: { bg: "#ffa72615", text: "#ffa726" },
  PRNewswire: { bg: "#00d2ff15", text: "#00d2ff" },
  Fortune: { bg: "#e040fb15", text: "#e040fb" },
  FOX: { bg: "#ff525215", text: "#ff5252" },
  WaPo: { bg: "#8b8ea015", text: "#8b8ea0" },
};

const newsItems = [
  {
    sentiment: "bearish" as const,
    text: "Someone sniped 8% of $PUNCH at launch But fumbled $3,000,000 by selling too early A short horror story 🧵",
    source: "true",
    time: "2h 前",
  },
  {
    sentiment: "bullish" as const,
    text: "$PUNCH liquidity pools are now live on Solana 🐶 → pancakeswap.finance/liquidity/pool/solana/82jn8N...",
    source: "Twitter",
    time: "3h 前",
  },
  {
    sentiment: "bullish" as const,
    text: 'HTX Expands Its Philanthropic Footprint: Connecting Global Kindness Through the "Punch Spirit"',
    source: "phoenixnews",
    time: "4h 前",
  },
  {
    sentiment: "neutral" as const,
    text: "I love seeing stablecoin adoption accelerate across the ecosystem. I really do. But what about seei...",
    source: "Twitter",
    time: "5h 前",
  },
  {
    sentiment: "neutral" as const,
    text: "🚨 EPIC NIGHT AHEAD: Karoline Leavitt just dropped the on tonight's SOTU, President Trump going FULL ECONOMY, AFFORDA...",
    source: "Twitter",
    time: "5h 前",
  },
  {
    sentiment: "bullish" as const,
    text: 'HTX Expands Its Philanthropic Footprint: Connecting Global Kindness Through the "Punch Spirit"',
    source: "PRNewswire",
    time: "6h 前",
  },
  {
    sentiment: "bullish" as const,
    text: "BREAKING: Punch got a new fren https://t.co/4hz1T4B5kp",
    source: "Twitter",
    time: "7h 前",
  },
  {
    sentiment: "neutral" as const,
    text: "引用推文: Who needs a punch bag? 🤣 (If you create or buy meme coins based on my tweets, know that I probably won't ment...",
    source: "twitter",
    time: "8h 前",
  },
  {
    sentiment: "bearish" as const,
    text: "Fed survey reveals Trump's tariff gut punch to the backbone of the U.S. economy: small business. Small businesses...",
    source: "Fortune",
    time: "9h 前",
  },
  {
    sentiment: "bearish" as const,
    text: "Mamdani's rent freeze, tax hikes a 'one-two wealth destruction punch,' economists warn",
    source: "FOX",
    time: "10h 前",
  },
  {
    sentiment: "neutral" as const,
    text: "The White House released a bingo card for tonight's speech, which highlights how the White House often blends the pre...",
    source: "WaPo",
    time: "11h 前",
  },
];

const sentimentColors = {
  bullish: "#00e676",
  bearish: "#ff5252",
  neutral: "#ffa726",
};

export function NewsFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
      className="bg-[#0f1225]/80 backdrop-blur-xl rounded-2xl border border-[#ffffff08] overflow-hidden"
    >
      <div className="p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#ffa72615] flex items-center justify-center">
            <Rss className="w-4 h-4 text-[#ffa726]" />
          </div>
          <span className="text-white text-sm">相关资讯</span>
          <span className="text-[#8b8ea0] text-xs px-2 py-0.5 rounded-full bg-[#ffffff06] border border-[#ffffff08]">
            {newsItems.length}
          </span>
        </div>
      </div>

      <div className="px-5 pb-3">
        {newsItems.map((item, idx) => {
          const sc = sourceColors[item.source] || { bg: "#8b8ea015", text: "#8b8ea0" };
          return (
            <div
              key={idx}
              className="group flex items-start gap-3 py-3.5 border-b border-[#ffffff06] last:border-b-0 hover:bg-[#ffffff03] -mx-5 px-5 transition-colors duration-300 cursor-pointer"
            >
              {/* Sentiment dot */}
              <div className="mt-1.5 flex-shrink-0 relative">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: sentimentColors[item.sentiment] }}
                />
                <div
                  className="absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: sentimentColors[item.sentiment], animationDuration: "3s" }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[#b0b3c5] text-sm leading-relaxed group-hover:text-[#d0d3e5] transition-colors line-clamp-2">
                  {item.text}
                </p>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <span className="text-[#8b8ea0] text-xs hidden sm:inline">{item.time}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: sc.bg, color: sc.text }}
                >
                  {item.source}
                </span>
                <ExternalLink className="w-3 h-3 text-[#8b8ea0] opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
