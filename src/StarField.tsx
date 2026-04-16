import { useMemo } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  delay: number;
}

export function StarField() {
  const stars = useMemo(() => {
    const result: Star[] = [];
    for (let i = 0; i < 300; i++) {
      result.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.4 + 0.1,
        delay: Math.random() * 8,
      });
    }
    return result;
  }, []);

  return (
    <svg
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#f0ead6"
          opacity={s.opacity}
          style={{
            animation: `twinkle ${4 + Math.random() * 4}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}
