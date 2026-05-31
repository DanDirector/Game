import { Body } from './physics.js';
import { applyMovement } from './movementController.js';
import { createPathSearch } from './ai/pathfinder.js';
import {
    clampXToSurface,
    createPlatformGraph,
    findClosestNodeOnSurface,
    findLikelySurfaceForBody,
    findSurfaceForBody
} from './ai/platformGraph.js';

const FRAME_MS = 1000 / 60;
const REPLAN_INTERVAL = 320;
const GOAL_MOVE_REPLAN_DISTANCE = 120;
const WALK_DEADZONE = 18;
const LAUNCH_DEADZONE = 10;
const LAUNCH_WINDOW = 8;
const LAUNCH_OVERSHOOT_GRACE = 70;
const RUN_UP_DISTANCE = 95;
const STUCK_REPLAN_TIME = 650;
const FAILED_EDGE_BASE_COOLDOWN = 5000;
const FLEE_REPLAN_INTERVAL = 480;
const FLEE_URGENT_REPLAN_INTERVAL = 220;
const FLEE_PLAYER_MOVE_REPLAN_DISTANCE = 150;
const DANGER_DISTANCE = 520;
const ROUTE_IDLE_REPLAN_TIME = 520;
const PATH_STEP_GUARD = 8;
const AIR_STEER_DEADZONE = 14;
const AIR_COMMIT_FRAMES = 8;
const AIR_OFF_ROUTE_REPLAN_FRAMES = 10;
const AIR_TARGET_INSET = 30;

function createEmptyInput() {
    return {
        moveLeft: false,
        moveRight: false,
        jumpPressed: false
    };
}

function moveToward(body, targetX, deadzone = WALK_DEADZONE) {
    const input = createEmptyInput();
    const dx = targetX - body.position.x;

    if (dx < -deadzone) {
        input.moveLeft = true;
    } else if (dx > deadzone) {
        input.moveRight = true;
    }

    return input;
}

function moveInDirection(direction) {
    const input = createEmptyInput();
    input.moveLeft = direction < 0;
    input.moveRight = direction > 0;
    return input;
}

function predictedPlayerX(playerBody, playerSurface) {
    const leadFrames = 28;
    const rawX = playerBody.position.x + playerBody.velocity.x * leadFrames;
    return clampXToSurface(playerSurface, rawX, 22);
}

function edgeStartSurfaceId(path, edgeIndex) {
    return path?.nodes?.[edgeIndex]?.surfaceId || null;
}

function edgeKey(edge) {
    return `${edge.from}->${edge.to}:${edge.type}:${edge.direction ?? 0}`;
}

function isReadyForAirAction(botBody, edge) {
    const dxToLaunch = edge.launchX - botBody.position.x;

    if (edge.type === 'drop' || edge.direction === 0) {
        return Math.abs(dxToLaunch) <= LAUNCH_DEADZONE;
    }

    const signedDistanceToLaunch = dxToLaunch * edge.direction;
    const speedTowardLaunch = botBody.velocity.x * edge.direction;

    return signedDistanceToLaunch <= LAUNCH_WINDOW &&
        signedDistanceToLaunch >= -LAUNCH_OVERSHOOT_GRACE &&
        speedTowardLaunch > 0.4;
}

function edgeTargetNode(graph, edge) {
    return graph.nodesById.get(edge.to);
}

class SmartBotAI {
    constructor({ platformBodies, movement, playerWidth, playerHeight, worldWidth, worldHeight, debug = false }) {
        this.config = {
            ...movement,
            playerWidth,
            playerHeight,
            worldWidth,
            worldHeight
        };
        this.graph = createPlatformGraph(platformBodies, this.config);
        this.debug = debug;
        this.path = null;
        this.edgeIndex = 0;
        this.airAction = null;
        this.replanTimer = 0;
        this.lastGoalSurfaceId = null;
        this.lastGoalX = 0;
        this.lastBotX = null;
        this.stuckTimer = 0;
        this.status = 'idle';
        this.lastPlayerSurface = null;
        this.planMode = 'none';
        this.time = 0;
        this.failedEdges = new Map();
        this.routeIdleTimer = 0;
        this.lastFleeBotSurfaceId = null;
        this.lastFleePlayerSurfaceId = null;
        this.lastFleePlayerX = null;
        this.lastFleePlayerY = null;
    }

