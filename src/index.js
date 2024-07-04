(() => {
    class GameObject {
        get objectType() { return 'GameObject'; }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) { }

        /**
         * @param {Renderer} renderer
         */
        draw(renderer) { }
    }

    class Ball extends GameObject {
        static types = [
            [1, 0.2, 0.2, 1],
            [0.2, 1, 0.2, 1],
            [0.2, 0.2, 1, 1],
            [1, 1, 0.2, 1],
            [1, 0.2, 1, 1],
            [0.2, 1, 1, 1],
            [1, 1, 1, 1],
            [0.2, 0.2, 0.2, 1],
        ];

        get objectType() { return 'Ball'; }

        constructor(x, y, radius, velocityX, velocityY, texture, type) {
            super();

            this.x = x;
            this.y = y;

            this.radius = radius;

            this.velocityX = velocityX;
            this.velocityY = velocityY;

            this.texture = texture;

            this.type = type;
        }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
        }

        /**
         * @param {Renderer} renderer
         */
        draw(renderer) {
            super.draw(renderer);

            const r = Ball.types[this.type][0];
            const g = Ball.types[this.type][1];
            const b = Ball.types[this.type][2];
            const a = Ball.types[this.type][3];

            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            renderer.drawRectangleOffCenter(x, y, scale * this.radius * 2, scale * this.radius * 2, 0, 0, 1, 1, r, g, b, a);
        }
    }

    class Projectile extends Ball {
        get objectType() { return 'Projectile'; }

        constructor(x, y, radius, velocityX, velocityY, texture, type) {
            super(x, y, radius, velocityX, velocityY, texture, type);

            this.angle = 0;
        }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            if (this.x - this.radius < -levelWidth / 2 && this.velocityX < 0
                || this.x + this.radius > levelWidth / 2 && this.velocityX > 0)
                this.velocityX = -this.velocityX;

            if (state !== 'idle')
                this.angle += deltaTime / 100;
        }

        /**
         * @param {Renderer} renderer
         */
        draw(renderer) {
            const r = Ball.types[this.type][0];
            const g = Ball.types[this.type][1];
            const b = Ball.types[this.type][2];
            const a = Ball.types[this.type][3];

            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            renderer.drawRotatedRectangleOffCenter(x, y, scale * this.radius * 2, scale * this.radius * 2, this.angle, 0, 0, 1, 1, r, g, b, a);
        }
    }

    class Particle extends Ball {
        get objectType() { return 'Particle'; }

        constructor(x, y, radius, velocityX, velocityY, texture, type) {
            super(x, y, radius, velocityX, velocityY, texture, type);

            this.lifetime = 250 * Math.random();
        }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            this.velocityY += 0.000002 * deltaTime * deltaTime;

            this.lifetime -= deltaTime;
        }
    }

    class FallingBall extends Ball {
        get objectType() { return 'FallingBall'; }

        constructor(x, y, radius, velocityX, velocityY, texture, type) {
            super(x, y, radius, velocityX, velocityY, texture, type);

            this.lifetime = 10000;
        }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            this.velocityY += 0.000002 * deltaTime * deltaTime;

            this.lifetime -= deltaTime;
        }
    }

    class ExplodingBall extends Ball {
        get objectType() { return 'ExplodingBall'; }

        constructor(x, y, radius, velocityX, velocityY, texture, type) {
            super(x, y, radius, velocityX, velocityY, texture, type);

            this.lifetime = 200;
        }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            this.lifetime -= deltaTime;
            this.radius *= 1.05;
        }

        /**
         * @param {Renderer} renderer
         */
        draw(renderer) {
            const r = Ball.types[this.type][0];
            const g = Ball.types[this.type][1];
            const b = Ball.types[this.type][2];
            const a = (this.lifetime / 200);

            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            renderer.drawRectangleOffCenter(x, y, scale * this.radius * 2, scale * this.radius * 2, 0, 0, 1, 1, r, g, b, a);
        }
    }

    const VERTEX_SHADER_SOURCE = `#version 300 es

uniform mat4 matrix;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragPosition;
out vec2 fragTexCoords;
out vec4 fragColor;

void main() {
    gl_Position = matrix * vec4(position, 0, 1);

    fragPosition = position;
    fragTexCoords = texCoords;
    fragColor = color;
}
`;

    const FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D colorTexture;

in vec2 fragPosition;
in vec2 fragTexCoords;
in vec4 fragColor;

out vec4 color;

