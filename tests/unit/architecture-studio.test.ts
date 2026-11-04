import { describe, expect, it } from "vitest";
import { architectureSvg, layoutArchitecture, MAX_ARCHITECTURE_IMPORT_BYTES, parseArchitectureImport } from "@/domain/architecture/studio";
import { templates } from "@/domain/architecture/templates";

describe("architecture studio operations", () => {
  const graph = templates.find(item => item.id === "commerce")!;

  it("lays out connected nodes in deterministic left-to-right layers", () => {
    const arranged = layoutArchitecture(graph);
    expect(arranged.nodes.map(node => node.position)).toEqual(layoutArchitecture(graph).nodes.map(node => node.position));
    const positions = new Map(arranged.nodes.map(node => [node.id, node.position.x]));
    expect(positions.get("client")).toBeLessThan(positions.get("api")!);
    expect(positions.get("api")).toBeLessThan(positions.get("db")!);
    expect(arranged.nodes.every(node => Math.abs(node.position.x) <= 10000 && Math.abs(node.position.y) <= 10000)).toBe(true);
  });

  it("keeps cyclic architectures valid and within supported canvas coordinates", () => {
    const cyclic = { ...graph, edges: [...graph.edges, { id: "loop-edge", source: "worker", target: "api", kind: "https" as const, label: "feedback", requestMultiplier: 1, metadata: { contract: "bounded" } }] };
    const arranged = layoutArchitecture(cyclic);
    expect(arranged.edges).toHaveLength(cyclic.edges.length);
    expect(arranged.nodes.every(node => Math.abs(node.position.x) <= 10000 && Math.abs(node.position.y) <= 10000)).toBe(true);
  });

  it("validates JSON imports and enforces the UTF-8 byte limit", () => {
    expect(parseArchitectureImport(JSON.stringify(graph))).toEqual(graph);
    expect(() => parseArchitectureImport("{" )).toThrow("not valid JSON");
    expect(() => parseArchitectureImport(JSON.stringify({ ...graph, edges: [{ ...graph.edges[0], target: "missing" }] }))).toThrow("does not match a valid HoloStack architecture");
    expect(() => parseArchitectureImport(" ".repeat(MAX_ARCHITECTURE_IMPORT_BYTES + 1))).toThrow("256 KiB");
  });

  it("renders a self-contained SVG and escapes imported text", () => {
    const hostile = { ...graph, name: "<system & diagram>", nodes: graph.nodes.map((node, index) => index ? node : { ...node, label: "<script>alert('x')</script>" }) };
    const { svg, width, height } = architectureSvg(hostile);
    expect(svg).toContain("&lt;system &amp; diagram&gt;");
    expect(svg).toContain("&lt;script&gt;alert(&apos;x&apos;)&lt;/script&gt;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
  });
});
