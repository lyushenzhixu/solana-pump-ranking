import { TrendingUp, BarChart3, Percent, Users, Droplets, Calendar } from "lucide-react";
import { motion } from "motion/react";

const stats = [
  { label: "市值", value: "$10.22M", icon: TrendingUp, gradient: "from-[#6c5ce7] to-[#8b5cf6]", iconBg: "#6c5ce715" },
  { label: "24H 交易量", value: "$3.84M", icon: BarChart3, gradient: "from-[#00d2ff] to-[#0090ff]", iconBg: "#00d2ff15" },
  { label: "24H 涨跌", value: "+51.64%", icon: Percent, gradient: "from-[#00e676] to-[#00c853]", iconBg: "#00e67615", valueColor: "#00e676" },
  { label: "持币地址", value: "24,525", icon: Users, gradient: "from-[#e040fb] to-[#6c5ce7]", iconBg: "#e040fb15" },
  { label: "流动性", value: "$552.37K", icon: Droplets, gradient: "from-[#00d2ff] to-[#6c5ce7]", iconBg: "#00d2ff15" },
  { label: "上线时间", value: "2026-02-05", icon: Calendar, gradient: "from-[#ffa726] to-[#ff7043]", iconBg: "#ffa72615" },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 + idx * 0.05 }}
          className="group relative rounded-2xl overflow-hidden"
        >
          {/* Hover glow */}
          <div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 blur-sm transition-opacity duration-500`}
          />
          <div className="relative bg-[#0f1225]/80 backdrop-blur-xl rounded-2xl p-4 border border-[#ffffff08] group-hover:border-[#ffffff15] transition-all duration-500 h-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#8b8ea0] text-xs">{stat.label}</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.iconBg }}
              >
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.iconBg.replace("15", "") }} />
              </div>
            </div>
            <div
              className="text-white text-lg"
              style={{ color: stat.valueColor || "#ffffff", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            >
              {stat.value}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