    getDebugState() {
        return {
            enabled: this.debug,
            graph: this.graph,
            path: this.path,
            edgeIndex: this.edgeIndex,
            status: this.status,
            planMode: this.planMode,
            failedEdges: this.failedEdges.size,
            lastGoalSurfaceId: this.lastGoalSurfaceId,
            lastGoalX: this.lastGoalX
        };
    }

    update(botBody, playerBody, movementConfig, dt) {
        this.time += dt;
        this.replanTimer -= dt;

        const botSurface = findSurfaceForBody(this.graph, botBody);
        const playerSurface = findSurfaceForBody(this.graph, playerBody) ||
            findLikelySurfaceForBody(this.graph, playerBody) ||
            this.lastPlayerSurface;

        if (playerSurface) {
            this.lastPlayerSurface = playerSurface;
        }

        const shouldChase = botBody.renderData.isTagger;
        let input = shouldChase
            ? this.chooseChaseInput(botBody, playerBody, botSurface, playerSurface, dt)
            : this.chooseFleeInput(botBody, playerBody, botSurface, playerSurface, dt);

        input = this.recoverIdleRoute(botBody, input, dt);
        input = this.applyRecoveryIfStuck(botBody, input, dt);

        applyMovement(
            botBody,
            input,
            Body,
            movementConfig,
            dt
        );
    }

    recoverIdleRoute(botBody, input, dt) {
        const hasIntent = input.moveLeft || input.moveRight || input.jumpPressed;
        const activeEdge = this.path?.edges?.[this.edgeIndex];

        if (!activeEdge || this.airAction || hasIntent || !botBody.renderData.isOnGround) {
            this.routeIdleTimer = 0;
            return input;
        }

        this.routeIdleTimer += dt;
        if (this.routeIdleTimer <= ROUTE_IDLE_REPLAN_TIME) {
            return input;
        }

        if (activeEdge.type !== 'walk') {
            this.markEdgeFailed(activeEdge);
        }

        this.path = null;
        this.airAction = null;
        this.replanTimer = 0;
        this.routeIdleTimer = 0;
        this.status = 'idle-route-replan';

        return input;
    }

    chooseChaseInput(botBody, playerBody, botSurface, playerSurface, dt) {
        if (this.airAction && this.path) {
            return this.followPath(botBody, botSurface, dt);
        }

        if (!botSurface || !playerSurface) {
            this.status = 'fallback-no-surface';
            return this.strategicFallback(botBody, playerBody, botSurface);
        }

        const goalX = predictedPlayerX(playerBody, playerSurface);

        if (botSurface.id === playerSurface.id) {
            this.status = 'direct-same-platform';
            this.path = null;
            this.airAction = null;
            this.planMode = 'direct';
            return this.directChaseOnSurface(botBody, playerBody, playerSurface, goalX);
        }

        const goalMoved = this.lastGoalSurfaceId !== playerSurface.id ||
            Math.abs(this.lastGoalX - goalX) > GOAL_MOVE_REPLAN_DISTANCE;

        const hasActivePath = this.path && this.edgeIndex < this.path.edges.length;
        const activeEdge = hasActivePath ? this.path.edges[this.edgeIndex] : null;
        const isCommittedToJump = activeEdge && activeEdge.type !== 'walk';
        const periodicReplan = this.replanTimer <= 0 && !isCommittedToJump && this.planMode !== 'exact';
        const canReplan = botBody.renderData.isOnGround && !this.airAction;
        if (canReplan && (!hasActivePath || goalMoved || periodicReplan)) {
            this.planPath(botBody, playerBody, botSurface, playerSurface, goalX);
        }

        if (!this.path || this.path.edges.length === 0) {
            this.status = 'fallback-no-path';
            return this.strategicFallback(botBody, playerBody, botSurface);
        }

        return this.followPath(botBody, botSurface, dt);
    }

