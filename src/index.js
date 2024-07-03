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
            [1, 0.5, 0.5, 1],
            [0.5, 1, 0.5, 1],
            [0.5, 0.5, 1, 1],
            [1, 1, 0.5, 1],
            [1, 0.5, 1, 1],
            [0.5, 1, 1, 1],
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

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            if (this.x - this.radius < -40 || this.x + this.radius > 40)
                this.velocityX = -this.velocityX;
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
    let texture = null;

    /** @type {Renderer} */
    let renderer = null;

    /** @type {GameObject[]} */
    let gameObjects = [];

    /** @type {Projectile} */
    let projectile = null;

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

        const image = new Image();
        image.src = '/assets/ball.png';
        image.addEventListener('load', () => {
            texture = new Texture(context, context.TEXTURE_2D, image);
            image.remove();

            createOrResetLevel();
        });

        document.addEventListener('click', event => {
            const [x, y] = screenToWorld(event.clientX, event.clientY);

            const offsetX = x;
            const offsetY = y - 100;

            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

            const directionX = offsetX / distance;
            const directionY = offsetY / distance;

            const speed = 0.1;

            projectile.velocityX = directionX * speed;
            projectile.velocityY = directionY * speed;
        });
    }

    function createOrResetLevel() {
        gameObjects.splice(0, gameObjects.length);

        const radius = 4;
        for (let y = 0; y < 3; y++)
            for (let x = -4; x < 4; x++) {
                const type = Math.floor(Ball.types.length * Math.random());
                gameObjects.push(new Ball(2 * radius * x + (y % 2 ? radius : 0), radius + 2 * radius * y, 4, 0, 0.001, texture, type));
            }

        createOrResetProjectile();
    }

    function createOrResetProjectile() {
        const index = gameObjects.findIndex(gameObject => gameObject === projectile);
        if (index !== -1) gameObjects.splice(index, 1);

        const radius = 4;
        const types = getBallTypesOnBoard();
        const type = types.length > 0 ? types[Math.floor(types.length * Math.random())] : 0;
        gameObjects.push(projectile = new Projectile(0, 100 - radius, radius, 0, 0, texture, type));
    }

    function resize() {
        const { clientWidth, clientHeight } = canvas;

        canvas.width = clientWidth;
        canvas.height = clientHeight;

        renderer.resize(clientWidth, clientHeight);
    }

    function update(timestamp) {
        const deltaTime = (prevTimestamp !== null) ? timestamp - prevTimestamp : 0;
        prevTimestamp = timestamp;

        for (const gameObject of gameObjects) gameObject.update(deltaTime);

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

                const ball = new Ball(x, y, gameObject.radius, gameObject.velocityX, gameObject.velocityY, texture, projectile.type);
                gameObjects.push(ball);

                const linked = getLinkedBalls(ball);
                if (linked.length > 2) gameObjects = gameObjects.filter(gameObject => !linked.includes(gameObject));

                createOrResetProjectile();
                break;
            }
        }

        // Reset projectile if outside the level
        if (projectile !== null && (projectile.y < 0 || projectile.y > 100)) {
            createOrResetProjectile();
        }

        // Reset level if any ball reached bottom
        for (const gameObject of gameObjects) {
            if (gameObject === projectile) continue;

            if (gameObject.y > 100 - 2 * gameObject.radius) {
                createOrResetLevel();
                break;
            }
        }

        // Reset level if all balls destroyed
        if (gameObjects.filter(gameObject => gameObject.objectType === 'Ball').length === 0) createOrResetLevel();

        const balls = gameObjects.filter(gameObject => gameObject !== projectile);

        shaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);
        texture?.bind();
        renderer.clear().beginGeometry()

        for (const gameObject of gameObjects)
            gameObject.draw(renderer);

        renderer.endGeometry();
        requestAnimationFrame(update);
    }

    function getLinkedBalls(ball) {
        const linked = new Set();
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
            if (gameObject === projectile || gameObject === ball) continue;

            const offsetX = ball.x - gameObject.x;
            const offsetY = ball.y - gameObject.y;

            const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            if (distance < (gameObject.radius + ball.radius) * 1.5) {
                neighbours.push(gameObject);
            }
        }

        return neighbours;
    }

    function getBallTypesOnBoard() {
        const types = new Set();
        for (const gameObject of gameObjects) {
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
