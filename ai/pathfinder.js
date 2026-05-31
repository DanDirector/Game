function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function reconstructPath(cameFrom, edgeFrom, currentId, graph) {
    const nodes = [graph.nodesById.get(currentId)];
    const edges = [];

    while (cameFrom.has(currentId)) {
        const edge = edgeFrom.get(currentId);
        edges.unshift(edge);
        currentId = cameFrom.get(currentId);
        nodes.unshift(graph.nodesById.get(currentId));
    }

    return {
        nodes,
        edges,
        cost: edges.reduce((sum, edge) => sum + edge.cost, 0)
    };
}

export function findPath(graph, startNodeId, goalNodeId, options = {}) {
    if (!graph.nodesById.has(startNodeId) || !graph.nodesById.has(goalNodeId)) {
        return null;
    }

    if (startNodeId === goalNodeId) {
        return {
            nodes: [graph.nodesById.get(startNodeId)],
            edges: [],
            cost: 0
        };
    }

    const openSet = new Set([startNodeId]);
    const cameFrom = new Map();
    const edgeFrom = new Map();
    const gScore = new Map([[startNodeId, 0]]);
    const fScore = new Map();
    const goalNode = graph.nodesById.get(goalNodeId);

    fScore.set(startNodeId, distance(graph.nodesById.get(startNodeId), goalNode));

    while (openSet.size > 0) {
        let currentId = null;
        let currentScore = Infinity;

        openSet.forEach(nodeId => {
            const score = fScore.get(nodeId) ?? Infinity;
            if (score < currentScore) {
                currentId = nodeId;
                currentScore = score;
            }
        });

        if (currentId === goalNodeId) {
            return reconstructPath(cameFrom, edgeFrom, currentId, graph);
        }

        openSet.delete(currentId);

        const edges = graph.edgesByNodeId.get(currentId) || [];
        edges.forEach(edge => {
            if (options.isEdgeBlocked && options.isEdgeBlocked(edge)) return;

            const edgePenalty = options.edgePenalty ? options.edgePenalty(edge) : 0;
            const tentativeGScore = (gScore.get(currentId) ?? Infinity) + edge.cost + edgePenalty;
            if (tentativeGScore >= (gScore.get(edge.to) ?? Infinity)) return;

            cameFrom.set(edge.to, currentId);
            edgeFrom.set(edge.to, edge);
            gScore.set(edge.to, tentativeGScore);
            fScore.set(edge.to, tentativeGScore + distance(graph.nodesById.get(edge.to), goalNode));
            openSet.add(edge.to);
        });
    }

    return null;
}
