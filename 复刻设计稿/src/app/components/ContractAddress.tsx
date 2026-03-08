import { Copy, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

const CA = "NV2RYH9S4cTJ3ckFUpvFqaQKU4ARqqDH3562nF3pump";

const links = [
  { name: "DexScreener", color: "#00e676" },
  { name: "CoinGecko", color: "#8dc63f" },
  { name: "Solscan", color: "#00d2ff" },
];

export function ContractAddress() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-[#0f1225]/80 backdrop-blur-xl rounded-2xl p-4 px-5 flex items-center justify-between flex-wrap gap-3 border border-[#ffffff08]"
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[#8b8ea0] text-xs px-2 py-0.5 rounded-md bg-[#ffffff06] border border-[#ffffff08]">
          CA
        </span>
        <span
          className="text-[#00d2ff] text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {CA}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all duration-300 cursor-pointer ${
            copied
              ? "border-[#00e67640] text-[#00e676] bg-[#00e67610]"
              : "border-[#ffffff10] text-[#8b8ea0] hover:text-white hover:bg-[#ffffff08] hover:border-[#ffffff20]"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "已复制" : "复制"}
        </button>
        {links.map((link) => (
          <button
            key={link.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#8b8ea0] text-xs hover:text-white hover:bg-[#ffffff08] transition-all duration-300 cursor-pointer group"
          >
            <span
              className="w-1.5 h-1.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: link.color }}
            />
            {link.name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