    chooseFleeInput(botBody, playerBody, botSurface, playerSurface, dt) {
        if (this.airAction && this.path) {
            return this.followPath(botBody, botSurface, dt);
        }

        if (!botSurface) {
            this.status = 'flee-no-surface';
            return this.fallbackFlee(botBody, playerBody);
        }

        const distanceToPlayer = Math.hypot(
            botBody.position.x - playerBody.position.x,
            (botBody.position.y - playerBody.position.y) * 0.75
        );
        const sameSurface = playerSurface && botSurface.id === playerSurface.id;
        const hasActivePath = this.path && this.edgeIndex < this.path.edges.length;
        const playerSurfaceId = playerSurface?.id || null;
        const surfaceChanged = this.lastFleeBotSurfaceId !== botSurface.id ||
            this.lastFleePlayerSurfaceId !== playerSurfaceId;
        const playerMovedSincePlan = this.lastFleePlayerX === null ||
            Math.hypot(
                playerBody.position.x - this.lastFleePlayerX,
                (playerBody.position.y - this.lastFleePlayerY) * 0.75
            ) > FLEE_PLAYER_MOVE_REPLAN_DISTANCE;
        const urgentReplan = sameSurface || distanceToPlayer < DANGER_DISTANCE;
        const shouldReplan = !hasActivePath ||
            surfaceChanged ||
            (this.replanTimer <= 0 && (urgentReplan || playerMovedSincePlan));

        if (botBody.renderData.isOnGround && !this.airAction && shouldReplan) {
            this.planEscapePath(botBody, playerBody, botSurface, playerSurface, urgentReplan);
        }

        if (!this.path || this.path.edges.length === 0) {
            this.status = 'flee-direct';
            return this.fallbackFlee(botBody, playerBody, botSurface);
        }

        return this.followPath(botBody, botSurface, dt);
    }

    directChaseOnSurface(botBody, playerBody, playerSurface, goalX) {
        const targetX = clampXToSurface(playerSurface, goalX, 20);
        const input = moveToward(botBody, targetX, 12);
        const playerIsAbove = playerBody.position.y < botBody.position.y - 70;

        if (playerIsAbove && botBody.renderData.isOnGround && Math.abs(playerBody.position.x - botBody.position.x) < 95) {
            input.jumpPressed = true;
        }

        return input;
    }

    fallbackChase(botBody, playerBody) {
        const input = moveToward(botBody, playerBody.position.x, 12);
        const shouldJump = playerBody.position.y < botBody.position.y - 35 &&
            playerBody.position.y > botBody.position.y - 220 &&
            Math.abs(playerBody.position.x - botBody.position.x) < 180 &&
            botBody.renderData.isOnGround;

        if (shouldJump) {
            input.jumpPressed = true;
        }

        return input;
    }

    fallbackFlee(botBody, playerBody, botSurface = null) {
        const input = createEmptyInput();
        const playerIsLeft = playerBody.position.x < botBody.position.x;
        const nearLeftEdge = botSurface && botBody.position.x < botSurface.minX + 55;
        const nearRightEdge = botSurface && botBody.position.x > botSurface.maxX - 55;

        if (playerIsLeft && !nearRightEdge) {
            input.moveRight = true;
        } else if (!playerIsLeft && !nearLeftEdge) {
            input.moveLeft = true;
        } else if (botSurface) {
            const middleX = (botSurface.minX + botSurface.maxX) / 2;
            const towardMiddle = moveToward(botBody, middleX, 12);
            input.moveLeft = towardMiddle.moveLeft;
            input.moveRight = towardMiddle.moveRight;
        }

        if (
            botBody.renderData.isOnGround &&
            Math.abs(playerBody.position.x - botBody.position.x) < 110 &&
            playerBody.position.y > botBody.position.y - 80
        ) {
            input.jumpPressed = true;
        }

        return input;
    }

