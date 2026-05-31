const NODE_RATIOS = [0.025, 0.06, 0.22, 0.5, 0.78, 0.94, 0.975];
const EDGE_NODE_THRESHOLD = 0.12;
const FRAME_MS = 1000 / 60;
const SIMULATION_FRAMES = 130;
const DEFAULT_GRAVITY_PER_FRAME = 0.36;
const SURFACE_MARGIN = 34;
const LANDING_EDGE_PADDING = 0.9;
const MIN_LANDING_EDGE_MARGIN = 24;
const COMFORTABLE_LANDING_MARGIN = 80;
const RISKY_LANDING_PENALTY = 55;
const MAX_NODE_SPACING = 150;
const AIR_TARGET_X_MARGIN = 260;
const AIR_TARGET_MAX_BELOW = 900;
const AIR_TARGET_MAX_ABOVE = 120;

function transformPoint(body, localX, localY) {
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);

    return {
        x: body.position.x + localX * cos - localY * sin,
        y: body.position.y + localX * sin + localY * cos
    };
}

function pointAtRatio(start, end, ratio) {
    return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
    };
}

function interpolateY(start, end, x) {
    const dx = end.x - start.x;
    if (Math.abs(dx) < 0.001) return Math.min(start.y, end.y);
    const ratio = (x - start.x) / dx;
    return start.y + (end.y - start.y) * ratio;
}

function createSurface(platformBody, index) {
    const renderData = platformBody.renderData;
    if (!renderData || renderData.visible === false) return null;
    if (!platformBody.label.startsWith('platform-')) return null;

    const halfWidth = renderData.width / 2;
    const halfHeight = renderData.height / 2;
    const topA = transformPoint(platformBody, -halfWidth, -halfHeight);
    const topB = transformPoint(platformBody, halfWidth, -halfHeight);
    const bottomA = transformPoint(platformBody, -halfWidth, halfHeight);
    const bottomB = transformPoint(platformBody, halfWidth, halfHeight);
    const [leftTop, rightTop] = topA.x <= topB.x ? [topA, topB] : [topB, topA];
    const [leftBottom, rightBottom] = bottomA.x <= bottomB.x ? [bottomA, bottomB] : [bottomB, bottomA];
    const minX = Math.min(leftTop.x, rightTop.x);
    const maxX = Math.max(leftTop.x, rightTop.x);

    return {
        id: `${platformBody.label}:${index}`,
        label: platformBody.label,
        body: platformBody,
        width: renderData.width,
        height: renderData.height,
        minX,
        maxX,
        leftTop,
        rightTop,
        leftBottom,
        rightBottom,
        yAt(x) {
            return interpolateY(leftTop, rightTop, x);
        },
        bottomYAt(x) {
            return interpolateY(leftBottom, rightBottom, x);
        },
        containsX(x, margin = 0) {
            return x >= minX - margin && x <= maxX + margin;
        }
    };
}

function getNodeRatios(surface) {
    const ratios = new Set(NODE_RATIOS);
    const segmentCount = Math.max(1, Math.ceil(surface.width / MAX_NODE_SPACING));

    for (let index = 0; index <= segmentCount; index += 1) {
        const rawRatio = index / segmentCount;
        const ratio = Math.max(NODE_RATIOS[0], Math.min(NODE_RATIOS[NODE_RATIOS.length - 1], rawRatio));
        ratios.add(Number(ratio.toFixed(3)));
    }

    return [...ratios].sort((a, b) => a - b);
}

function createNodesForSurface(surface, playerHeight) {
    return getNodeRatios(surface).map((ratio, index) => {
        const foot = pointAtRatio(surface.leftTop, surface.rightTop, ratio);

        return {
            id: `${surface.id}:node:${index}`,
            surfaceId: surface.id,
            surfaceLabel: surface.label,
            ratio,
            x: foot.x,
            y: foot.y - playerHeight / 2,
            footY: foot.y,
            isLeftEdge: ratio <= EDGE_NODE_THRESHOLD,
            isRightEdge: ratio >= 1 - EDGE_NODE_THRESHOLD
        };
    });
}

function addEdge(graph, edge) {
    if (!graph.edgesByNodeId.has(edge.from)) {
        graph.edgesByNodeId.set(edge.from, []);
    }

    const edges = graph.edgesByNodeId.get(edge.from);
    const duplicateIndex = edges.findIndex(existing =>
        existing.to === edge.to &&
        existing.type === edge.type &&
        existing.direction === edge.direction
    );

    if (duplicateIndex >= 0) {
        if (edge.cost < edges[duplicateIndex].cost) {
            edges[duplicateIndex] = edge;
        }
        return;
    }

    edges.push(edge);
}

