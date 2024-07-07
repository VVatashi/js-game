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

            if (state === 'idle' || state === 'shot') {
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
            }
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

            if (state === 'shot')
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

            this.lifetime = 5000;
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

        /**
         * @param {Renderer} renderer
         */
        draw(renderer) {
            const r = Ball.types[this.type][0];
            const g = Ball.types[this.type][1];
            const b = Ball.types[this.type][2];
            const a = (this.lifetime / 5000);

            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            renderer.drawRectangleOffCenter(x, y, scale * this.radius * 2, scale * this.radius * 2, 0, 0, 1, 1, r, g, b, a);
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

    const SCENE_VERTEX_SHADER_SOURCE = `#version 300 es

uniform mat4 matrix;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;
out vec4 fragColor;

void main() {
    gl_Position = matrix * vec4(position, 0, 1);

    fragTexCoords = texCoords;
    fragColor = color;
}
`;

    const SCENE_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D colorTexture;

in vec2 fragTexCoords;
in vec4 fragColor;

out vec4 color;

void main() {
    color = fragColor * texture(colorTexture, fragTexCoords);
}
`;

    const FONT_VERTEX_SHADER_SOURCE = `#version 300 es

uniform mat4 matrix;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;
out vec4 fragColor;

void main() {
    gl_Position = matrix * vec4(position, 0.0, 1.0);

    fragTexCoords = texCoords;
    fragColor = color;
}
`;

    const FONT_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D msdfTexture;
uniform float screenPxRange;
uniform float outlineBias;

in vec2 fragTexCoords;
in vec4 fragColor;

out vec4 color;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    vec4 msd = texture(msdfTexture, fragTexCoords);

    float hardDistance = median(msd.r, msd.g, msd.a);
    float softDistance = msd.a;

    float inner = screenPxRange * (hardDistance - 0.5) + 0.5;
    float outer = screenPxRange * (softDistance - 0.5 + outlineBias) + 0.5;

    float innerOpacity = clamp(inner, 0.0, 1.0);
    float outerOpacity = clamp(outer, 0.0, 1.0);

    // color = vec4(fragColor.rgb, innerOpacity * fragColor.a);
    color = fragColor * innerOpacity + vec4(vec3(0.0), 1.0) * outerOpacity;
}
`;

    const THRESHOLD_VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;

void main() {
    gl_Position = vec4(position, 0, 1);

    fragTexCoords = texCoords;
}
`;

    const THRESHOLD_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D colorTexture;
uniform float threshold;

in vec2 fragTexCoords;

out vec4 color;

void main() {
    vec3 result = texture(colorTexture, fragTexCoords).rgb;
    float brightness = dot(result, vec3(0.2126, 0.7152, 0.0722));
    if (brightness > threshold) {
        color = vec4(result, 1.0);
    } else {
        color = vec4(vec3(0.0), 1.0);
    }
}
`;

    const BLUR_VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;

void main() {
    gl_Position = vec4(position, 0, 1);

    fragTexCoords = texCoords;
}
`;

    const BLUR_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

const float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

uniform sampler2D colorTexture;
uniform bool horizontal;

in vec2 fragTexCoords;

out vec4 color;

void main() {
    vec2 texelSize = 1.0 / vec2(textureSize(colorTexture, 0));
    vec3 result = texture(colorTexture, fragTexCoords).rgb * weight[0];

    if (horizontal) {
        for (int i = 1; i < 5; i++) {
            result += texture(colorTexture, fragTexCoords + vec2(texelSize.x * float(i), 0.0)).rgb * weight[i];
            result += texture(colorTexture, fragTexCoords - vec2(texelSize.x * float(i), 0.0)).rgb * weight[i];
        }
    } else {
        for (int i = 1; i < 5; i++) {
            result += texture(colorTexture, fragTexCoords + vec2(0.0, texelSize.y * float(i))).rgb * weight[i];
            result += texture(colorTexture, fragTexCoords - vec2(0.0, texelSize.y * float(i))).rgb * weight[i];
        }
    }

    color = vec4(result, 1.0);
}
`;

    const SCREEN_VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);

    fragTexCoords = texCoords;
}
`;

    const SCREEN_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D colorTexture;
// uniform sampler2D blurTexture;

in vec2 fragTexCoords;

out vec4 color;

void main() {
    // vec3 result = texture(colorTexture, fragTexCoords).rgb + texture(blurTexture, fragTexCoords).rgb;
    vec3 result = texture(colorTexture, fragTexCoords).rgb;
    color = vec4(pow(result, vec3(1.0 / 2.2)), 1.0);
}
`;

    /** @type {HTMLCanvasElement} */
    let canvas = null;

    /** @type {WebGL2RenderingContext} */
    let context = null;

    /** @type {number} */
    let prevTimestamp = null;

    /** @type {ShaderProgram} */
    let sceneShaderProgram = null;

    /** @type {ShaderProgram} */
    let thresholdShaderProgram = null;

    /** @type {ShaderProgram} */
    let blurShaderProgram = null;

    /** @type {ShaderProgram} */
    let screenShaderProgram = null;

    /** @type {ShaderProgram} */
    let fontShaderProgram = null;

    /** @type {Texture} */
    let ballTexture = null;

    /** @type {Texture} */
    let whiteTexture = null;

    /** @type {Texture} */
    let fontTexture = null;

    /** @type {Font} */
    let font = null;

    /** @type {Renderer} */
    let renderer = null;

    /** @type {Framebuffer} */
    let framebufferMultisample = null;

    /** @type {Framebuffer} */
    let framebuffer = null;

    /** @type {Framebuffer} */
    // let pingFramebuffer = null;

    /** @type {Framebuffer} */
    // let pongFramebuffer = null;

    /** @type {GameObject[]} */
    let gameObjects = [];

    /** @type {Ball[]} */
    let firstLayer = [];

    /** @type {Projectile} */
    let projectile = null;

    let nextProjectileType = 0;

    let state = 'start';

    const ballRadius = 2;
    const levelWidth = 45;

    let difficulty = 1;
    let score = 0;

    let cursorX = 0;
    let cursorY = 0;

    let showTrajectory = false;

    function main() {
        canvas = document.getElementById('canvas');
        if (canvas === null) return console.error('#canvas not found');

        context = canvas.getContext('webgl2', { antialias: false });
        if (context === null) return console.error("Can't create webgl context");

        sceneShaderProgram = new ShaderProgram(context, SCENE_VERTEX_SHADER_SOURCE, SCENE_FRAGMENT_SHADER_SOURCE);
        // thresholdShaderProgram = new ShaderProgram(context, THRESHOLD_VERTEX_SHADER_SOURCE, THRESHOLD_FRAGMENT_SHADER_SOURCE);
        // blurShaderProgram = new ShaderProgram(context, BLUR_VERTEX_SHADER_SOURCE, BLUR_FRAGMENT_SHADER_SOURCE);
        screenShaderProgram = new ShaderProgram(context, SCREEN_VERTEX_SHADER_SOURCE, SCREEN_FRAGMENT_SHADER_SOURCE);
        fontShaderProgram = new ShaderProgram(context, FONT_VERTEX_SHADER_SOURCE, FONT_FRAGMENT_SHADER_SOURCE);

        renderer = new Renderer(context, canvas.width, canvas.height);
        framebufferMultisample = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
        framebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
        // pingFramebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
        // pongFramebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);

        const ballImage = new Image();
        ballImage.loading = 'eager';
        ballImage.src = './assets/ball.png';
        ballImage.addEventListener('load', () => {
            ballTexture = new Texture(context, context.TEXTURE_2D, ballImage.width, ballImage.height, context.SRGB8_ALPHA8);
            ballTexture.setImage(ballImage);
            ballImage.remove();
        });

        const whiteImage = new Image();
        whiteImage.loading = 'eager';
        whiteImage.src = './assets/white.png';
        whiteImage.addEventListener('load', () => {
            whiteTexture = new Texture(context, context.TEXTURE_2D, whiteImage.width, whiteImage.height, context.SRGB8_ALPHA8);
            whiteTexture.setImage(whiteImage);
            whiteImage.remove();
        });

        const fontImage = new Image();
        fontImage.loading = 'eager';
        fontImage.src = './assets/font.png';
        fontImage.addEventListener('load', () => {
            fontTexture = new Texture(context, context.TEXTURE_2D, fontImage.width, fontImage.height, context.RGBA8);
            fontTexture.setImage(fontImage);

            fetch('./assets/font.csv').then(response => {
                response.text().then(text => {
                    font = new Font(text, fontImage.width, fontImage.height);
                    fontImage.remove();
                });
            });
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
            } else if (['start', 'win', 'fail'].includes(state)) {
                state = 'idle';
            }

            showTrajectory = false;
        });

        document.addEventListener('contextmenu', event => {
            event.preventDefault();
        });

        resize();
        addEventListener('resize', resize);
        requestAnimationFrame(update);
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

        const typesOnBoard = getBallTypesOnBoard();
        const possibleNextTypes = typesOnBoard.filter(type => type !== nextProjectileType);
        const currentType = typesOnBoard.length > 0 ? (typesOnBoard.includes(nextProjectileType) ? nextProjectileType : typesOnBoard[Math.floor(typesOnBoard.length * Math.random())]) : 0;
        nextProjectileType = possibleNextTypes.length > 0 ? possibleNextTypes[Math.floor(possibleNextTypes.length * Math.random())] : 0;
        gameObjects.push(projectile = new Projectile(0, 95, ballRadius, 0, 0, ballTexture, currentType));
    }

    function resize() {
        document.documentElement.style.setProperty('--doc-height', `${window.innerHeight}px`);

        const { clientWidth, clientHeight } = canvas;

        canvas.width = clientWidth;
        canvas.height = clientHeight;

        renderer.resize(clientWidth, clientHeight);
        framebufferMultisample.resize(clientWidth, clientHeight).attachRenderbuffer(new Renderbuffer(context, clientWidth, clientHeight));
        framebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
        // pingFramebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
        // pongFramebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
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
                        score += (ball.type + 1);

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

                            score += (ball.type + 1);

                            const velocityX = (2 * Math.random() - 1) * 0.001;
                            const velocityY = ball.velocityY;
                            gameObjects.push(new FallingBall(ball.x, ball.y, ballRadius, velocityX, velocityY, ballTexture, ball.type));
                        }
                    }

                    // Check first layer for orphan balls
                    const orphansSet = new Set();
                    for (const ball of firstLayer) {
                        if (getLinkedBalls(ball).length === 1) {
                            orphansSet.add(ball);

                            score += (ball.type + 1);

                            // Create falling balls for removed orphan balls
                            gameObjects.push(new FallingBall(ball.x, ball.y, ballRadius, ball.velocityX, ball.velocityY, ballTexture, ball.type));
                        }
                    }

                    if (orphansSet.size > 0) {
                        gameObjects = gameObjects.filter(gameObject => !orphansSet.has(gameObject));
                        firstLayer = firstLayer.filter(gameObject => !orphansSet.has(gameObject));
                    }
                }

                createOrResetProjectile();
                state = 'idle';
                break;
            }
        }

        // Reset projectile if outside the level
        if (projectile !== null && (projectile.y < 0 || projectile.y > 100)) {
            createOrResetProjectile();
            state = 'idle';
        }

        for (const gameObject of gameObjects) {
            if (gameObject.objectType !== 'Ball') continue;

            // Reset level if any ball reached bottom
            if (gameObject.y + gameObject.radius > 90) {
                createOrResetLevel();
                state = 'fail';
                break;
            }
        }

        // Reset level if all balls destroyed
        if (gameObjects.filter(gameObject => ['Ball', 'FallingBall', 'ExplodingBall', 'Particle'].includes(gameObject.objectType)).length === 0) {
            difficulty++;
            createOrResetLevel();
            state = 'win';
        }

        // Remove died objects
        const objectsToDelete = [];
        for (const gameObject of gameObjects) {
            if (['FallingBall', 'ExplodingBall', 'Particle'].includes(gameObject.objectType) && (gameObject.lifetime <= 0 || gameObject.y - gameObject.radius > 100)) {
                objectsToDelete.push(gameObject);
            }
        }

        gameObjects = gameObjects.filter(gameObject => !objectsToDelete.includes(gameObject));

        framebufferMultisample.bind();
        sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);
        ballTexture?.bind();
        renderer.clear().beginGeometry();

        for (const gameObject of gameObjects)
            gameObject.draw(renderer);

        // Draw next projectile type
        {
            const r = Ball.types[nextProjectileType][0];
            const g = Ball.types[nextProjectileType][1];
            const b = Ball.types[nextProjectileType][2];
            const a = Ball.types[nextProjectileType][3];

            const nextProjectileRadius = ballRadius * 0.5;
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

        sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);
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

        // Draw text
        if (font !== null) {
            const fontSize = 32;
            const atlasPxRange = 8;
            const atlasGlyphSize = 40;
            fontShaderProgram.bind()
                .setUniformMatrix('matrix', renderer.matrix)
                .setUniform('screenPxRange', Math.max(2, fontSize * atlasPxRange / atlasGlyphSize))
                .setUniform('outlineBias', 0.25);

            fontTexture.bind();
            renderer.beginGeometry();

            const scale = renderer.height / 100;
            const scoreStr = score.toString().padStart(6, '0') + ' ';
            const scoreWidth = renderer.measureString(font, scoreStr, fontSize);
            renderer.drawString(font, renderer.width / 2 + levelWidth / 2 * scale - scoreWidth, 0, scoreStr, fontSize, 1, 1, 1, 1);

            if (state === 'start') {
                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 1.5, 'Нажмите чтобы', fontSize, 1, 1, 1, 1);
                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 0.5, 'начать игру', fontSize, 1, 1, 1, 1);
            } else if (['win', 'fail'].includes(state)) {
                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 3.5, 'Уровень ' + difficulty, fontSize, 1, 1, 1, 1);
                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 1.5, 'Нажмите чтобы', fontSize, 1, 1, 1, 1);
                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 0.5, 'продолжить', fontSize, 1, 1, 1, 1);
            }

            renderer.endGeometry();
        }

        framebufferMultisample.unbind();
        framebufferMultisample.blit(framebuffer);

        // Bloom
        /*thresholdShaderProgram.bind().setUniform('threshold', 0.7);
        pongFramebuffer.bind();
        framebuffer.attachment.bind();
        renderer.beginGeometry();
        renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
        renderer.endGeometry();
        pongFramebuffer.unbind();

        for (let i = 0; i < 4; i++) {
            blurShaderProgram.bind().setUniform('horizontal', true);
            pingFramebuffer.bind();
            pongFramebuffer.attachment.bind();
            renderer.beginGeometry();
            renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
            renderer.endGeometry();
            pingFramebuffer.unbind();

            blurShaderProgram.bind().setUniform('horizontal', false);
            pongFramebuffer.bind();
            pingFramebuffer.attachment.bind();
            renderer.beginGeometry();
            renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
            renderer.endGeometry();
            pongFramebuffer.unbind();
        }*/

        context.viewport(0, 0, renderer.width, renderer.height);
        screenShaderProgram.bind();
        // screenShaderProgram.setUniformInteger('blurTexture', 1);
        framebuffer.attachment.bind();
        // pongFramebuffer.attachment.bind(1);
        renderer.beginGeometry();
        renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
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
