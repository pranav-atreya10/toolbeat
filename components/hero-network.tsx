"use client";

/**
 * Background animation behind the hero: a faint network of servers.
 *
 * - Dots are servers, thin lines are connections.
 * - Small pulses travel along some lines (requests going out).
 * - Now and then a server glows green (healthy), and once in a while one
 *   glows orange-red (broken) — the thing Toolbeat catches.
 *
 * It's purely decorative: hidden from screen readers, can't be clicked,
 * pauses when off-screen or when the tab is hidden, and shows a still
 * network (no moving parts) when the visitor prefers reduced motion.
 */
import { useEffect, useRef } from "react";

const W = 1440;
const H = 760;

/** Small seeded random generator, so the server and browser draw the same network. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Lay out servers on a loose grid, nudged randomly so it looks natural. */
function buildNetwork() {
  const rand = seeded(7);
  const cols = 9;
  const rows = 5;
  const nodes: { x: number; y: number; r: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Skip a few spots so it doesn't look like a perfect grid.
      if (rand() < 0.18) continue;
      nodes.push({
        x: Math.round(((col + 0.5) / cols) * W + (rand() - 0.5) * 120),
        y: Math.round(((row + 0.5) / rows) * H + (rand() - 0.5) * 100),
        r: rand() < 0.25 ? 3.5 : 2.5,
      });
    }
  }

  // Connect each server to its two nearest neighbours.
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => {
    nodes
      .map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach(({ j }) => {
        const k = key(i, j);
        if (!seen.has(k)) {
          seen.add(k);
          edges.push([i, j]);
        }
      });
  });

  // Pick some connections to carry pulses, spread across the network.
  const pulses = edges
    .map((e, i) => ({ e, i }))
    .filter(({ i }) => i % 4 === 1)
    .map(({ e }, n) => ({
      from: e[n % 2],
      to: e[(n + 1) % 2],
      dur: 2.6 + (n % 4) * 0.7,
      begin: (n * 0.9) % 6,
      healthy: n % 3 === 0,
    }));

  // A few servers that light up green, and one that flashes as broken.
  const glows = [3, 11, 19, 27, 34].filter((i) => i < nodes.length);
  const broken = nodes.length > 23 ? 23 : nodes.length - 1;

  return { nodes, edges, pulses, glows, broken };
}

const NET = buildNetwork();

export function HeroNetwork() {
  const ref = useRef<HTMLDivElement>(null);

  // Pause everything when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const el = ref.current;
    const svg = el?.querySelector("svg");
    if (!el || !svg) return;
    let onScreen = true;
    const apply = () => {
      const run = onScreen && !document.hidden;
      el.dataset.paused = run ? "false" : "true";
      if (run) svg.unpauseAnimations();
      else svg.pauseAnimations();
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      apply();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  const { nodes, edges, pulses, glows, broken } = NET;

  return (
    <div ref={ref} aria-hidden="true" className="hero-network pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {/* Connections */}
        <g stroke="var(--ink)" strokeOpacity="0.07" strokeWidth="1">
          {edges.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
          ))}
        </g>

        {/* Healthy servers glowing green, and one broken server */}
        <g>
          {glows.map((i, n) => (
            <circle
              key={`glow-${i}`}
              className="net-glow"
              cx={nodes[i].x}
              cy={nodes[i].y}
              r="10"
              fill="var(--signal)"
              style={{ animationDelay: `${n * 1.7}s`, transformOrigin: `${nodes[i].x}px ${nodes[i].y}px` }}
            />
          ))}
          <circle
            className="net-broken"
            cx={nodes[broken].x}
            cy={nodes[broken].y}
            r="10"
            fill="var(--fail)"
            style={{ transformOrigin: `${nodes[broken].x}px ${nodes[broken].y}px` }}
          />
        </g>

        {/* Servers */}
        <g fill="var(--ink)" fillOpacity="0.16">
          {nodes.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r} />
          ))}
        </g>

        {/* Pulses travelling along connections */}
        <g className="net-pulses">
          {pulses.map((p, i) => {
            const a = nodes[p.from];
            const b = nodes[p.to];
            return (
              <circle key={i} r="3" fill={p.healthy ? "var(--signal)" : "var(--ink)"} opacity="0">
                <animateMotion
                  dur={`${p.dur}s`}
                  begin={`${p.begin}s`}
                  repeatCount="indefinite"
                  path={`M${a.x},${a.y} L${b.x},${b.y}`}
                  keyPoints="0;1"
                  keyTimes="0;1"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1"
                />
                <animate
                  attributeName="opacity"
                  dur={`${p.dur}s`}
                  begin={`${p.begin}s`}
                  repeatCount="indefinite"
                  values={p.healthy ? "0;0.7;0.7;0" : "0;0.4;0.4;0"}
                  keyTimes="0;0.2;0.8;1"
                />
              </circle>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
