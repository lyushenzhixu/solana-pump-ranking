import { Bot, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export function NewsSummary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Subtle gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#6c5ce730] via-transparent to-[#00d2ff30] opacity-50" />
      <div className="relative bg-[#0f1225]/90 backdrop-blur-xl rounded-2xl p-5 border border-[#ffffff08]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#6c5ce715] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#6c5ce7]" />
          </div>
          <span className="text-white text-sm">叙事总结</span>
          <span className="flex items-center gap-1.5 bg-gradient-to-r from-[#6c5ce720] to-[#e040fb20] text-[#a78bfa] text-xs px-2.5 py-1 rounded-full border border-[#6c5ce730]">
            <Bot className="w-3 h-3" />
            AI 生成
          </span>
        </div>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-[#6c5ce7] via-[#e040fb] to-transparent" />
          <p className="text-[#b0b3c5] text-sm leading-[1.8] pl-4">
            某交易者在$PUNCH上线时狙击了其8%的供应量，但因过早卖出损失300万美元收益，构成一则经典交易的"恐怖故事"。$PUNCH流动性池已在Solana上线，相关池地址为82jn8NsqaZ7BHG2oLSRnL7AVY06cvgjkwRvlbjV8aLyB和BTQvDV2nNELKwQTjsvtLUI9MIvzVgiTf8tKx47WWP1Luy。HTX拓展其慈善版图，通过"Punch Spirit"连接全球善意。某用户表达关闭稳定币生态 adoption 加速，同时询问是否有人采用 Punch 项目。并附上相关链接。Karoline Leavitt通届特朗普合国情咨文联解经济，可负担性、美国250周年及债中击时刻，并分享展现1776精神的美国英雄故事。突发消息称Punch有了新伙伴。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
