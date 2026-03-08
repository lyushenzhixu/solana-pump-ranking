import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Maximize2, CandlestickChart } from "lucide-react";

interface CandleData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

function generateMockData(): CandleData[] {
  const data: CandleData[] = [];
  let price = 0.004;

  for (let i = 0; i < 96; i++) {
    const hour = 3 + Math.floor(i * 0.5);
    const minute = (i % 2) * 30;
    const displayHour = hour >= 24 ? hour - 24 : hour;
    const timeStr = `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const volatility = 0.08;
    const trend = i < 30 ? -0.01 : i < 50 ? 0.04 : i < 70 ? 0.02 : i < 85 ? -0.005 : 0.001;
    const change = (Math.random() - 0.48 + trend) * volatility;
    const open = price;
    price = price * (1 + change);

    if (i >= 40 && i <= 55) price = 0.004 + (i - 40) * 0.001 + Math.random() * 0.002;
    if (i >= 56 && i <= 70) price = 0.018 - (i - 56) * 0.0008 + Math.random() * 0.001;
    if (i >= 71) price = 0.010 + Math.random() * 0.002;

    data.push({
      time: i >= 84 ? "8日" : timeStr,
      open: Math.max(0.001, open),
      close: Math.max(0.001, price),
      high: Math.max(0.001, Math.max(open, price) * (1 + Math.random() * 0.02)),
      low: Math.max(0.001, Math.min(open, price) * (1 - Math.random() * 0.02)),
      volume: Math.random() * 100000,
    });
  }
  return data;
}

const timeframes = ["15m", "1H", "4H", "1D"];

export function KLineChart() {
  const [activeTimeframe, setActiveTimeframe] = useState("15m");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data] = useState<CandleData[]>(generateMockData);
  const [hoverInfo, setHoverInfo] = useState<CandleData | null>(null);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 15, right: 65, bottom: 35, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const allLows = data.map((d) => d.low);
    const allHighs = data.map((d) => d.high);
    const minPrice = Math.min(...allLows) * 0.95;
    const maxPrice = Math.max(...allHighs) * 1.05;

    const priceToY = (p: number) => padding.top + chartH - ((p - minPrice) / (maxPrice - minPrice)) * chartH;
    const candleWidth = Math.max(2, (chartW / data.length) * 0.65);
    const gap = chartW / data.length;

    // Grid lines with subtle gradient
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i;
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels on right
      const priceVal = maxPrice - ((maxPrice - minPrice) / 5) * i;
      ctx.fillStyle = "rgba(139,142,160,0.5)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(priceVal.toFixed(4), width - padding.right + 6, y + 3);
    }

    // Volume bars with gradient
    const maxVol = Math.max(...data.map((d) => d.volume));
    const volHeight = chartH * 0.12;
    data.forEach((d, i) => {
      const x = padding.left + i * gap + gap / 2;
      const bullish = d.close >= d.open;
      const barH = (d.volume / maxVol) * volHeight;
      const grad = ctx.createLinearGradient(x, padding.top + chartH - barH, x, padding.top + chartH);
      if (bullish) {
        grad.addColorStop(0, "rgba(0, 230, 118, 0.25)");
        grad.addColorStop(1, "rgba(0, 230, 118, 0.05)");
      } else {
        grad.addColorStop(0, "rgba(255, 82, 82, 0.25)");
        grad.addColorStop(1, "rgba(255, 82, 82, 0.05)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x - candleWidth / 2, padding.top + chartH - barH, candleWidth, barH);
    });

    // Candles with rounded look
    data.forEach((d, i) => {
      const x = padding.left + i * gap + gap / 2;
      const bullish = d.close >= d.open;
      const color = bullish ? "#00e676" : "#ff5252";

      // Wick
      ctx.strokeStyle = bullish ? "rgba(0,230,118,0.6)" : "rgba(255,82,82,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(d.high));
      ctx.lineTo(x, priceToY(d.low));
      ctx.stroke();

      // Body with subtle shadow
      const bodyTop = priceToY(Math.max(d.open, d.close));
      const bodyBottom = priceToY(Math.min(d.open, d.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
      ctx.fillStyle = color;
      ctx.beginPath();
      const r = Math.min(1.5, candleWidth / 3);
      // Rounded rect
      ctx.moveTo(x - candleWidth / 2 + r, bodyTop);
      ctx.lineTo(x + candleWidth / 2 - r, bodyTop);
      ctx.quadraticCurveTo(x + candleWidth / 2, bodyTop, x + candleWidth / 2, bodyTop + r);
      ctx.lineTo(x + candleWidth / 2, bodyTop + bodyHeight - r);
      ctx.quadraticCurveTo(x + candleWidth / 2, bodyTop + bodyHeight, x + candleWidth / 2 - r, bodyTop + bodyHeight);
      ctx.lineTo(x - candleWidth / 2 + r, bodyTop + bodyHeight);
      ctx.quadraticCurveTo(x - candleWidth / 2, bodyTop + bodyHeight, x - candleWidth / 2, bodyTop + bodyHeight - r);
      ctx.lineTo(x - candleWidth / 2, bodyTop + r);
      ctx.quadraticCurveTo(x - candleWidth / 2, bodyTop, x - candleWidth / 2 + r, bodyTop);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Current price dashed line
    const currentPrice = data[data.length - 1].close;
    const currentY = priceToY(currentPrice);
    ctx.strokeStyle = "#00e67660";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tag on right
    const tagW = 56;
    const tagH = 20;
    const tagR = 4;
    ctx.fillStyle = "#00e676";
    ctx.shadowColor = "#00e676";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(width - padding.right + tagR, currentY - tagH / 2);
    ctx.lineTo(width - padding.right + tagW - tagR, currentY - tagH / 2);
    ctx.quadraticCurveTo(width - padding.right + tagW, currentY - tagH / 2, width - padding.right + tagW, currentY - tagH / 2 + tagR);
    ctx.lineTo(width - padding.right + tagW, currentY + tagH / 2 - tagR);
    ctx.quadraticCurveTo(width - padding.right + tagW, currentY + tagH / 2, width - padding.right + tagW - tagR, currentY + tagH / 2);
    ctx.lineTo(width - padding.right + tagR, currentY + tagH / 2);
    ctx.quadraticCurveTo(width - padding.right, currentY + tagH / 2, width - padding.right, currentY + tagH / 2 - tagR);
    ctx.lineTo(width - padding.right, currentY - tagH / 2 + tagR);
    ctx.quadraticCurveTo(width - padding.right, currentY - tagH / 2, width - padding.right + tagR, currentY - tagH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#000";
    ctx.font = "500 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(currentPrice.toFixed(4), width - padding.right + tagW / 2, currentY + 4);

    // Time labels
    ctx.fillStyle = "rgba(139,142,160,0.5)";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textAlign = "center";
    const times = ["03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "8日", "02:00"];
    times.forEach((t, idx) => {
      const x = padding.left + (idx / (times.length - 1)) * chartW;
      ctx.fillText(t, x, height - 10);
    });
  }, [data]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawChart]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padding = { left: 10, right: 65 };
    const chartW = rect.width - padding.left - padding.right;
    const gap = chartW / data.length;
    const idx = Math.floor((x - padding.left) / gap);
    if (idx >= 0 && idx < data.length) {
      setHoverInfo(data[idx]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="relative rounded-2xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#00d2ff05] to-transparent pointer-events-none" />
      <div className="relative bg-[#0f1225]/80 backdrop-blur-xl rounded-2xl p-5 border border-[#ffffff08]">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00e67612] flex items-center justify-center">
              <CandlestickChart className="w-4 h-4 text-[#00e676]" />
            </div>
            <span className="text-white text-sm">K 线图</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-[#ffffff06] rounded-xl p-1 border border-[#ffffff08]">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-300 cursor-pointer ${
                    activeTimeframe === tf
                      ? "bg-gradient-to-r from-[#00d2ff] to-[#0090ff] text-white shadow-lg shadow-[#00d2ff30]"
                      : "text-[#8b8ea0] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button className="p-2 rounded-lg text-[#8b8ea0] hover:text-white hover:bg-[#ffffff08] transition-all cursor-pointer">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hover OHLCV info */}
        <div className="h-6 flex items-center gap-4 mb-1 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {hoverInfo && (
            <>
              <span className="text-[#8b8ea0]">O <span className="text-white">{hoverInfo.open.toFixed(6)}</span></span>
              <span className="text-[#8b8ea0]">H <span className="text-white">{hoverInfo.high.toFixed(6)}</span></span>
              <span className="text-[#8b8ea0]">L <span className="text-white">{hoverInfo.low.toFixed(6)}</span></span>
              <span className="text-[#8b8ea0]">C <span className={hoverInfo.close >= hoverInfo.open ? "text-[#00e676]" : "text-[#ff5252]"}>{hoverInfo.close.toFixed(6)}</span></span>
            </>
          )}
        </div>

        <div ref={containerRef} className="w-full h-[350px] sm:h-[400px]">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverInfo(null)}
          />
        </div>
      </div>
    </motion.div>
  );
}
