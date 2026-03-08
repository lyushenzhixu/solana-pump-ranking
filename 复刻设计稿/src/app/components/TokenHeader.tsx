import { ChevronLeft, TrendingUp, Star, Share2 } from "lucide-react";
import { motion } from "motion/react";

export function TokenHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#ffffff10] text-[#8b8ea0] text-sm bg-[#ffffff05] backdrop-blur-sm hover:bg-[#ffffff10] hover:text-white hover:border-[#ffffff20] transition-all duration-300 cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
          <span>返回榜单</span>
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg border border-[#ffffff08] text-[#8b8ea0] bg-[#ffffff05] hover:bg-[#ffffff10] hover:text-[#ffd700] transition-all duration-300 cursor-pointer">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg border border-[#ffffff08] text-[#8b8ea0] bg-[#ffffff05] hover:bg-[#ffffff10] hover:text-white transition-all duration-300 cursor-pointer">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Token info card */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Gradient border glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#6c5ce7] via-[#00d2ff] to-[#6c5ce7] opacity-20 blur-sm" />
        <div className="relative bg-[#0f1225]/90 backdrop-blur-xl rounded-2xl p-6 border border-[#ffffff08]">
          <div className="flex items-center gap-5">
            {/* Avatar with animated glow */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-2 bg-gradient-to-br from-[#6c5ce7] to-[#e040fb] rounded-full opacity-40 blur-lg animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#6c5ce7] via-[#8b5cf6] to-[#e040fb] flex items-center justify-center text-3xl shadow-lg shadow-[#6c5ce740]">
                🥊
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-white text-xl" style={{ fontFamily: "'Inter', sans-serif" }}>パンチ</span>
                <span className="bg-gradient-to-r from-[#6c5ce7] to-[#8b5cf6] text-white text-xs px-3 py-1 rounded-full shadow-md shadow-[#6c5ce730]">
                  Punch
                </span>
                <span className="flex items-center gap-1.5 bg-[#00d2ff08] text-[#00d2ff] text-xs px-3 py-1 rounded-full border border-[#00d2ff20]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d2ff]" />
                  </span>
                  Solana
                </span>
                <span className="text-[#8b8ea0] text-xs px-2 py-0.5 rounded-full border border-[#ffffff08] bg-[#ffffff05]">
                  Meme
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="text-white text-3xl tracking-tight"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                >
                  $0.010210
                </span>
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="flex items-center gap-1 bg-[#00e67615] text-[#00e676] text-sm px-3 py-1 rounded-full border border-[#00e67620]"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  +51.64%
                </motion.span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
