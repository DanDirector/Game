import { createPlatformData } from '../platforms.js';
import { createPlatformGraph, findClosestNodeOnSurface } from '../ai/platformGraph.js';
import { findPath } from '../ai/pathfinder.js';

const worldWidth = 3200;
const worldHeight = 2400;
const platformHeight = 30;
const boundaryThickness = 100;
const playerWidth = 35;
const playerHeight = 45;
const p1StartX = worldWidth / 4;
const p2StartX = 3 * worldWidth / 4;

const graph = createPlatformGraph(
    createPlatformData({ worldWidth, worldHeight, boundaryThickness, p1StartX, p2StartX, platformHeight })
        .map(platform => ({
            label: platform.label,
            angle: platform.angle,
            position: { x: platform.x, y: platform.y },
            renderData: {
                width: platform.width,
                height: platform.height,
                visible: platform.visible !== false
            }
        })),
    {
        moveSpeed: 5.5,
        jumpStrength: 15,
        accelerationFactor: 0.1,
        decelerationFactor: 0.15,
        playerWidth,
        playerHeight,
        worldWidth,
        worldHeight,
        gravityPerFrame: 0.42
    }
);

function centerNode(surface) {
    return findClosestNodeOnSurface(graph, surface.id, (surface.minX + surface.maxX) / 2);
}

const visibleSurfaces = graph.surfaces.filter(surface => surface.label !== 'platform-ceiling');
const reachabilityFailures = [];
const riskyAirEdges = [];

visibleSurfaces.forEach(fromSurface => {
    visibleSurfaces.forEach(toSurface => {
        if (fromSurface.id === toSurface.id) return;

        const path = findPath(graph, centerNode(fromSurface).id, centerNode(toSurface).id);
        if (!path) {
            reachabilityFailures.push(`${fromSurface.label} -> ${toSurface.label}`);
        }
    });
});

graph.edgesByNodeId.forEach(edges => {
    edges.forEach(edge => {
        if (edge.type === 'walk') return;
        if (edge.landingEdgeMargin >= 28) return;

        const fromNode = graph.nodesById.get(edge.from);
        const toNode = graph.nodesById.get(edge.to);
        riskyAirEdges.push(`${fromNode.surfaceLabel} -> ${toNode.surfaceLabel} (${Math.round(edge.landingEdgeMargin)}px)`);
    });
});

console.log(`Visible surfaces: ${visibleSurfaces.length}`);
console.log(`Graph nodes: ${graph.nodes.length}`);
console.log(`Graph edges: ${[...graph.edgesByNodeId.values()].reduce((total, edges) => total + edges.length, 0)}`);
console.log(`Reachability failures: ${reachabilityFailures.length}`);
if (reachabilityFailures.length > 0) {
    console.log(reachabilityFailures.join('\n'));
}
console.log(`Risky air edges: ${riskyAirEdges.length}`);
if (riskyAirEdges.length > 0) {
    console.log(riskyAirEdges.join('\n'));
}