function addWalkEdges(graph, surface, config) {
    const nodes = graph.nodesBySurfaceId.get(surface.id);
    const walkSpeed = Math.max(1, config.moveSpeed);

    for (let index = 0; index < nodes.length - 1; index += 1) {
        const from = nodes[index];
        const to = nodes[index + 1];
        const cost = Math.abs(to.x - from.x) / walkSpeed * FRAME_MS;

        addEdge(graph, {
            from: from.id,
            to: to.id,
            type: 'walk',
            cost,
            targetX: to.x,
            targetSurfaceId: to.surfaceId
        });
        addEdge(graph, {
            from: to.id,
            to: from.id,
            type: 'walk',
            cost,
            targetX: from.x,
            targetSurfaceId: from.surfaceId
        });
    }
}

function findLandingSurface(surfaces, sourceSurfaceId, state, previousFootY, config) {
    if (state.vy < 0) return null;

    let best = null;
    surfaces.forEach(surface => {
        const safeInset = Math.min(
            Math.max(MIN_LANDING_EDGE_MARGIN, config.playerWidth * LANDING_EDGE_PADDING),
            Math.max(0, surface.width / 2 - 8)
        );
        if (!surface.containsX(state.x, -safeInset)) return;

        const topY = surface.yAt(state.x);
        if (previousFootY <= topY && state.footY >= topY) {
            if (surface.id === sourceSurfaceId && state.frame < 18) return;
            const edgeMargin = Math.min(state.x - surface.minX, surface.maxX - state.x);
            if (!best || topY < best.topY) {
                best = { surface, topY, edgeMargin };
            }
        }
    });

    if (!best) return null;

    return {
        surface: best.surface,
        x: state.x,
        y: best.topY - config.playerHeight / 2,
        footY: best.topY,
        edgeMargin: best.edgeMargin,
        frames: state.frame
    };
}

function resolveHeadCollision(surfaces, sourceSurfaceId, state, previousHeadY, config) {
    if (state.vy >= 0) return;

    for (const surface of surfaces) {
        if (surface.id === sourceSurfaceId) continue;
        if (!surface.containsX(state.x, config.playerWidth / 2)) continue;

        const bottomY = surface.bottomYAt(state.x);
        if (previousHeadY >= bottomY && state.headY <= bottomY) {
            state.y = bottomY + config.playerHeight / 2;
            state.vy = 0;
            state.headY = bottomY;
            state.footY = state.y + config.playerHeight / 2;
            return;
        }
    }
}

function simulateTransition(startNode, surfaces, action, config) {
    const gravity = config.gravityPerFrame || DEFAULT_GRAVITY_PER_FRAME;
    const acceleration = action.direction === 0 ? config.decelerationFactor : config.accelerationFactor;
    const targetVx = action.direction * config.moveSpeed;
    const state = {
        x: startNode.x,
        y: startNode.y,
        vx: action.direction * config.moveSpeed,
        vy: action.jump ? -config.jumpStrength : 0,
        headY: startNode.y - config.playerHeight / 2,
        footY: startNode.y + config.playerHeight / 2,
        frame: 0
    };

    for (let frame = 1; frame <= SIMULATION_FRAMES; frame += 1) {
        const previousHeadY = state.headY;
        const previousFootY = state.footY;

        state.vx += (targetVx - state.vx) * acceleration;
        state.vy += gravity;
        state.x += state.vx;
        state.y += state.vy;
        state.headY = state.y - config.playerHeight / 2;
        state.footY = state.y + config.playerHeight / 2;
        state.frame = frame;

        resolveHeadCollision(surfaces, startNode.surfaceId, state, previousHeadY, config);

        const landing = findLandingSurface(surfaces, startNode.surfaceId, state, previousFootY, config);
        if (landing) {
            if (landing.surface.id === startNode.surfaceId) {
                return null;
            }

            return landing;
        }

        if (state.y > config.worldHeight + config.playerHeight * 4) {
            return null;
        }
    }

    return null;
}