    strategicFallback(botBody, playerBody, botSurface) {
        if (!botSurface || !botBody.renderData.isOnGround) {
            return this.fallbackChase(botBody, playerBody);
        }

        const botSurfaceY = botSurface.yAt(botBody.position.x);
        const playerBelow = playerBody.position.y > botSurfaceY + 90;
        const bestStep = playerBelow
            ? this.findBestLowerStep(botSurface, playerBody)
            : this.findBestHigherStep(botSurface, playerBody);

        if (!bestStep) {
            return this.fallbackChase(botBody, playerBody);
        }

        this.path = {
            nodes: [
                this.graph.nodesById.get(bestStep.edge.from),
                this.graph.nodesById.get(bestStep.edge.to)
            ],
            edges: [bestStep.edge],
            cost: bestStep.edge.cost
        };
        this.edgeIndex = 0;
        this.airAction = null;
        this.replanTimer = REPLAN_INTERVAL;
        this.planMode = playerBelow ? 'fallback-lower-step' : 'fallback-step';
        this.status = playerBelow ? 'fallback-lower-step' : 'fallback-higher-step';

        return this.followPath(botBody, botSurface);
    }

    findBestHigherStep(botSurface, playerBody) {
        const botSurfaceY = botSurface.yAt((botSurface.minX + botSurface.maxX) / 2);
        let best = null;

        this.graph.nodesBySurfaceId.get(botSurface.id)?.forEach(node => {
            const edges = this.graph.edgesByNodeId.get(node.id) || [];
            edges.forEach(edge => {
                if (this.isEdgeBlocked(edge)) return;
                if (edge.type === 'walk') return;

                const targetNode = this.graph.nodesById.get(edge.to);
                const targetSurface = this.graph.surfacesById.get(targetNode.surfaceId);
                if (!targetSurface) return;

                const targetSurfaceY = targetSurface.yAt(targetNode.x);
                if (targetSurfaceY >= botSurfaceY - 20) return;

                const horizontalDistance = Math.abs(targetNode.x - playerBody.position.x);
                const verticalDistance = Math.max(0, targetNode.y - playerBody.position.y);
                const launchDistance = Math.abs(node.x - playerBody.position.x) * 0.15;
                const score = horizontalDistance * 1.2 + verticalDistance * 6 + launchDistance + edge.cost * 0.35;

                if (!best || score < best.score) {
                    best = { edge, score };
                }
            });
        });

        return best;
    }

    findBestLowerStep(botSurface, playerBody) {
        const botSurfaceY = botSurface.yAt((botSurface.minX + botSurface.maxX) / 2);
        let best = null;

        this.graph.nodesBySurfaceId.get(botSurface.id)?.forEach(node => {
            const edges = this.graph.edgesByNodeId.get(node.id) || [];
            edges.forEach(edge => {
                if (this.isEdgeBlocked(edge)) return;
                if (edge.type === 'walk') return;

                const targetNode = this.graph.nodesById.get(edge.to);
                const targetSurface = this.graph.surfacesById.get(targetNode.surfaceId);
                if (!targetSurface) return;

                const targetSurfaceY = targetSurface.yAt(targetNode.x);
                if (targetSurfaceY <= botSurfaceY + 20) return;

                const horizontalDistance = Math.abs(targetNode.x - playerBody.position.x);
                const verticalDistance = Math.abs(targetNode.y - playerBody.position.y);
                const dropBonus = edge.type === 'drop' ? 260 : 0;
                const score = horizontalDistance * 1.25 + verticalDistance * 0.65 + edge.cost * 0.3 - dropBonus;

                if (!best || score < best.score) {
                    best = { edge, score };
                }
            });
        });

        return best;
    }

