import React from "react";

export default function FallingCoins({
  count = 20,
  src = "/coin.svg",
  sizeMin = 14,
  sizeMax = 26,
  durationMin = 6,
  durationMax = 11,
}) {
  const coins = React.useMemo(() => {
    const arr = Array.from({ length: count }).map((_, i) => {
      const rand = (a, b) => a + Math.random() * (b - a);
      return {
        id: i,
        x: rand(0, 100),
        delay: -rand(0, durationMax),
        dur: rand(durationMin, durationMax),
        size: rand(sizeMin, sizeMax),
        yStart: -Math.random() * 120 - 40,
      };
    });
    return arr;
  }, [count, durationMax, durationMin, sizeMax, sizeMin]);

  return (
    <div
      className="coin-rain"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {coins.map((c) => (
        <span
          key={c.id}
          className="coin"
          style={{
            "--x": `${c.x}%`,
            "--delay": `${c.delay}s`,
            "--dur": `${c.dur}s`,
            "--size": `${c.size}px`,
            "--yStart": `${c.yStart}px`,
            backgroundImage: `url("${src}")`,
          }}
        />
      ))}
    </div>
  );
}
