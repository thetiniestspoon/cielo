import { COLORS } from "./celestial";
import { Z } from "./z";

const ITEMS = [
  { color: COLORS.starGlow, label: "Projects & Apps" },
  { color: COLORS.planetWarm, label: "People" },
  { color: COLORS.cometTrail, label: "Practices" },
  { color: COLORS.firefly, label: "Ideas" },
];

export function Legend() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: Z.CHROME_INFO,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        opacity: 0.45,
        transition: "opacity 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.8";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.45";
      }}
    >
      {ITEMS.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: item.color,
              boxShadow: `0 0 6px ${item.color}66`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: "'Nunito', system-ui, sans-serif",
              color: COLORS.softCream,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