    planPath(botBody, playerBody, botSurface, playerSurface, goalX) {
        const startNode = findClosestNodeOnSurface(this.graph, botSurface.id, botBody.position.x);
        const goalNodes = this.graph.nodesBySurfaceId.get(playerSurface.id) || [];
        let bestPlan = this.findBestPathToNodes(startNode, goalNodes, goalNode => {
            const interceptCost = Math.abs(goalNode.x - goalX) / Math.max(1, this.config.moveSpeed) * FRAME_MS * 1.5;
            return interceptCost;
        });

        this.planMode = 'exact';

        if (!bestPlan) {
            bestPlan = this.findBestReachableApproach(startNode, botSurface, playerBody);
            this.planMode = bestPlan ? 'approach' : 'failed';
        }

        this.path = bestPlan?.path || null;
        this.edgeIndex = 0;
        this.airAction = null;
        this.replanTimer = REPLAN_INTERVAL;
        this.lastGoalSurfaceId = playerSurface.id;
        this.lastGoalX = goalX;
        this.status = this.path ? 'planned' : 'plan-failed';
    }

    planEscapePath(botBody, playerBody, botSurface, playerSurface, urgentReplan = false) {
        const startNode = findClosestNodeOnSurface(this.graph, botSurface.id, botBody.position.x);
        let bestPlan = null;
        const pathSearch = this.createPathSearchFrom(startNode);

        if (!pathSearch) {
            this.path = null;
            this.planMode = 'flee-failed';
            this.status = 'flee-plan-failed';
            return;
        }

        const botFootY = botBody.position.y + this.config.playerHeight / 2;
        const playerFootY = playerBody.position.y + this.config.playerHeight / 2;
        const playerIsBelowOrLevel = playerFootY >= botFootY - 80;
        const candidateNodes = this.graph.nodes.filter(node => node.surfaceId !== botSurface.id);
        const nodesToTry = candidateNodes.length > 0 ? candidateNodes : this.graph.nodes;

        nodesToTry.forEach(goalNode => {
            const pathCost = pathSearch.getCost(goalNode.id);
            if (!Number.isFinite(pathCost) || pathCost <= 0) return;

            const horizontalDistance = Math.abs(goalNode.x - playerBody.position.x);
            const verticalDistance = Math.abs(goalNode.footY - playerFootY);
            const safeDistance = Math.hypot(horizontalDistance, verticalDistance * 0.72);
            const highGround = Math.max(0, botFootY - goalNode.footY);
            const playerBelowBonus = Math.max(0, playerBody.position.y - goalNode.y) * 0.9;
            const sameSurfacePenalty = playerSurface && goalNode.surfaceId === playerSurface.id ? 520 : 0;
            const currentSurfacePenalty = goalNode.surfaceId === botSurface.id ? 420 : 0;
            const dangerPenalty = Math.max(0, DANGER_DISTANCE - horizontalDistance) * 3.8;
            const routeCost = pathCost * 0.32;
            const climbBonus = playerIsBelowOrLevel ? highGround * 1.4 : highGround * 0.35;
            const score = routeCost +
                sameSurfacePenalty +
                currentSurfacePenalty +
                dangerPenalty -
                safeDistance * 1.35 -
                climbBonus -
                playerBelowBonus;

            if (!bestPlan || score < bestPlan.score) {
                bestPlan = { path: pathSearch.getPath(goalNode.id), score };
            }
        });

        this.path = bestPlan?.path || null;
        this.edgeIndex = 0;
        this.airAction = null;
        this.replanTimer = urgentReplan ? FLEE_URGENT_REPLAN_INTERVAL : FLEE_REPLAN_INTERVAL;
        this.lastFleeBotSurfaceId = botSurface.id;
        this.lastFleePlayerSurfaceId = playerSurface?.id || null;
        this.lastFleePlayerX = playerBody.position.x;
        this.lastFleePlayerY = playerBody.position.y;
        this.planMode = this.path ? 'flee' : 'flee-failed';
        this.status = this.path ? 'flee-planned' : 'flee-plan-failed';
    }

