import React from "react";

type Props = {
  /** Сколько монет одновременно "в небе" */
  count?: number;
  /** Путь к svg/png монетки */
  src?: string;
  /** Минимальный/максимальный размер монет (px) */
  sizeMin?: number;
  sizeMax?: number;
  /** Минимальная/максимальная длительность падения (сек) */
  durationMin?: number;
  durationMax?: number;
};

export default function FallingCoins({
  count = 20,
  src = "/coin.svg",
  sizeMin = 14,
  sizeMax = 26,
  durationMin = 6,
  durationMax = 11,
}: Props) {
  // Генерим стабильные параметры на рендер
  const coins = React.useMemo(() => {
    const arr = Array.from({ length: count }).map((_, i) => {
      const rand = (a: number, b: number) => a + Math.random() * (b - a);
      return {
        id: i,
        // позиция по X в %
        x: rand(0, 100),
        // небольшой отрицательный delay, чтобы "дождь" начинался сразу
        delay: -rand(0, durationMax),
        // длительность падения
        dur: rand(durationMin, durationMax),
        // размер
        size: rand(sizeMin, sizeMax),
        // начальный сдвиг по Y (чуть выше верха контейнера)
        yStart: -Math.random() * 120 - 40,
      };
    });
    return arr;
  }, [count, durationMax, durationMin, sizeMax, sizeMin]);

  return (
    <div
      className="coin-rain"
      aria-hidden="true"
      // Позиционируется относительно родителя (хедера)
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1, // при необходимости подправьте, чтобы было над фоном, но под контентом
      }}
    >
      {coins.map((c) => (
        <span
          key={c.id}
          className="coin"
          style={
            {
              "--x": `${c.x}%`,
              "--delay": `${c.delay}s`,
              "--dur": `${c.dur}s`,
              "--size": `${c.size}px`,
              "--yStart": `${c.yStart}px`,
              // изображение монетки
              backgroundImage: `url("${src}")`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
