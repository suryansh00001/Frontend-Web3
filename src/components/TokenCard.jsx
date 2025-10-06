import React from "react";
import Tilt from "react-parallax-tilt";

const TokenCardBase = ({ name, price, change, isLoading, symbol, refreshing }) => {
  if (isLoading) {
    return (
      <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.04} transitionSpeed={350}>
        <div className="card p-5 md:p-6 flex flex-col items-center">
          <h2 className="font-semibold text-lg md:text-xl mb-3 text-white tracking-tight">{name}</h2>
          <div className="animate-pulse flex flex-col items-center w-full gap-2">
            <div className="h-8 bg-white/10 rounded-lg w-24"></div>
            <div className="h-6 bg-white/10 rounded-lg w-16"></div>
          </div>
        </div>
      </Tilt>
    );
  }

  const formatPrice = (p) => {
    const n = typeof p === "number" ? p : 0;
    return `$${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
<Tilt
  tiltMaxAngleX={10}
  tiltMaxAngleY={10}
  scale={1.04}
  transitionSpeed={350}
  className=" overflow-hidden"
>
  <div
    className={`p-5 md:p-6 flex flex-col items-center cursor-pointer 
                rounded-xl bg-gray-900/40 backdrop-blur-lg 
                border border-white/10 hover:border-blue-400/50
                hover:shadow-lg transition-all duration-300
                ${refreshing ? 'border-white/20' : ''}`}
  >
    <div className="flex items-center gap-2 mb-2 w-full justify-center">
      <h2 className="font-semibold text-lg md:text-xl text-white tracking-tight">{name}</h2>
      <span className="text-xs text-white/80 bg-white/10 border border-white/10 px-2 py-0.5 rounded-xl">{symbol}</span>
    </div>
    <p className="text-2xl md:text-3xl font-bold text-white mb-2">{formatPrice(price)}</p>
    <span
      className={`mt-1 text-sm md:text-base font-medium px-2 py-1 rounded-xl ${
        change >= 0
          ? "text-emerald-300 bg-emerald-900/30 border border-emerald-700/40"
          : "text-red-300 bg-red-900/30 border border-red-700/40"
      }`}
    >
      {change >= 0 ? "↗ +" : "↘ "}
      {Math.abs(change).toFixed(2)}%
    </span>
    <div className="text-xs text-gray-400 mt-1">24h change</div>
  </div>
</Tilt>

  );
};

const TokenCard = React.memo(TokenCardBase, (prev, next) => (
  prev.name === next.name &&
  prev.symbol === next.symbol &&
  prev.isLoading === next.isLoading &&
  prev.refreshing === next.refreshing &&
  prev.price === next.price &&
  prev.change === next.change
));

export default TokenCard;