    createPathSearchFrom(startNode) {
        if (!startNode) return null;

        return createPathSearch(this.graph, startNode.id, {
            isEdgeBlocked: edge => this.isEdgeBlocked(edge),
            edgePenalty: edge => this.getEdgePenalty(edge)
        });
    }

    findBestPathToNodes(startNode, candidateNodes, extraCost) {
        let bestPlan = null;
        const pathSearch = this.createPathSearchFrom(startNode);

        if (!pathSearch) return null;

        candidateNodes.forEach(goalNode => {
            const path = pathSearch.getPath(goalNode.id);
            if (!path) return;

            const score = path.cost + extraCost(goalNode, path);
            if (!bestPlan || score < bestPlan.score) {
                bestPlan = { path, score };
            }
        });

        return bestPlan;
    }

    getFailedEdge(edge) {
        const failure = this.failedEdges.get(edgeKey(edge));
        if (!failure) return null;
        if (failure.blockedUntil <= this.time) {
            this.failedEdges.delete(edgeKey(edge));
            return null;
        }

        return failure;
    }

    isEdgeBlocked(edge) {
        return !!this.getFailedEdge(edge);
    }

    getEdgePenalty(edge) {
        const failure = this.getFailedEdge(edge);
        return failure ? failure.count * 3000 : 0;
    }

    markEdgeFailed(edge) {
        const key = edgeKey(edge);
        const previous = this.failedEdges.get(key);
        const count = (previous?.count || 0) + 1;

        this.failedEdges.set(key, {
            count,
            blockedUntil: this.time + FAILED_EDGE_BASE_COOLDOWN + count * 2500
        });
    }

    findBestReachableApproach(startNode, botSurface, playerBody) {
        const playerFootY = playerBody.position.y + this.config.playerHeight / 2;
        const playerAboveBot = playerBody.position.y < botSurface.yAt(startNode.x) - 150;

        return this.findBestPathToNodes(startNode, this.graph.nodes, (goalNode, path) => {
            const horizontalDistance = Math.abs(goalNode.x - playerBody.position.x);
            const belowPlayerPenalty = Math.max(0, goalNode.footY - playerFootY);
            const abovePlayerPenalty = Math.max(0, playerFootY - goalNode.footY) * 0.5;
            const sameSurfacePenalty = playerAboveBot && goalNode.surfaceId === botSurface.id ? 8000 : 0;
            const noProgressPenalty = playerAboveBot && path.edges.length === 0 ? 12000 : 0;

            return horizontalDistance * 1.4 +
                belowPlayerPenalty * 10 +
                abovePlayerPenalty +
                sameSurfacePenalty +
                noProgressPenalty;
        });
    }

    followPath(botBody, botSurface) {
        for (let step = 0; step < PATH_STEP_GUARD; step += 1) {
            if (this.edgeIndex >= this.path.edges.length) {
                this.status = 'path-finished';
                this.path = null;
                return createEmptyInput();
            }

            const edge = this.path.edges[this.edgeIndex];

            if (edge.type === 'walk') {
                const input = this.followWalkEdge(botBody, edge);
                if (input) return input;
                continue;
            }

            return this.followAirEdge(botBody, botSurface, edge);
        }

        return createEmptyInput();
    }

    followWalkEdge(botBody, edge) {
        if (Math.abs(botBody.position.x - edge.targetX) <= WALK_DEADZONE) {
            this.edgeIndex += 1;
            this.status = 'walk-edge-complete';
            return null;
        }

        this.status = 'walking-route';
        return moveToward(botBody, edge.targetX, WALK_DEADZONE);
    }

