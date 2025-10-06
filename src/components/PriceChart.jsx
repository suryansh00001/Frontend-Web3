import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const PriceChart = ({ data, token, showChainlink = true }) => {
  // Custom dark-themed tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const rows = payload
      .filter((p) => typeof p.value === "number")
      .map((p, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded"
            style={{ background: p.color }}
          ></span>
          <span className="text-gray-300 text-sm">{p.name}:</span>
          <span className="font-semibold text-white">
            ${p.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ));
    return (
      <div className="bg-gray-900 text-white p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="text-gray-300 text-sm">Time: {label}</p>
        <div className="mt-1 space-y-1">{rows}</div>
      </div>
    );
  };

  return (
    <div className="card p-4 md:p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          {token} Price History
        </h2>
        <div className="text-sm text-gray-300">{data.length} data points</div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> {/* dark grid */}
          <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#D1D5DB" }} stroke="#9CA3AF" />
          <YAxis
            domain={() => {
              if (!data || data.length === 0) return [0, 0];
              let min = Infinity;
              let max = -Infinity;
              for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const vals = [d.chainlink, d.coingecko].filter((v) => typeof v === "number");
                for (const v of vals) {
                  if (v < min) min = v;
                  if (v > max) max = v;
                }
              }
              if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 0];
              const pad = (max - min) * 0.05 || min * 0.01 || 1;
              return [min - pad, max + pad];
            }}
            tick={{ fontSize: 12, fill: "#D1D5DB" }}
            stroke="#9CA3AF"
            tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={24}
            wrapperStyle={{ fontSize: 12, color: "#D1D5DB" }}
          />
          {showChainlink && (
            <Line
              name="Chainlink"
              type="monotone"
              dataKey="chainlink"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
              isAnimationActive={false}
              animationDuration={0}
              connectNulls
            />
          )}
          <Line
            name="CoinGecko"
            type="monotone"
            dataKey="coingecko"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#f59e0b" }}
            isAnimationActive={false}
            animationDuration={0}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
