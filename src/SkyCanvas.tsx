import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import type { VaultGraph, VaultEdge, Pillar, CelestialType } from "./types";
import {
  COLORS,
  prepareCelestialNode,
  getPillarSectorTarget,
  PILLAR_ORDER,
} from "./celestial";
import { DetailOverlay } from "./DetailOverlay";
import { SearchBar } from "./SearchBar";
import { Legend } from "./Legend";
import { Breadcrumbs } from "./Breadcrumbs";
import { findClusters, type Cluster } from "./horoscope";
import type { ViewMode } from "./useSkySeat";
import { seededOffset, type SkySettings, isMotionReduced } from "./settings";
import { Z } from "./z";

export interface CelestialNode extends SimulationNodeDatum {
  id: string;
  path: string;
  pillar: Pillar;
  tags: string[];
  description: string;
  connectionCount: number;
  celestialType: CelestialType;
  color: string;
  radius: number;
}

interface CelestialLink extends SimulationLinkDatum<CelestialNode> {
  label: string;
  bidirectional: boolean;
}

interface Props {
  graph: VaultGraph;
  view?: ViewMode;
  settings: SkySettings;
  onTogglePin: (nodeId: string) => void;
  // Fires on every zoom/pan event + once on initial restore, so siblings
  // (WeatherLayer, etc.) can mirror the transform and stay aligned.
  onTransformChange?: (t: { x: number; y: number; k: number }) => void;
  // Cortex v2 binding — given a node's title, return its hub type,
  // visibility, and activity/presence axes. Stars modulate size/opacity
  // by presence_weight (Cielo's "fixed life in constellations" = slow
  // axis); person-typed hubs get companion-constellation treatment.
  bindingFor?: (nodeId: string) => {
    type: "project" | "person" | "place" | "artifact" | undefined;
    visibility: "public" | "private" | undefined;
    activity: number;
    presence: number;
  };
}

const ZOOM_KEY = "sky-zoom-v1";