    followAirEdge(botBody, botSurface, edge) {
        const expectedStartSurfaceId = edgeStartSurfaceId(this.path, this.edgeIndex);

        if (!this.airAction && botSurface && botSurface.id !== expectedStartSurfaceId) {
            this.path = null;
            this.status = 'off-route-replan';
            return createEmptyInput();
        }

        if (!this.airAction) {
            const launchInput = this.prepareLaunch(botBody, botSurface, edge);
            if (launchInput) {
                return launchInput;
            }

            if (!isReadyForAirAction(botBody, edge)) {
                this.status = 'approaching-launch';
                const launchDeadzone = edge.direction === 0 ? LAUNCH_DEADZONE : LAUNCH_WINDOW;
                return moveToward(botBody, edge.launchX, launchDeadzone);
            }

            this.airAction = {
                edge,
                frames: 0,
                jumpFrames: edge.jump ? 2 : 0
            };
        }

        const input = createEmptyInput();
        const airTargetX = this.getAirTargetX(edge);
        const steerInput = moveToward(botBody, airTargetX, AIR_STEER_DEADZONE);
        const shouldCommitDirection = this.airAction.frames < AIR_COMMIT_FRAMES && edge.direction !== 0;

        input.moveLeft = shouldCommitDirection ? edge.direction < 0 : steerInput.moveLeft;
        input.moveRight = shouldCommitDirection ? edge.direction > 0 : steerInput.moveRight;
        input.jumpPressed = this.airAction.jumpFrames > 0;
        this.airAction.jumpFrames = Math.max(0, this.airAction.jumpFrames - 1);
        this.airAction.frames += 1;

        if (
            botSurface &&
            botBody.renderData.isOnGround &&
            this.airAction.frames > 5
        ) {
            if (botSurface.id === edge.targetSurfaceId) {
                this.edgeIndex += 1;
                this.airAction = null;
                this.status = 'landed-route-edge';
                return createEmptyInput();
            }

            if (this.airAction.frames > AIR_OFF_ROUTE_REPLAN_FRAMES || botSurface.id !== expectedStartSurfaceId) {
                this.markEdgeFailed(edge);
                this.path = null;
                this.replanTimer = 0;
                this.airAction = null;
                this.status = 'landed-off-route-replan';
                return createEmptyInput();
            }
        }

        if (
            botBody.renderData.isOnGround &&
            this.airAction.frames > AIR_OFF_ROUTE_REPLAN_FRAMES &&
            !botSurface
        ) {
            this.markEdgeFailed(edge);
            this.path = null;
            this.replanTimer = 0;
            this.airAction = null;
            this.status = 'lost-surface-after-jump';
            return createEmptyInput();
        }

        if (botBody.renderData.isOnGround && this.airAction.frames > edge.holdFrames + 28) {
            this.markEdgeFailed(edge);
            this.path = null;
            this.airAction = null;
            this.replanTimer = 0;
            this.status = 'missed-landing-replan';
            return createEmptyInput();
        }

        this.status = edge.type === 'drop' ? 'dropping-route' : 'jumping-route';
        return input;
    }

    getAirTargetX(edge) {
        const targetNode = edgeTargetNode(this.graph, edge);
        const targetSurface = this.graph.surfacesById.get(edge.targetSurfaceId || targetNode?.surfaceId);
        const rawTargetX = edge.landX ?? targetNode?.x ?? edge.launchX;

        return targetSurface
            ? clampXToSurface(targetSurface, rawTargetX, AIR_TARGET_INSET)
            : rawTargetX;
    }

