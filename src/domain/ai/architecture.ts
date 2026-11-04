import { architectureSchema, type Architecture, type ArchitectureNode } from "@/domain/architecture/schema";
import { layoutArchitecture } from "@/domain/architecture/studio";
import type { ArchitectureChange, GeneratedArchitecture } from "./schema";

export function buildGeneratedArchitecture(input: GeneratedArchitecture, graphId: string, createdAt: string): Architecture {
  const nodes: ArchitectureNode[] = input.nodes.map(node => ({
    id: node.id, type: node.type, label: node.label, description: node.description, technology: node.technology,
    position: { x: 0, y: 0 },
    capacityAssumptions: { maxRps: node.type === "database" ? 800 : node.type === "ai" ? 30 : 1000, replicas: 1, cacheHitRatio: node.type === "cache" ? 0.75 : 0 },
    metadata: { trustBoundary: node.trustBoundary, notes: node.notes },
  }));
  const graph = architectureSchema.parse({
    id: graphId, name: input.name, version: 1, description: input.description, requirements: input.requirements,
    assumptions: [...input.assumptions, "Capacity values are starter assumptions, not benchmark measurements. Edit and validate them against measured workloads."],
    nodes,
    edges: input.edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, kind: edge.kind, label: edge.label, requestMultiplier: 1, metadata: { contract: edge.contract } })),
    createdAt,
  });
  return layoutArchitecture(graph);
}

function makeNode(node: NonNullable<ArchitectureChange["node"]>): ArchitectureNode {
  return {
    id: node.id, type: node.type, label: node.label, description: node.description, technology: node.technology,
    position: { x: 0, y: 0 },
    capacityAssumptions: { maxRps: node.type === "database" ? 800 : node.type === "ai" ? 30 : 1000, replicas: 1, cacheHitRatio: node.type === "cache" ? 0.75 : 0 },
    metadata: { trustBoundary: node.trustBoundary, notes: node.notes },
  };
}

export function applyArchitectureChanges(graph: Architecture, changes: ArchitectureChange[]): Architecture {
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  for (const change of changes) {
    switch (change.operation) {
      case "add_node": {
        if (change.targetId || !change.node || change.edge || nodes.some(node => node.id === change.node!.id)) throw new Error("The proposed component addition is invalid.");
        nodes.push(makeNode(change.node));
        break;
      }
      case "update_node": {
        if (!change.targetId || !change.node || change.edge || change.node.id !== change.targetId) throw new Error("The proposed component update is invalid.");
        const index = nodes.findIndex(node => node.id === change.targetId);
        if (index < 0) throw new Error("The proposal references a component that no longer exists.");
        const current = nodes[index];
        nodes[index] = { ...makeNode(change.node), position: current.position, capacityAssumptions: current.capacityAssumptions };
        break;
      }
      case "remove_node": {
        if (!change.targetId || change.node || change.edge) throw new Error("The proposed component removal is invalid.");
        if (!nodes.some(node => node.id === change.targetId)) throw new Error("The proposal references a component that no longer exists.");
        for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].id === change.targetId) nodes.splice(i, 1);
        for (let i = edges.length - 1; i >= 0; i--) if (edges[i].source === change.targetId || edges[i].target === change.targetId) edges.splice(i, 1);
        break;
      }
      case "add_edge": {
        if (change.targetId || !change.edge || change.node || edges.some(edge => edge.id === change.edge!.id)) throw new Error("The proposed connection addition is invalid.");
        edges.push({ id: change.edge.id, source: change.edge.source, target: change.edge.target, kind: change.edge.kind, label: change.edge.label, requestMultiplier: 1, metadata: { contract: change.edge.contract } });
        break;
      }
      case "remove_edge": {
        if (!change.targetId || change.node || change.edge) throw new Error("The proposed connection removal is invalid.");
        const index = edges.findIndex(edge => edge.id === change.targetId);
        if (index < 0) throw new Error("The proposal references a connection that no longer exists.");
        edges.splice(index, 1);
        break;
      }
    }
  }
  const candidate = architectureSchema.parse({ ...graph, nodes, edges, version: graph.version + 1, createdAt: new Date().toISOString() });
  return layoutArchitecture(candidate);
}

export function architectureDiff(before: Architecture, after: Architecture) {
  const beforeNodes = new Map(before.nodes.map(node => [node.id, node]));
  const afterNodes = new Map(after.nodes.map(node => [node.id, node]));
  const comparableNode = (node: ArchitectureNode) => JSON.stringify({ type: node.type, label: node.label, description: node.description, technology: node.technology, boundary: node.metadata.trustBoundary, notes: node.metadata.notes });
  const addedNodes = after.nodes.filter(node => !beforeNodes.has(node.id));
  const removedNodes = before.nodes.filter(node => !afterNodes.has(node.id));
  const modifiedNodes = after.nodes.filter(node => {
    const previous = beforeNodes.get(node.id);
    return previous && comparableNode(previous) !== comparableNode(node);
  });
  const beforeEdges = new Map(before.edges.map(edge => [edge.id, edge]));
  const afterEdges = new Map(after.edges.map(edge => [edge.id, edge]));
  return {
    addedNodes, removedNodes, modifiedNodes,
    addedEdges: after.edges.filter(edge => !beforeEdges.has(edge.id)),
    removedEdges: before.edges.filter(edge => !afterEdges.has(edge.id)),
  };
}
