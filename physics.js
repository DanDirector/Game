export const Engine = Matter.Engine;
export const World = Matter.World;
export const Bodies = Matter.Bodies;
export const Body = Matter.Body;
export const Events = Matter.Events;
export const Query = Matter.Query;

export function initPhysics(gravityY = 1.4) {
    const engine = Engine.create();
    const world = engine.world;
    engine.world.gravity.y = gravityY;
    return { engine, world };
}

export function setupCollisionEvents({ engine, playerBodies, tagCooldownTime, groundCheckThreshold, jumpStrength, onTag }) {
    Events.on(engine, 'beforeUpdate', () => {
        playerBodies.forEach(playerBody => {
            playerBody.renderData.isOnGround = false;
        });
        const activePairs = engine.pairs.list;
        activePairs.forEach(pair => {
            if (!pair.isActive) return;
            let playerBody = null;
            let otherBody = null;
            if (pair.bodyA.label.startsWith('player-')) { playerBody = pair.bodyA; otherBody = pair.bodyB; }
            else if (pair.bodyB.label.startsWith('player-')) { playerBody = pair.bodyB; otherBody = pair.bodyA; }
            else { return; }
            if (!(otherBody.label.startsWith('platform-') || otherBody.label.startsWith('wall-'))) { return; }
            if (pair.collision && pair.collision.normal) {
                const normal = pair.collision.normal;
                const isGroundContact = (playerBody === pair.bodyA && normal.y < -groundCheckThreshold) ||
                                        (playerBody === pair.bodyB && normal.y > groundCheckThreshold);
                if (isGroundContact) { playerBody.renderData.isOnGround = true; }
            }
        });
        const p1 = playerBodies[0];
        const p2 = playerBodies[1];
        const p1Data = p1.renderData;
        const p2Data = p2.renderData;
        const collisionCheck = Query.collides(p1, [p2]);
        if (collisionCheck.length > 0) {
            if (p1Data.isTagger !== p2Data.isTagger && p1Data.tagTimer <= 0 && p2Data.tagTimer <= 0) {
                p1Data.isTagger = !p1Data.isTagger;
                p2Data.isTagger = !p2Data.isTagger;
                p1Data.tagTimer = tagCooldownTime;
                p2Data.tagTimer = tagCooldownTime;
                if (onTag) onTag();
            }
        }
    });

    Events.on(engine, 'collisionStart', event => {
        const pairs = event.pairs;
        pairs.forEach(pair => {
            let playerBody = null;
            let otherBody = null;
            if (pair.bodyA.label.startsWith('player-')) { playerBody = pair.bodyA; otherBody = pair.bodyB; }
            else if (pair.bodyB.label.startsWith('player-')) { playerBody = pair.bodyB; otherBody = pair.bodyA; }
            else { return; }
            if (!(otherBody.label.startsWith('platform-') || otherBody.label.startsWith('wall-'))) { return; }
            if (pair.collision && pair.collision.normal) {
                const normal = pair.collision.normal;
                if (Math.abs(normal.y) < 0.8) {
                    const velocity = playerBody.velocity;
                    if (velocity.y < 0) {
                        const maxUpwardVelocity = -jumpStrength;
                        if (velocity.y < maxUpwardVelocity) {
                            Body.setVelocity(playerBody, { x: velocity.x, y: maxUpwardVelocity });
                        }
                    }
                }
            }
        });
    });
}