function addJumpEdges(graph, surface, surfaces, config) {
    const nodes = graph.nodesBySurfaceId.get(surface.id);
    const actionsForNode = node => {
        const actions = [];

        if (node.isLeftEdge) {
            actions.push({ type: 'drop', direction: -1, jump: false });
        }
        if (node.isRightEdge) {
            actions.push({ type: 'drop', direction: 1, jump: false });
        }

        actions.push({ type: 'jump', direction: -1, jump: true });
        actions.push({ type: 'jump', direction: 1, jump: true });
        if (!node.isLeftEdge && !node.isRightEdge) {
            actions.push({ type: 'jump', direction: 0, jump: true });
        }

        return actions;
    };

    nodes.forEach(node => {
        actionsForNode(node).forEach(action => {
            const landing = simulateTransition(node, surfaces, action, config);
            if (!landing) return;

            const targetNode = findClosestNodeOnSurface(graph, landing.surface.id, landing.x);
            if (!targetNode || targetNode.id === node.id) return;

            const landingWalkCost = Math.abs(targetNode.x - landing.x) / Math.max(1, config.moveSpeed) * FRAME_MS;
            const heightPenalty = Math.max(0, landing.footY - node.footY) * 0.08;
            const landingRisk = Math.max(0, COMFORTABLE_LANDING_MARGIN - landing.edgeMargin);
            const landingPenalty = landingRisk * RISKY_LANDING_PENALTY;
            const actionPenalty = action.type === 'drop' ? 18 : 35;

            addEdge(graph, {
                from: node.id,
                to: targetNode.id,
                type: action.type,
                cost: landing.frames * FRAME_MS + landingWalkCost + actionPenalty + heightPenalty + landingPenalty,
                launchX: node.x,
                launchY: node.y,
                landX: landing.x,
                landY: landing.y,
                landingEdgeMargin: landing.edgeMargin,
                direction: action.direction,
                jump: action.jump,
                holdFrames: Math.max(12, landing.frames + 8),
                targetSurfaceId: landing.surface.id
            });
        });
    });
}

export function findClosestNodeOnSurface(graph, surfaceId, x) {
    const nodes = graph.nodesBySurfaceId.get(surfaceId) || [];
    let bestNode = null;
    let bestScore = Infinity;

    nodes.forEach(node => {
        const score = Math.abs(node.x - x);
        if (score < bestScore) {
            bestNode = node;
            bestScore = score;
        }
    });

    return bestNode;
}

export function createPlatformGraph(platformBodies, config) {
    const surfaces = platformBodies
        .map(createSurface)
        .filter(Boolean);
    const graph = {
        surfaces,
        surfacesById: new Map(),
        nodes: [],
        nodesById: new Map(),
        nodesBySurfaceId: new Map(),
        edgesByNodeId: new Map(),
        config
    };

    surfaces.forEach(surface => {
        graph.surfacesById.set(surface.id, surface);
        const nodes = createNodesForSurface(surface, config.playerHeight);
        graph.nodesBySurfaceId.set(surface.id, nodes);
        graph.nodes.push(...nodes);
        nodes.forEach(node => graph.nodesById.set(node.id, node));
    });

    surfaces.forEach(surface => addWalkEdges(graph, surface, config));
    surfaces.forEach(surface => addJumpEdges(graph, surface, surfaces, config));

    return graph;
}

export function findSurfaceForBody(graph, body) {
    const footY = body.position.y + graph.config.playerHeight / 2;
    const x = body.position.x;
    let bestSurface = null;
    let bestScore = Infinity;

    graph.surfaces.forEach(surface => {
        if (!surface.containsX(x, SURFACE_MARGIN)) return;

        const topY = surface.yAt(x);
        const verticalDistance = Math.abs(footY - topY);
        const isAboveOrTouching = footY <= topY + graph.config.playerHeight;
        if (!isAboveOrTouching || verticalDistance > 90) return;

        const score = verticalDistance + Math.max(0, surface.minX - x, x - surface.maxX);
        if (score < bestScore) {
            bestSurface = surface;
            bestScore = score;
        }
    });

    return bestSurface;
}

export function findLikelySurfaceForBody(graph, body) {
    const footY = body.position.y + graph.config.playerHeight / 2;
    const x = body.position.x;
    let bestSurface = null;
    let bestScore = Infinity;

    graph.surfaces.forEach(surface => {
        const horizontalDistance = Math.max(0, surface.minX - x, x - surface.maxX);
        if (horizontalDistance > AIR_TARGET_X_MARGIN) return;

        const sampleX = clampXToSurface(surface, x, 0);
        const topY = surface.yAt(sampleX);
        const verticalDistance = topY - footY;
        if (verticalDistance < -AIR_TARGET_MAX_ABOVE || verticalDistance > AIR_TARGET_MAX_BELOW) return;

        const abovePenalty = verticalDistance < 0 ? Math.abs(verticalDistance) * 3 : verticalDistance;
        const score = horizontalDistance * 1.6 + abovePenalty;
        if (score < bestScore) {
            bestSurface = surface;
            bestScore = score;
        }
    });

    return bestSurface;
}

export function clampXToSurface(surface, x, inset = 16) {
    return Math.max(surface.minX + inset, Math.min(surface.maxX - inset, x));
}