export function SkyCanvas({ graph, view = "stars", settings, onTogglePin, onTransformChange, bindingFor }: Props) {
  const reduceMotion = isMotionReduced(settings);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  // Overlay SVG/group for pinned halos — rendered above WeatherLayer so
  // anchors never vanish under weather cover or view-mode dimming.
  const pinnedSvgRef = useRef<SVGSVGElement | null>(null);
  const gPinnedRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<CelestialNode>> | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<CelestialNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activePillars, setActivePillars] = useState<Set<Pillar>>(new Set(PILLAR_ORDER));
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const nodesRef = useRef<CelestialNode[]>([]);
  const linksRef = useRef<CelestialLink[]>([]);
  const spreadRef = useRef({ cx: 0, cy: 0, spread: 0 });
  const adjacencyRef = useRef<Map<string, Set<string>>>(new Map());
  const hubsRef = useRef<CelestialNode[]>([]);

  // Horoscope clusters — derived once per graph, names are deterministic.
  const clusters = useMemo<Cluster[]>(() => findClusters(graph, 4), [graph]);
  const clustersRef = useRef<Cluster[]>(clusters);
  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  // Starfield opacity driven by view mode — stars never move, only fade.
  const starOpacity = view === "weather" ? 0.15 : view === "both" ? 0.72 : 1;

  const getConnectedIds = useCallback(
    (nodeId: string): Set<string> => {
      const connected = new Set<string>();
      connected.add(nodeId);
      graph.edges.forEach((e) => {
        if (e.source === nodeId) connected.add(e.target);
        if (e.target === nodeId) connected.add(e.source);
      });
      return connected;
    },
    [graph.edges]
  );

  const getNodeEdges = useCallback(
    (nodeId: string): VaultEdge[] => {
      return graph.edges.filter(
        (e) => e.source === nodeId || e.target === nodeId
      );
    },
    [graph.edges]
  );

  // Zoom to a specific node with smooth animation
  const zoomToNode = useCallback((nodeId: string, andSelect = true) => {
    const svg = svgRef.current;
    const zoomB = zoomBehaviorRef.current;
    const target = nodesRef.current.find((n) => n.id === nodeId);
    if (!svg || !zoomB || !target || target.x == null || target.y == null) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = 1.8;
    const tx = width / 2 - target.x * scale;
    const ty = height / 2 - target.y * scale;

    select(svg)
      .transition()
      .duration(600)
      .call(
        zoomB.transform as any,
        zoomIdentity.translate(tx, ty).scale(scale)
      );

    if (andSelect) {
      // Slight delay so the transition starts before overlay appears
      setTimeout(() => {
        selectNode(target);
      }, 150);
    }
  }, []);

  // Select a node and push to history
  const selectNode = useCallback((node: CelestialNode | null) => {
    setSelectedNode(node);
    if (node) {
      setNavigationHistory((prev) => {
        // Don't duplicate if re-selecting the same node
        if (prev[prev.length - 1] === node.id) return prev;
        const next = [...prev, node.id];
        // Keep max 12 entries
        return next.length > 12 ? next.slice(-12) : next;
      });
    }
  }, []);

  // Go back in history
  const handleBack = useCallback(() => {
    setNavigationHistory((prev) => {
      if (prev.length <= 1) {
        setSelectedNode(null);
        return [];
      }
      const next = prev.slice(0, -1);
      const prevNodeId = next[next.length - 1];
      const prevNode = nodesRef.current.find((n) => n.id === prevNodeId);
      if (prevNode) {
        setSelectedNode(prevNode);
        zoomToNode(prevNode.id, false);
      }
      return next;
    });
  }, [zoomToNode]);

  // Navigate to a node from overlay or breadcrumb
  const handleNavigate = useCallback((nodeId: string) => {
    const target = nodesRef.current.find((n) => n.id === nodeId);
    if (target) {
      zoomToNode(nodeId, true);
    }
  }, [zoomToNode]);

  // Navigate from breadcrumb (replace history up to that point)
  const handleBreadcrumbNavigate = useCallback((nodeId: string) => {
    setNavigationHistory((prev) => {
      const idx = prev.lastIndexOf(nodeId);
      if (idx >= 0) {
        return prev.slice(0, idx + 1);
      }
      return prev;
    });
    const target = nodesRef.current.find((n) => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
      zoomToNode(nodeId, false);
    }
  }, [zoomToNode]);

  // Initialize simulation
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const cx = width / 2;
    const cy = height / 2;
    const spread = Math.min(width, height) * 0.3;
    spreadRef.current = { cx, cy, spread };

    // Prepare nodes — seeded initial positions so the map is in the
    // same place every session (spatial memory stability).
    const nodes: CelestialNode[] = graph.nodes.map((n) => {
      const prepared = prepareCelestialNode(n);
      const target = getPillarSectorTarget(n.pillar as Pillar, cx, cy, spread);
      return {
        ...prepared,
        x: target.x + seededOffset(n.id, "x") * spread * 0.3,
        y: target.y + seededOffset(n.id, "y") * spread * 0.3,
      } as CelestialNode;
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: CelestialLink[] = graph.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        label: e.label,
        bidirectional: e.bidirectional,
      }));

    nodesRef.current = nodes;
    linksRef.current = links;

    // Adjacency + hubs for orbital force.
    const adjacency = new Map<string, Set<string>>();
    for (const n of nodes) adjacency.set(n.id, new Set());
    for (const l of links) {
      const s = (l.source as CelestialNode).id;
      const t = (l.target as CelestialNode).id;
      adjacency.get(s)!.add(t);
      adjacency.get(t)!.add(s);
    }
    adjacencyRef.current = adjacency;
    const hubs = nodes.filter((n) => n.connectionCount >= 5);
    hubsRef.current = hubs;

    // Custom orbital force: gentle tangential nudge for hub neighbors so clusters drift.
    // Disabled entirely when reduce-motion is on.
    const orbitalForce = (alpha: number) => {
      if (reduceMotion) return;
      const strength = 0.035;
      for (const hub of hubsRef.current) {
        if (hub.x == null || hub.y == null) continue;
        const neighbors = adjacencyRef.current.get(hub.id);
        if (!neighbors) continue;
        for (const nId of neighbors) {
          const n = nodeMap.get(nId);
          if (!n || n.x == null || n.y == null) continue;
          const dx = n.x - hub.x;
          const dy = n.y - hub.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // Tangent direction perpendicular to radius vector.
          const tx = -dy / dist;
          const ty = dx / dist;
          n.vx = (n.vx ?? 0) + tx * strength * alpha;
          n.vy = (n.vy ?? 0) + ty * strength * alpha;
        }
      }
    };

    const simulation = forceSimulation<CelestialNode>(nodes)
      .force(
        "link",
        forceLink<CelestialNode, CelestialLink>(links)
          .id((d) => d.id)
          // Bidirectional edges = rigid backbone (shorter, stiffer).
          .distance((l) => (l.bidirectional ? 55 : 85))
          .strength((l) => (l.bidirectional ? 0.85 : 0.3))
      )
      .force("charge", forceManyBody<CelestialNode>().strength(-120).distanceMax(400))
      .force("collide", forceCollide<CelestialNode>().radius((d) => d.radius + 2))
      .force(
        "pillarX",
        forceX<CelestialNode>()
          .x((d) => getPillarSectorTarget(d.pillar, cx, cy, spread).x)
          .strength(0.08)
      )
      .force(
        "pillarY",
        forceY<CelestialNode>()
          .y((d) => getPillarSectorTarget(d.pillar, cx, cy, spread).y)
          .strength(0.08)
      )
      .force("orbital", orbitalForce)
      .alphaDecay(0.02)
      .on("tick", () => {
        renderFrameRef.current();
      });

    // When reduce-motion is on, let the sim settle and then hold position.
    // Otherwise keep a gentle drift indefinitely.
    if (reduceMotion) {
      simulation.alphaMin(0.05);
    } else {
      simulation.alphaMin(0.01);
    }

    simulationRef.current = simulation;

    // Set up zoom — persist last transform so the user returns to the
    // same frame they left.
    const svgSelection = select(svg);
    const g = select(gRef.current!);

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Keep the pinned-halo overlay in lockstep with the main graph.
        if (gPinnedRef.current) {
          select(gPinnedRef.current).attr("transform", event.transform);
        }
        onTransformChange?.({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        });
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
          try {
            localStorage.setItem(
              ZOOM_KEY,
              JSON.stringify({ x: event.transform.x, y: event.transform.y, k: event.transform.k })
            );
          } catch {
            // ignore
          }
        }, 250);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svgSelection.call(zoomBehavior);

    // Restore last transform if saved.
    let startTransform = zoomIdentity.translate(0, 0).scale(1);
    try {
      const raw = localStorage.getItem(ZOOM_KEY);
      if (raw) {
        const t = JSON.parse(raw) as { x: number; y: number; k: number };
        startTransform = zoomIdentity.translate(t.x, t.y).scale(t.k);
      }
    } catch {
      // ignore
    }
    svgSelection.call(zoomBehavior.transform, startTransform);

    // Pause the simulation when the tab is hidden — saves CPU on
    // laptops without changing any user-visible state.
    const onVisibility = () => {
      if (document.hidden) {
        simulation.stop();
      } else {
        simulation.alpha(Math.max(simulation.alpha(), 0.08)).restart();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      simulation.stop();
      if (persistTimer) clearTimeout(persistTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [graph, reduceMotion]);

  // Render function
  const pinnedSet = useMemo(() => new Set(settings.pinnedNodes), [settings.pinnedNodes]);
  const renderFrameRef = useRef<() => void>(() => {});
  const renderFrame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;

    const allNodes = nodesRef.current;
    const allLinks = linksRef.current;
    const hovered = hoveredNode;
    const connectedIds = hovered ? getConnectedIds(hovered) : null;
    const { cx, cy, spread } = spreadRef.current;

    // Filter by active pillars — but pinned nodes bypass the filter so
    // the user's anchors never vanish.
    const nodes = allNodes.filter((n) => activePillars.has(n.pillar) || pinnedSet.has(n.id));
    const links = allLinks.filter((d) => {
      const s = d.source as CelestialNode;
      const t = d.target as CelestialNode;
      const sOk = activePillars.has(s.pillar) || pinnedSet.has(s.id);
      const tOk = activePillars.has(t.pillar) || pinnedSet.has(t.id);
      return sOk && tOk;
    });

    const gSel = select(g);

    // Bounded universe — a faint rim near the sector horizon so the
    // canvas reads as finite, not infinite.
    const rimGroup = gSel.selectAll<SVGGElement, null>(".rim").data([null]);
    const rimEnter = rimGroup.enter().append("g").attr("class", "rim");
    const rimContainer = rimEnter.merge(rimGroup);
    const rimCircle = rimContainer.selectAll<SVGCircleElement, null>("circle").data(
      settings.boundedUniverse ? [null] : []
    );
    rimCircle.exit().remove();
    rimCircle
      .enter()
      .append("circle")
      .merge(rimCircle)
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", spread * 1.9)
      .attr("fill", "none")
      .attr("stroke", COLORS.warmStone)
      .attr("stroke-opacity", 0.14)
      .attr("stroke-width", 1.25)
      .attr("stroke-dasharray", "1,6");

    // Pinned halos render in the sibling overlay SVG so they stay at
    // full opacity regardless of view mode and sit above WeatherLayer.
    const pinnedG = gPinnedRef.current ? select(gPinnedRef.current) : null;
    if (pinnedG) {
      // Gap 3 — type:person hubs auto-halo as companion constellations.
      // They're the "fixed stars" of the user's relational life and are
      // visibility:private, so only embedded (authed) Cielo ever sees
      // them; gap 6 filters them out of the standalone view upstream.
      const pinnedNodes = nodes.filter(
        (n) => pinnedSet.has(n.id) || (bindingFor?.(n.id).type === "person"),
      );
      const halos = pinnedG
        .selectAll<SVGCircleElement, CelestialNode>("circle")
        .data(pinnedNodes, (d: CelestialNode) => d.id);
      halos.exit().remove();
      // Gap 4 — halo color by hub type. project=sage (default),
      // person=warm planet tone (family/companions), place=warmStone,
      // artifact=softCream. Cortex v2 type field drives it.
      const haloColorFor = (nodeId: string): string => {
        const t = bindingFor ? bindingFor(nodeId).type : undefined;
        if (t === "person") return COLORS.planetWarm;
        if (t === "place") return COLORS.warmStone;
        if (t === "artifact") return COLORS.softCream;
        return COLORS.sageGreen;
      };
      halos
        .enter()
        .append("circle")
        .merge(halos)
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0)
        .attr("r", (d) => d.radius + 8)
        .attr("fill", "none")
        .attr("stroke", (d) => haloColorFor(d.id))
        .attr("stroke-opacity", 0.85)
        .attr("stroke-width", 1.5);
    }

    // Pillar sector labels (faint watermarks)
    const pillarLabelGroup = gSel.selectAll<SVGGElement, null>(".pillar-labels").data([null]);
    const pillarLabelGroupEnter = pillarLabelGroup.enter().append("g").attr("class", "pillar-labels");
    const pillarLabelContainer = pillarLabelGroupEnter.merge(pillarLabelGroup);

    const pillarLabels = pillarLabelContainer
      .selectAll<SVGTextElement, Pillar>("text")
      .data(PILLAR_ORDER, (d: Pillar) => d);

    pillarLabels.exit().remove();

    pillarLabels.enter()
      .append("text")
      .merge(pillarLabels)
      .attr("x", (d) => getPillarSectorTarget(d, cx, cy, spread).x)
      .attr("y", (d) => getPillarSectorTarget(d, cx, cy, spread).y - spread * 0.35)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.softCream)
      .attr("fill-opacity", (d) => activePillars.has(d) ? 0.12 : 0.04)
      .attr("font-size", "22px")
      .attr("font-family", "'Fraunces', Georgia, serif")
      .attr("font-weight", "400")
      .style("pointer-events", "none")
      .text((d) => d.charAt(0).toUpperCase() + d.slice(1));

    // Edges
    const edgeGroup = gSel.selectAll<SVGGElement, null>(".edges").data([null]);
    const edgeGroupEnter = edgeGroup.enter().append("g").attr("class", "edges");
    const edgeContainer = edgeGroupEnter.merge(edgeGroup);

    const edgeLines = edgeContainer
      .selectAll<SVGLineElement, CelestialLink>("line")
      .data(links, (d: CelestialLink) => `${(d.source as CelestialNode).id}-${(d.target as CelestialNode).id}`);

    edgeLines.exit().remove();

    edgeLines.enter().append("line")
      .merge(edgeLines)
      .attr("x1", (d) => (d.source as CelestialNode).x!)
      .attr("y1", (d) => (d.source as CelestialNode).y!)
      .attr("x2", (d) => (d.target as CelestialNode).x!)
      .attr("y2", (d) => (d.target as CelestialNode).y!)
      .attr("stroke", COLORS.constellationLine)
      // Bidirectional = rigid backbone line (slightly thicker, brighter).
      .attr("stroke-width", (d) => (d.bidirectional ? 1.1 : 0.5))
      .attr("stroke-opacity", (d) => {
        const base = d.bidirectional ? 0.28 : 0.15;
        if (!connectedIds) return base;
        const sId = (d.source as CelestialNode).id;
        const tId = (d.target as CelestialNode).id;
        return connectedIds.has(sId) && connectedIds.has(tId) ? (d.bidirectional ? 0.75 : 0.6) : 0.04;
      });

    // Nodes
    const nodeGroup = gSel.selectAll<SVGGElement, null>(".nodes").data([null]);
    const nodeGroupEnter = nodeGroup.enter().append("g").attr("class", "nodes");
    const nodeContainer = nodeGroupEnter.merge(nodeGroup);

    const nodeCircles = nodeContainer
      .selectAll<SVGCircleElement, CelestialNode>("circle")
      .data(nodes, (d: CelestialNode) => d.id);

    nodeCircles.exit().remove();

    nodeCircles.enter().append("circle")
      .merge(nodeCircles)
      .attr("cx", (d) => d.x!)
      .attr("cy", (d) => d.y!)
      // Radius scales gently by Cortex presence_weight — slow-axis
      // hubs (anchor people, long-sustained projects) render a bit
      // brighter/bigger. Multiplier 1.0 → 1.4 for presence 0 → 1.
      .attr("r", (d) => {
        const p = bindingFor ? bindingFor(d.id).presence : 0;
        return d.radius * (1 + 0.4 * p);
      })
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", (d) => {
        const p = bindingFor ? bindingFor(d.id).presence : 0;
        const boost = 1 + 0.15 * p; // +15% at full presence, subtle lift
        const base = connectedIds
          ? (connectedIds.has(d.id) ? 1 : 0.1)
          : (d.celestialType === "firefly" ? 0.5 : 0.8);
        return Math.min(1, base * boost);
      })
      .attr("stroke", (d) => d.celestialType === "planet" ? COLORS.warmStone : "none")
      .attr("stroke-width", (d) => (d.celestialType === "planet" ? 1.5 : 0))
      .attr("stroke-opacity", 0.4)
      .attr("filter", (d) => d.celestialType === "firefly" ? "none" : `url(#glow-${d.celestialType})`)
      .style("cursor", "pointer");

    // Labels (only for larger nodes)
    const labelGroup = gSel.selectAll<SVGGElement, null>(".labels").data([null]);
    const labelGroupEnter = labelGroup.enter().append("g").attr("class", "labels");
    const labelContainer = labelGroupEnter.merge(labelGroup);

    const labelsData = nodes.filter((n) => n.connectionCount >= 3 || n.celestialType === "planet");

    const labels = labelContainer
      .selectAll<SVGTextElement, CelestialNode>("text")
      .data(labelsData, (d: CelestialNode) => d.id);

    labels.exit().remove();

    labels.enter().append("text")
      .merge(labels)
      .attr("x", (d) => d.x!)
      .attr("y", (d) => d.y! + d.radius + 12)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.softCream)
      .attr("font-size", "10px")
      .attr("font-family", "'Nunito', system-ui, sans-serif")
      .attr("fill-opacity", (d) => {
        if (!connectedIds) return 0.6;
        return connectedIds.has(d.id) ? 1 : 0.08;
      })
      .style("pointer-events", "none")
      .text((d) => d.id.length > 20 ? d.id.slice(0, 18) + "\u2026" : d.id);

    // Horoscope cluster names at centroids.
    const clusterGroup = gSel.selectAll<SVGGElement, null>(".clusters").data([null]);
    const clusterGroupEnter = clusterGroup.enter().append("g").attr("class", "clusters");
    const clusterContainer = clusterGroupEnter.merge(clusterGroup);

    const clusterData = clustersRef.current.map((c) => {
      let sx = 0, sy = 0, count = 0;
      for (const id of c.nodeIds) {
        const n = allNodes.find((nn) => nn.id === id);
        if (n && n.x != null && n.y != null && activePillars.has(n.pillar)) {
          sx += n.x; sy += n.y; count++;
        }
      }
      return count ? { ...c, cx: sx / count, cy: sy / count, count } : null;
    }).filter((c): c is Cluster & { count: number } => c !== null && c.count >= 3);

    const clusterLabels = clusterContainer
      .selectAll<SVGTextElement, Cluster & { count: number }>("text")
      .data(clusterData, (d) => d.id);

    clusterLabels.exit().remove();

    clusterLabels.enter().append("text")
      .merge(clusterLabels)
      .attr("x", (d) => d.cx)
      .attr("y", (d) => d.cy)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.warmStone)
      .attr("fill-opacity", 0.42)
      .attr("font-size", "15px")
      .attr("font-family", "'Fraunces', Georgia, serif")
      .attr("font-style", "italic")
      .attr("letter-spacing", "0.5")
      .style("pointer-events", "none")
      .text((d) => d.name);

    // Info halos — node count subtitle under each cluster name.
    const clusterInfoGroup = gSel.selectAll<SVGGElement, null>(".cluster-info").data([null]);
    const clusterInfoEnter = clusterInfoGroup.enter().append("g").attr("class", "cluster-info");
    const clusterInfoContainer = clusterInfoEnter.merge(clusterInfoGroup);

    const clusterInfoData = settings.showInfoHalos ? clusterData : [];
    const clusterInfos = clusterInfoContainer
      .selectAll<SVGTextElement, Cluster & { count: number }>("text")
      .data(clusterInfoData, (d) => d.id);

    clusterInfos.exit().remove();

    clusterInfos.enter().append("text")
      .merge(clusterInfos)
      .attr("x", (d) => d.cx)
      .attr("y", (d) => d.cy + 16)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.warmStone)
      .attr("fill-opacity", 0.28)
      .attr("font-size", "10px")
      .attr("font-family", "'Nunito', system-ui, sans-serif")
      .attr("letter-spacing", "1px")
      .style("pointer-events", "none")
      .text((d) => `${d.count} · ${d.pillar}`);
  }, [hoveredNode, activePillars, getConnectedIds, pinnedSet, settings.boundedUniverse, settings.showInfoHalos]);

  // Keep the ref pointed at the latest renderFrame so the sim tick
  // handler (which captured the first closure) always calls the fresh one.
  useEffect(() => {
    renderFrameRef.current = renderFrame;
    renderFrame();
  }, [hoveredNode, activePillars, renderFrame, pinnedSet, settings.boundedUniverse, settings.showInfoHalos]);

  // Hit-test helper
  const hitTest = useCallback((clientX: number, clientY: number): CelestialNode | null => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return null;

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    const ctm = (g as SVGGElement).getScreenCTM();
    if (!ctm) return null;
    const transformed = point.matrixTransform(ctm.inverse());

    let closest: CelestialNode | null = null;
    let closestDist = Infinity;

    for (const node of nodesRef.current) {
      const dx = (node.x ?? 0) - transformed.x;
      const dy = (node.y ?? 0) - transformed.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < node.radius + 5 && dist < closestDist) {
        closest = node;
        closestDist = dist;
      }
    }
    return closest;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const node = hitTest(e.clientX, e.clientY);
      setHoveredNode(node?.id ?? null);
    },
    [hitTest]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const node = hitTest(e.clientX, e.clientY);
      if (node) {
        selectNode(node);
      } else {
        setSelectedNode(null);
        setNavigationHistory([]);
      }
    },
    [hitTest, selectNode]
  );

  const togglePillar = useCallback((pillar: Pillar) => {
    setActivePillars((prev) => {
      const next = new Set(prev);
      if (next.has(pillar)) {
        if (next.size > 1) next.delete(pillar);
      } else {
        next.add(pillar);
      }
      return next;
    });
  }, []);

  // activePillars filtering is handled in renderFrame — no position mutation needed

  // Keyboard: Escape closes overlay, / opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNode(null);
        setNavigationHistory([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: COLORS.deepSky }}>
      {/* Pillar filter toggles */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          display: "flex",
          gap: 8,
          zIndex: Z.CHROME_INFO,
        }}
      >
        {PILLAR_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => togglePillar(p)}
            style={{
              background: activePillars.has(p) ? "rgba(240,234,214,0.15)" : "rgba(240,234,214,0.04)",
              border: `1px solid ${activePillars.has(p) ? COLORS.warmStone : "rgba(240,234,214,0.1)"}`,
              color: activePillars.has(p) ? COLORS.softCream : "rgba(240,234,214,0.3)",
              borderRadius: 20,
              padding: "4px 14px",
              fontSize: 12,
              fontFamily: "'Nunito', system-ui, sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              textTransform: "capitalize",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <SearchBar
        nodes={nodesRef.current}
        onSelect={(nodeId) => {
          zoomToNode(nodeId);
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: Z.CHROME_INFO,
          color: COLORS.warmStone,
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 14,
          opacity: 0.5,
        }}
      >
        PersonalOS
      </div>

      {/* Legend */}
      <Legend />

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          display: "block",
          opacity: starOpacity,
          transition: "opacity 500ms ease",
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <defs>
          <filter id="glow-star" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-planet" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-comet" x="-100%" y="-50%" width="300%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g ref={gRef} />
      </svg>

      {/* Pinned-halo overlay — sits above WeatherLayer, ignores view-mode
          dimming. Transform stays in lockstep via the zoom handler. */}
      <svg
        ref={pinnedSvgRef}
        width="100%"
        height="100%"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: Z.PINNED,
        }}
        aria-hidden="true"
      >
        <g ref={gPinnedRef} />
      </svg>

      {/* Breadcrumbs */}
      {navigationHistory.length > 0 && (
        <Breadcrumbs
          history={navigationHistory}
          nodes={nodesRef.current}
          onNavigate={handleBreadcrumbNavigate}
          selectedId={selectedNode?.id ?? null}
        />
      )}

      {/* Detail overlay */}
      {selectedNode && (
        <DetailOverlay
          node={selectedNode}
          edges={getNodeEdges(selectedNode.id)}
          pinned={pinnedSet.has(selectedNode.id)}
          onTogglePin={() => onTogglePin(selectedNode.id)}
          autoDismissMs={settings.autoDismissMs}
          onClose={() => {
            setSelectedNode(null);
            setNavigationHistory([]);
          }}
          onNavigate={handleNavigate}
          onBack={navigationHistory.length > 1 ? handleBack : undefined}
        />
      )}
    </div>
  );
}