void main() {
    color = fragColor * texture(colorTexture, fragTexCoords);
    color.rgb = pow(color.rgb, vec3(1.0 / 2.2));
}
`;

    /** @type {HTMLCanvasElement} */
    let canvas = null;

    /** @type {WebGL2RenderingContext} */
    let context = null;

    /** @type {number} */
    let prevTimestamp = null;

    /** @type {ShaderProgram} */
    let shaderProgram = null;

    /** @type {Texture} */
    let ballTexture = null;

    /** @type {Texture} */
    let whiteTexture = null;

    /** @type {Renderer} */
    let renderer = null;

    /** @type {GameObject[]} */
    let gameObjects = [];

    /** @type {Ball[]} */
    let firstLayer = [];

    /** @type {Projectile} */
    let projectile = null;

    let nextProjectileType = 0;

    let state = 'idle';

    const ballRadius = 2;
    const levelWidth = 45;

    let difficulty = 1;

    let cursorX = 0;
    let cursorY = 0;

    let showTrajectory = false;

    function main() {
        canvas = document.getElementById('canvas');
        if (canvas === null) return console.error('#canvas not found');

        context = canvas.getContext('webgl2');
        if (context === null) return console.error("Can't create webgl context");

        shaderProgram = new ShaderProgram(context, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
        renderer = new Renderer(context, canvas.width, canvas.height);

        resize();
        addEventListener('resize', resize);
        requestAnimationFrame(update);

        const ballImage = new Image();
        ballImage.loading = 'eager';
        ballImage.src = './assets/ball.png';
        ballImage.addEventListener('load', () => {
            ballTexture = new Texture(context, context.TEXTURE_2D, ballImage.width, ballImage.height);
            ballTexture.setImage(ballImage);
            ballImage.remove();
        });

        const whiteImage = new Image();
        whiteImage.loading = 'eager';
        whiteImage.src = './assets/white.png';
        whiteImage.addEventListener('load', () => {
            whiteTexture = new Texture(context, context.TEXTURE_2D, whiteImage.width, whiteImage.height);
            whiteTexture.setImage(whiteImage);
            whiteImage.remove();
        });

        createOrResetLevel();

        document.addEventListener('pointerdown', event => {
            cursorX = event.clientX;
            cursorY = event.clientY;

            if (event.button === 0 && (cursorY / renderer.height) < 0.9)
                showTrajectory = true;
            else
                showTrajectory = false;
        });

        document.addEventListener('pointermove', event => {
            cursorX = event.clientX;
            cursorY = event.clientY;

            if (event.buttons === 1 && (cursorY / renderer.height) < 0.9)
                showTrajectory = true;
            else
                showTrajectory = false;
        });

        document.addEventListener('pointerup', event => {
            event.preventDefault();

            if (state === 'idle' && event.button === 0 && (cursorY / renderer.height) < 0.9) {
                state = 'shot';

                let [clientX, clientY] = screenToWorld(event.clientX, event.clientY);
                clientY = Math.min(clientY, 95);

                const offsetX = clientX;
                const offsetY = clientY - 100;

                const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

                const directionX = offsetX / distance;
                const directionY = offsetY / distance;

                const speed = 0.05;

                projectile.velocityX = directionX * speed;
                projectile.velocityY = directionY * speed;
            } else if (state === 'idle' && (event.button === 2 || event.button === 0 && (cursorY / renderer.height) >= 0.9)) {
                const type = projectile.type;
                projectile.type = nextProjectileType;
                nextProjectileType = type;
            }

            showTrajectory = false;
        });

        document.addEventListener('contextmenu', event => {
            event.preventDefault();
        });
    }

    function createOrResetLevel() {
        gameObjects = [];
        firstLayer = [];

        const minY = -difficulty;
        for (let y = minY; y < 5; y++)
            for (let x = -3; x < (y % 2 ? 3 : 4); x++) {
                const type = Math.floor(Math.min(difficulty + 2, Ball.types.length) * Math.random());
                const gameObject = new Ball(2 * ballRadius * x + (y % 2 ? ballRadius : 0), ballRadius + 2 * ballRadius * y, ballRadius, 0, 0.0005, ballTexture, type);
                gameObjects.push(gameObject);

                if (y === minY) firstLayer.push(gameObject);
            }

        createOrResetProjectile();
    }

    function createOrResetProjectile() {
        gameObjects = gameObjects.filter(gameObject => gameObject !== projectile);

        let types = getBallTypesOnBoard();
        if (types.length > 1)
            types = types.filter(type => type !== nextProjectileType);

        const type = nextProjectileType;
        nextProjectileType = types.length > 0 ? types[Math.floor(types.length * Math.random())] : 0;
        gameObjects.push(projectile = new Projectile(0, 95, ballRadius, 0, 0, ballTexture, type));
        state = 'idle';
    }

    function resize() {
        document.documentElement.style.setProperty('--doc-height', `${window.innerHeight}px`);

        const { clientWidth, clientHeight } = canvas;

        canvas.width = clientWidth;
        canvas.height = clientHeight;

        renderer.resize(clientWidth, clientHeight);
    }

    function update(timestamp) {
        const deltaTime = (prevTimestamp !== null) ? timestamp - prevTimestamp : 0;
        prevTimestamp = timestamp;

        for (const gameObject of gameObjects)
            gameObject.update(deltaTime);

        // Check ball/projectile collision
        for (const gameObject of gameObjects) {
            if (gameObject.objectType !== 'Ball') continue;

            const offsetX = projectile.x - gameObject.x;
            const offsetY = projectile.y - gameObject.y;

            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

            if (distance < (gameObject.radius + projectile.radius) * 0.9) {
                let x = gameObject.x;
                let y = gameObject.y;
                if (offsetY * offsetY > offsetX * offsetX) {
                    x += (offsetX > 0 ? gameObject.radius : -gameObject.radius);
                    y += 2 * gameObject.radius;
                } else {
                    x += (offsetX > 0 ? 2 * gameObject.radius : -2 * gameObject.radius);
                }

                // Add ball on the contact point
                const ball = new Ball(x, y, gameObject.radius, gameObject.velocityX, gameObject.velocityY, ballTexture, projectile.type);
                gameObjects.push(ball);

                const linkedSet = new Set(getLinkedBallsOfSameType(ball));
                if (linkedSet.size > 2) {
                    // Remove linked balls
                    gameObjects = gameObjects.filter(gameObject => !linkedSet.has(gameObject));
                    firstLayer = firstLayer.filter(gameObject => !linkedSet.has(gameObject));

                    for (const ball of [...linkedSet]) {
                        // Create exploding ball for removed linked balls
                        gameObjects.push(new ExplodingBall(ball.x, ball.y, ballRadius, ball.velocityX, ball.velocityY, ballTexture, ball.type));

                        // Create particles for removed linked balls
                        for (let i = 0; i < 10; i++) {
                            let velocityX = 2 * Math.random() - 1;
                            let velocityY = 2 * Math.random() - 1;

                            const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
                            velocityX /= length;
                            velocityY /= length;

                            velocityX *= 0.025;
                            velocityY *= 0.025;

                            const particleRadius = ballRadius * 0.25;
                            gameObjects.push(new Particle(ball.x, ball.y, particleRadius, velocityX, velocityY, ballTexture, ball.type));
                        }
                    }

                    // Find neighbour balls
                    const neighboursSet = new Set();
                    for (const ball of [...linkedSet]) {
                        const ballNeighbours = getNeighbourBalls(ball);
                        for (const ball of ballNeighbours)
                            neighboursSet.add(ball);
                    }

                    // Find detached balls
                    const detachedSet = new Set();
                    const firstLayerSet = new Set(firstLayer);
                    for (const neighbour of [...neighboursSet]) {
                        const linkedToNeighbour = getLinkedBalls(neighbour);
                        if (linkedToNeighbour.filter(ball => firstLayerSet.has(ball)).length === 0)
                            for (const ball of linkedToNeighbour)
                                detachedSet.add(ball);
                    }

                    // Remove detached balls
                    if (detachedSet.size > 0) {
                        gameObjects = gameObjects.filter(gameObject => !detachedSet.has(gameObject));
                        firstLayer = firstLayer.filter(gameObject => !detachedSet.has(gameObject));

                        // Create falling balls for removed detached balls
                        for (const ball of [...detachedSet]) {
                            if (linkedSet.has(ball)) continue;

                            const velocityX = (2 * Math.random() - 1) * 0.001;
                            const velocityY = ball.velocityY;
                            gameObjects.push(new FallingBall(ball.x, ball.y, ballRadius, velocityX, velocityY, ballTexture, ball.type));
                        }
                    }
                }

                createOrResetProjectile();
                break;
            }
        }

        // Reset projectile if outside the level
        if (projectile !== null && (projectile.y < 0 || projectile.y > 100))
            createOrResetProjectile();

        // Reset level if any ball reached bottom
        for (const gameObject of gameObjects) {
            if (gameObject.objectType !== 'Ball') continue;

            if (gameObject.y + gameObject.radius > 90) {
                createOrResetLevel();
                break;
            }
        }

        // Reset level if all balls destroyed
        if (gameObjects.filter(gameObject => gameObject.objectType === 'Ball').length === 0) {
            difficulty++;
            createOrResetLevel();
        }

        // Remove particles
        const objectsToDelete = [];
        for (const gameObject of gameObjects) {
            if (gameObject.objectType === 'Particle' || gameObject.objectType === 'FallingBall' || gameObject.objectType === 'ExplodingBall') {
                if (gameObject.lifetime < 0) {
                    objectsToDelete.push(gameObject);
                }
            }
        }

        gameObjects = gameObjects.filter(gameObject => !objectsToDelete.includes(gameObject));

        shaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);
        ballTexture?.bind();
        renderer.clear().beginGeometry()

        for (const gameObject of gameObjects)
            gameObject.draw(renderer);

        // Draw next projectile type
        {
            const r = Ball.types[nextProjectileType][0];
            const g = Ball.types[nextProjectileType][1];
            const b = Ball.types[nextProjectileType][2];
            const a = Ball.types[nextProjectileType][3];

            const nextProjectileRadius = ballRadius * 0.75;
            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(-5, 95);
            renderer.drawRectangleOffCenter(x, y, scale * nextProjectileRadius * 2, scale * nextProjectileRadius * 2, 0, 0, 1, 1, r, g, b, a);
        }

        // Draw trajectory
        if (showTrajectory && state === 'idle' && projectile !== null) {
            let [clientX, clientY] = screenToWorld(cursorX, cursorY);
            clientY = Math.min(clientY, 95);

            const offsetX = clientX;
            const offsetY = clientY - 100;

            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

            let directionX = offsetX / distance;
            let directionY = offsetY / distance;

            let x = projectile.x;
            let y = projectile.y;

            for (let i = 1; i <= 1000; i++) {
                x += directionX / 10;
                y += directionY / 10;

                if (x - projectile.radius < -levelWidth / 2 || x + projectile.radius > levelWidth / 2) {
                    directionX = -directionX;
                }

                if (i % 100 === 0) {
                    const trajectoryBallRadius = ballRadius / 2;
                    const scale = renderer.height / 100;
                    const [x1, y1] = worldToScreen(x, y);
                    renderer.drawRectangleOffCenter(x1, y1, scale * trajectoryBallRadius * 2, scale * trajectoryBallRadius * 2, 0, 0, 1, 1, 1, 1, 1, 0.25);
                }
            }
        }

        renderer.endGeometry();

        whiteTexture?.bind();
        renderer.beginGeometry();

        // Draw borders
        {
            const scale = renderer.height / 100;

            const [x0, y0] = worldToScreen(-levelWidth / 2, 50);
            renderer.drawRectangleOffCenter(x0, y0, 0.2 * scale, 100 * scale, 0, 0, 1, 1, 1, 1, 1, 1);

            const [x1, y1] = worldToScreen(levelWidth / 2, 50);
            renderer.drawRectangleOffCenter(x1, y1, 0.2 * scale, 100 * scale, 0, 0, 1, 1, 1, 1, 1, 1);

            const [x2, y2] = worldToScreen(0, 90);
            renderer.drawRectangleOffCenter(x2, y2, levelWidth * scale, 0.2 * scale, 0, 0, 1, 1, 1, 1, 1, 1);
        }

        renderer.endGeometry();
        requestAnimationFrame(update);
    }

    function getLinkedBalls(ball) {
        const linked = new Set([ball]);
        const checked = new Set();
        const queue = [ball];
        while (queue.length > 0) {
            const ball = queue.pop();
            const neighbours = getNeighbourBalls(ball);
            for (const neighbour of neighbours) {
                if (!checked.has(neighbour)) {
                    linked.add(neighbour);
                    queue.push(neighbour);
                }

                checked.add(neighbour);
            }
        }

        return [...linked];
    }

    function getLinkedBallsOfSameType(ball) {
        const linked = new Set([ball]);
        const checked = new Set();
        const queue = [ball];
        while (queue.length > 0) {
            const ball = queue.pop();
            const neighbours = getNeighbourBalls(ball);
            for (const neighbour of neighbours) {
                if (!checked.has(neighbour) && neighbour.type === ball.type) {
                    linked.add(neighbour);
                    queue.push(neighbour);
                }

                checked.add(neighbour);
            }
        }

        return [...linked];
    }

    function getNeighbourBalls(ball) {
        const neighbours = [];
        for (const gameObject of gameObjects) {
            if (gameObject.objectType !== 'Ball' || gameObject === projectile || gameObject === ball) continue;

            const offsetX = ball.x - gameObject.x;
            const offsetY = ball.y - gameObject.y;

            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            if (distance < (gameObject.radius + ball.radius) * 1.25) {
                neighbours.push(gameObject);
            }
        }

        return neighbours;
    }

    function getBallTypesOnBoard() {
        const types = new Set();
        for (const gameObject of gameObjects) {
            if (gameObject.objectType !== 'Ball') continue;

            types.add(gameObject.type);
        }

        return [...types];
    }

    function worldToScreen(x, y) {
        const offsetX = renderer.width / 2;
        const scale = renderer.height / 100;
        return [scale * x + offsetX, scale * y];
    }

    function screenToWorld(x, y) {
        const offsetX = renderer.width / 2;
        const scale = renderer.height / 100;
        return [(x - offsetX) / scale, y / scale];
    }

    (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', main) : main();
})();