    prepareLaunch(botBody, botSurface, edge) {
        if (edge.type === 'drop') return null;

        if (edge.direction === 0) {
            if (Math.abs(botBody.velocity.x) <= 1.1) return null;

            const input = createEmptyInput();
            if (botBody.velocity.x > 0) input.moveLeft = true;
            else input.moveRight = true;
            this.status = 'braking-for-vertical-jump';
            return input;
        }

        if (isReadyForAirAction(botBody, edge)) return null;

        const setupRawX = edge.launchX - edge.direction * RUN_UP_DISTANCE;
        const setupX = botSurface ? clampXToSurface(botSurface, setupRawX, 22) : setupRawX;
        const dxToLaunch = edge.launchX - botBody.position.x;
        const signedDistanceToLaunch = dxToLaunch * edge.direction;
        const speedTowardLaunch = botBody.velocity.x * edge.direction;
        const behindSetup = edge.direction > 0
            ? botBody.position.x < setupX - WALK_DEADZONE
            : botBody.position.x > setupX + WALK_DEADZONE;
        const passedLaunchWithoutSpeed = signedDistanceToLaunch < -LAUNCH_DEADZONE && speedTowardLaunch <= 0.4;
        const tooFarPastLaunch = edge.direction > 0
            ? botBody.position.x > edge.launchX + LAUNCH_OVERSHOOT_GRACE
            : botBody.position.x < edge.launchX - LAUNCH_OVERSHOOT_GRACE;

        if (tooFarPastLaunch || passedLaunchWithoutSpeed || behindSetup) {
            this.status = 'setting-up-run-up';
            return moveToward(botBody, setupX, WALK_DEADZONE);
        }

        this.status = 'running-up-to-launch';
        return moveInDirection(edge.direction);
    }

    applyRecoveryIfStuck(botBody, input, dt) {
        const wantsHorizontalMove = input.moveLeft || input.moveRight;

        if (
            wantsHorizontalMove &&
            botBody.renderData.isOnGround &&
            this.lastBotX !== null &&
            Math.abs(botBody.position.x - this.lastBotX) < 0.35
        ) {
            this.stuckTimer += dt;
        } else {
            this.stuckTimer = 0;
        }

        this.lastBotX = botBody.position.x;

        if (this.stuckTimer > STUCK_REPLAN_TIME) {
            this.path = null;
            this.airAction = null;
            this.replanTimer = 0;
            input.jumpPressed = botBody.renderData.isOnGround;
            this.stuckTimer = 0;
            this.status = 'stuck-recovery';
        }

        return input;
    }
}

export function createBotAI(options) {
    return new SmartBotAI(options);
}

export function updateBotAI(botBody, playerBody, config, dt) {
    const input = moveToward(botBody, playerBody.position.x, 12);
    if (playerBody.position.y < botBody.position.y - 35 && botBody.renderData.isOnGround) {
        input.jumpPressed = true;
    }

    applyMovement(botBody, input, Body, config, dt);
}

export function drawBotDebug(ctx, botAI) {
    const debug = botAI?.getDebugState();
    if (!debug?.enabled) return;

    ctx.save();
    ctx.lineWidth = 3;

    debug.graph.nodes.forEach(node => {
        ctx.fillStyle = 'rgba(52, 152, 219, 0.45)';
        ctx.beginPath();
        ctx.arc(node.x, node.footY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    if (debug.path) {
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.85)';
        ctx.beginPath();
        debug.path.nodes.forEach((node, index) => {
            if (index === 0) ctx.moveTo(node.x, node.footY - 26);
            else ctx.lineTo(node.x, node.footY - 26);
        });
        ctx.stroke();

        debug.path.edges.forEach((edge, index) => {
            if (edge.type === 'walk') return;

            ctx.strokeStyle = index === debug.edgeIndex
                ? 'rgba(231, 76, 60, 0.95)'
                : 'rgba(231, 76, 60, 0.35)';
            ctx.beginPath();
            ctx.moveTo(edge.launchX, edge.launchY);
            ctx.lineTo(edge.landX, edge.landY);
            ctx.stroke();

            ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
            ctx.beginPath();
            ctx.arc(edge.launchX, edge.launchY, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.restore();
}
