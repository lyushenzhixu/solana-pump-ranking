import { CardShowcase } from "./components/CardShowcase";

export default function App() {
  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background: "linear-gradient(145deg, #050816 0%, #070d1a 25%, #0a1225 50%, #080d1c 75%, #060918 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Neon Cyberpunk 蓝色环境光 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00d4ff] rounded-full opacity-[0.06] blur-[120px]" />
        <div className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] bg-[#0099ff] rounded-full opacity-[0.04] blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-[#00b4ff] rounded-full opacity-[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page header */}
        <div className="text-center mb-12">
          <h1 className="text-white text-2xl sm:text-3xl mb-2" style={{ fontWeight: 700 }}>
            持仓卡片样式方案
          </h1>
          <p className="text-[#555870] text-sm">Neon Cyberpunk 蓝色 · 聪明钱流入卡片风格</p>
        </div>

        <CardShowcase />

        <div className="text-center py-10 text-[#555870] text-xs">
          以上均为示例样式 · 可根据需求混搭或微调
        </div>
      </div>
    </div>
  );
}
