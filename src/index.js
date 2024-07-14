(() => {
    class GameObject {
        get objectType() { return 'GameObject'; }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) { }

        draw() { }
    }

    class Ball extends GameObject {
        static types = [
            { texture: 'ball0', score: 1 },
            { texture: 'ball1', score: 2 },
            { texture: 'ball2', score: 3 },
            { texture: 'ball3', score: 4 },
            { texture: 'ball4', score: 5 },
            { texture: 'ball5', score: 6 },
            { texture: 'ball6', score: 7 },
            { texture: 'ball7', score: 8 },
        ];

        get objectType() { return 'Ball'; }

        constructor(x, y, radius, velocityX, velocityY, type) {
            super();

            this.x = x;
            this.y = y;

            this.radius = radius;

            this.velocityX = velocityX;
            this.velocityY = velocityY;

            this.type = type;
        }

        /**
         * @param {number} deltaTime
         */
        update(deltaTime) {
            super.update(deltaTime);

            if (paused) {
                return;
            }

            if (state === 'idle' || state === 'shot') {
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
            }
        }

        draw() {
            super.draw();

            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            const texture = textures[Ball.types[this.type].texture];
            spriteBatch.drawRectangleOffCenter(texture, x, y, scale * this.radius * 2, scale * this.radius * 2, 0, 0, 1, 1, 1, 1, 1, 1);
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

            if (paused) {
                return;
            }

            if (this.x - this.radius < -levelWidth / 2 && this.velocityX < 0
                || this.x + this.radius > levelWidth / 2 && this.velocityX > 0) {
                this.velocityX = -this.velocityX;
                playImpactSound();
            }

            if (state === 'shot')
                this.angle += deltaTime / 100;
        }

        draw() {
            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            const texture = textures[Ball.types[this.type].texture];
            spriteBatch.drawRotatedRectangleOffCenter(texture, x, y, scale * this.radius * 2, scale * this.radius * 2, this.angle, 0, 0, 1, 1, 1, 1, 1, 1);
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

            if (paused) {
                return;
            }

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            this.velocityY += 0.000002 * deltaTime * deltaTime;

            this.lifetime -= deltaTime;
            if (this.lifetime <= 0 || this.y - this.radius > 100) {
                removeObject(this);
            }
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

            if (paused) {
                return;
            }

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            this.velocityY += 0.000002 * deltaTime * deltaTime;

            this.lifetime -= deltaTime;
            if (this.lifetime <= 0 || this.y - this.radius > 100) {
                removeObject(this);
            }
        }

        draw() {
            const alpha = (this.lifetime / 5000);
            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            const texture = textures[Ball.types[this.type].texture];
            spriteBatch.drawRectangleOffCenter(texture, x, y, scale * this.radius * 2, scale * this.radius * 2, 0, 0, 1, 1, 1, 1, 1, alpha);
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

            if (paused) {
                return;
            }

            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;

            this.radius *= 1.05;
            this.lifetime -= deltaTime;
            if (this.lifetime <= 0 || this.y - this.radius > 100) {
                removeObject(this);
            }
        }

        draw() {
            const alpha = (this.lifetime / 200);
            const scale = renderer.height / 100;
            const [x, y] = worldToScreen(this.x, this.y);
            const texture = textures[Ball.types[this.type].texture];
            spriteBatch.drawRectangleOffCenter(texture, x, y, scale * this.radius * 2, scale * this.radius * 2, 0, 0, 1, 1, 1, 1, 1, alpha);
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

    color = fragColor * innerOpacity + vec4(vec3(0.0), 1.0) * outerOpacity;
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

in vec2 fragTexCoords;

out vec4 color;

void main() {
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
    let screenShaderProgram = null;

    /** @type {ShaderProgram} */
    let fontShaderProgram = null;

    /** @type {Object.<string, Texture>} */
    const textures = {};

    /** @type {Font} */
    let font = null;

    /** @type {Renderer} */
    let renderer = null;

    /** @type {SpriteBatch} */
    let spriteBatch = null;

    /** @type {Framebuffer} */
    let framebufferMultisample = null;

    /** @type {Framebuffer} */
    let framebuffer = null;

    /** @type {AudioSystem} */
    let audioSystem = null

    /** @type {AudioBuffer[]} */
    let impactSounds = [];

    let nextImpactSound = 0;

    /** @type {GameObject[]} */
    let gameObjects = [];

    /** @type {Ball[]} */
    let firstLayer = [];

    /** @type {Projectile} */
    let projectile = null;

    let nextProjectileType = 0;

    let state = 'start';

    const ballRadius = 4;
    const levelWidth = 45;

    let difficulty = 1;
    let score = 0;
    let levelStartScore = 0;

    let cursorX = 0;
    let cursorY = 0;

    let showTrajectory = false;
    let paused = false;

    const LEADERBOARD = 'puzzlebobble';

    let player = null;

    const PADDING_BOTTOM = 109;
    const BACKGROUND_COUNT = 3;

    let background = 0;

    async function loadText(url) {
        const response = await fetch(url);
        return response.text();
    }

    function loadImage(url) {
        return new Promise(resolve => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.loading = 'eager';
            image.src = url;
        });
    }

    async function loadAudio(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return audioSystem.context.decodeAudioData(buffer);
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

    function dot(x0, y0, x1, y1) {
        return x0 * x1 + y0 * y1;
    }

    function dot2(x, y) {
        return x * x + y * y;
    }

    function magnitude(x, y) {
        return Math.sqrt(x * x + y * y);
    }

    function normalize(x, y) {
        const length = magnitude(x, y);
        return [x / length, y / length];
    }

    function getBallTypesOnBoard() {
        const types = new Set();
        for (const gameObject of gameObjects) {
            if (gameObject.objectType !== 'Ball') continue;

            types.add(gameObject.type);
        }

        return [...types];
    }

    function getNextProjectileType() {
        const limit = 8;
        return [...new Set(gameObjects.filter(gameObject => gameObject.objectType === 'Ball').sort((a, b) => b.y - a.y).slice(0, limit).map(gameObject => gameObject.type))];
    }

    function createOrResetProjectile() {
        gameObjects = gameObjects.filter(gameObject => gameObject !== projectile);

        const typesOnBoard = getBallTypesOnBoard();
        const possibleNextTypes = getNextProjectileType().filter(type => type !== nextProjectileType);
        const currentType = typesOnBoard.length > 0 ? (typesOnBoard.includes(nextProjectileType) ? nextProjectileType : typesOnBoard[Math.floor(typesOnBoard.length * Math.random())]) : 0;
        nextProjectileType = possibleNextTypes.length > 0 ? possibleNextTypes[Math.floor(possibleNextTypes.length * Math.random())] : 0;

        const scale = renderer.height / 100;
        gameObjects.push(projectile = new Projectile(0, 95 - PADDING_BOTTOM / scale, ballRadius, 0, 0, currentType));
    }

    function createOrResetLevel() {
        gameObjects = [];
        firstLayer = [];

        const minY = -difficulty;
        for (let y = minY; y < 5; y++)
            for (let x = -2; x < (y % 2 ? 2 : 3); x++) {
                const type = Math.floor(Math.min(difficulty + 3, Ball.types.length) * Math.random());
                const gameObject = new Ball(2 * ballRadius * x + (y % 2 ? ballRadius : 0), ballRadius + 2 * ballRadius * y, ballRadius, 0, 0.0005, type);
                gameObjects.push(gameObject);

                if (y === minY) firstLayer.push(gameObject);
            }

        background = Math.floor(Math.random() * BACKGROUND_COUNT);

        createOrResetProjectile();
    }

    function resize() {
        const { clientWidth, clientHeight } = canvas;

        canvas.width = clientWidth;
        canvas.height = clientHeight;

        renderer.resize(clientWidth, clientHeight);
        framebufferMultisample.resize(clientWidth, clientHeight).attachRenderbuffer(new Renderbuffer(context, clientWidth, clientHeight));
        framebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
    }

    async function main() {
        canvas = document.getElementById('canvas');
        if (canvas === null) return console.error('#canvas not found');

        context = canvas.getContext('webgl2', { antialias: false });
        if (context === null) return console.error("Can't create webgl context");

        sceneShaderProgram = new ShaderProgram(context, SCENE_VERTEX_SHADER_SOURCE, SCENE_FRAGMENT_SHADER_SOURCE);
        screenShaderProgram = new ShaderProgram(context, SCREEN_VERTEX_SHADER_SOURCE, SCREEN_FRAGMENT_SHADER_SOURCE);
        fontShaderProgram = new ShaderProgram(context, FONT_VERTEX_SHADER_SOURCE, FONT_FRAGMENT_SHADER_SOURCE);

        renderer = new Renderer(context, canvas.width, canvas.height);
        spriteBatch = new SpriteBatch(renderer);
        framebufferMultisample = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
        framebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);

        await Promise.all([
            Promise.all([loadImage('./assets/font.png'), loadText('./assets/font.csv')]).then(([fontImage, fontData]) => {
                textures['font'] = new Texture(context, context.TEXTURE_2D, fontImage.width, fontImage.height, context.RGBA8).setImage(fontImage);
                font = new Font(fontData, fontImage.width, fontImage.height);
            }),
            ...[
                'ball0', 'ball1', 'ball2', 'ball3', 'ball4', 'ball5', 'ball6', 'ball7',
                'background_0', 'background_0_blur', 'background_1', 'background_1_blur', 'background_2', 'background_2_blur',
                'rays', 'white', 'blue_button00',
            ].map(name => loadImage(`./assets/${name}.png`).then(image => textures[name] = new Texture(context, context.TEXTURE_2D, image.width, image.height, context.SRGB8_ALPHA8).setImage(image))),
        ]);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                audioSystem?.suspend();
                paused = true;
            } else {
                audioSystem?.resume();
                paused = false;
            }
        });

        document.addEventListener('click', event => {
            if (audioSystem === null) {
                // Init audio system
                audioSystem = new AudioSystem();
                audioSystem.resume();

                // Load impact sounds
                Promise.all([
                    loadAudio('./assets/impactGlass_light_000.mp3'),
                    loadAudio('./assets/impactGlass_light_001.mp3'),
                    loadAudio('./assets/impactGlass_light_002.mp3'),
                    loadAudio('./assets/impactGlass_light_003.mp3'),
                    loadAudio('./assets/impactGlass_light_004.mp3'),
                    loadAudio('./assets/impactGlass_medium_000.mp3'),
                    loadAudio('./assets/impactGlass_medium_001.mp3'),
                    loadAudio('./assets/impactGlass_medium_002.mp3'),
                    loadAudio('./assets/impactGlass_medium_003.mp3'),
                    loadAudio('./assets/impactGlass_medium_004.mp3'),
                ]).then(result => impactSounds = result);
            }

            if (state === 'menu') {
                cursorX = event.clientX;
                cursorY = event.clientY;

                const fontSize = 32;
                const scale = renderer.height / 100;
                if (cursorX > renderer.width / 2 - levelWidth * scale * 0.8 / 2 && cursorX < renderer.width / 2 + levelWidth * scale * 0.8 / 2) {
                    if (cursorY > renderer.height / 2 - fontSize * 1.0 - 72 / 2 && cursorY < renderer.height / 2 - fontSize * 1.0 + 72 / 2) {
                        state = 'idle';
                    } else if (cursorY > renderer.height / 2 + fontSize * 2.0 - 72 / 2 && cursorY < renderer.height / 2 + fontSize * 2.0 + 72 / 2) {
                        difficulty = 1;
                        score = 0;
                        levelStartScore = 0;
                        state = 'idle';
                        createOrResetLevel();
                    }
                }
            }
            else if (state === 'start') {
                state = 'idle';
            } else if (['win', 'fail'].includes(state)) {
                if (typeof window.yandexGamesSDK !== 'undefined') {
                    audioSystem?.suspend();
                    paused = true;

                    window.yandexGamesSDK.adv.showFullscreenAdv({
                        callbacks: {
                            onClose() {
                                createOrResetLevel();
                                audioSystem?.resume();
                                paused = false;
                                state = 'start';
                            },
                            onError(error) {
                                console.error(error);
                            }
                        }
                    });
                } else {
                    createOrResetLevel();
                    state = 'start';
                }
            }
        });

        document.addEventListener('contextmenu', event => event.preventDefault());

        document.addEventListener('pointerdown', event => {
            event.preventDefault();

            cursorX = event.clientX;
            cursorY = event.clientY;

            showTrajectory = event.button === 0 && (cursorY / renderer.height) < 0.9;
        });

        document.addEventListener('pointermove', event => {
            event.preventDefault();

            cursorX = event.clientX;
            cursorY = event.clientY;

            showTrajectory = event.buttons === 1 && (cursorY / renderer.height) < 0.9;
        });

        document.addEventListener('pointerup', event => {
            event.preventDefault();

            if (state === 'idle' && event.button === 0 && (cursorY / renderer.height) < 0.9) {
                state = 'shot';

                let [clientX, clientY] = screenToWorld(event.clientX, event.clientY);
                clientY = Math.min(clientY, 95);

                const offsetX = clientX;
                const offsetY = clientY - 100;

                const [directionX, directionY] = normalize(offsetX, offsetY);

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

        resize();
        addEventListener('resize', resize);

        requestAnimationFrame(update);
        console.log('Game ready');

        const lastDifficulty = Number(localStorage.getItem('last_difficulty') || 0);
        if (lastDifficulty > 1) {
            difficulty = lastDifficulty;
            state = 'menu';
        }

        const lastScore = Number(localStorage.getItem('last_score') || 0);
        if (lastScore > 0) {
            score = lastScore;
            levelStartScore = lastScore;
        }

        createOrResetLevel();

        await window.yandexGamesSDKPromise;
        window.yandexGamesSDK.features.LoadingAPI?.ready();
        console.log('Yandex Games SDK ready');

        window.yandexGamesSDK.getPlayer({ scopes: false }).then(p => player = p);
    }

    function getLinkedBalls(ball, except = []) {
        const linked = new Set([ball]);
        const checked = new Set();
        const queue = [ball];
        while (queue.length > 0) {
            const ball = queue.pop();
            const neighbours = getNeighbourBalls(ball).filter(ball => !except.includes(ball));
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
            if (gameObject.objectType !== 'Ball' || gameObject === ball) continue;

            const distance = magnitude(ball.x - gameObject.x, ball.y - gameObject.y);
            if (distance < (gameObject.radius + ball.radius) * 1.25) {
                neighbours.push(gameObject);
            }
        }

        return neighbours;
    }

    function playImpactSound() {
        if (impactSounds.length === 0) return;

        audioSystem.play(impactSounds[nextImpactSound++ % impactSounds.length]);
    }

    /** @type {Set<GameObject>} */
    const objectDeleteQueue = new Set();

    /**
     * @param {GameObject} gameObject
     */
    function removeObject(gameObject) {
        objectDeleteQueue.add(gameObject);
    }

    const MAX_DELTA_TIME = 1000 / 30;

    function update(timestamp) {
        const deltaTime = Math.min((prevTimestamp !== null) ? timestamp - prevTimestamp : 0, MAX_DELTA_TIME);
        prevTimestamp = timestamp;

        for (const gameObject of gameObjects)
            gameObject.update(deltaTime);

        if (state === 'shot') {
            // Check ball/projectile collision
            for (const gameObject of gameObjects) {
                if (gameObject.objectType !== 'Ball') continue;

                const offsetX = projectile.x - gameObject.x;
                const offsetY = projectile.y - gameObject.y;
                const distance = magnitude(offsetX, offsetY);
                if (distance < (gameObject.radius + projectile.radius) * 0.9) {
                    let x = gameObject.x;
                    let y = gameObject.y;
                    if (offsetY * offsetY > offsetX * offsetX) {
                        x += (offsetX > 0 ? gameObject.radius : -gameObject.radius);
                        y += 2 * gameObject.radius;
                    } else {
                        x += (offsetX > 0 ? 2 * gameObject.radius : -2 * gameObject.radius);
                    }

                    playImpactSound();

                    // Add ball on the contact point
                    const ball = new Ball(x, y, gameObject.radius, gameObject.velocityX, gameObject.velocityY, projectile.type);
                    gameObjects.push(ball);

                    const linkedSet = new Set(getLinkedBallsOfSameType(ball));
                    if (linkedSet.size > 2) {
                        for (const ball of [...linkedSet]) {
                            // Remove linked balls
                            removeObject(ball);
                            score += Ball.types[ball.type].score;

                            // Create exploding ball for removed linked balls
                            gameObjects.push(new ExplodingBall(ball.x, ball.y, ballRadius, ball.velocityX, ball.velocityY, ball.type));
                            setTimeout(playImpactSound, Math.random() * 250);

                            // Create particles for removed linked balls
                            for (let i = 0; i < 10; i++) {
                                let velocityX = 2 * Math.random() - 1;
                                let velocityY = 2 * Math.random() - 1;
                                [velocityX, velocityY] = normalize(velocityX, velocityY);

                                velocityX *= 0.025;
                                velocityY *= 0.025;

                                const particleRadius = ballRadius * 0.25;
                                gameObjects.push(new Particle(ball.x, ball.y, particleRadius, velocityX, velocityY, ball.type));
                            }
                        }

                        // Find neighbour balls
                        const neighboursSet = new Set();
                        for (const ball of [...linkedSet]) {
                            const ballNeighbours = getNeighbourBalls(ball).filter(ball => !linkedSet.has(ball));
                            for (const ball of ballNeighbours)
                                neighboursSet.add(ball);
                        }

                        // Find detached balls
                        const detachedSet = new Set();
                        const firstLayerSet = new Set(firstLayer.filter(ball => !linkedSet.has(ball)));
                        for (const neighbour of [...neighboursSet]) {
                            const linkedToNeighbour = getLinkedBalls(neighbour, [...linkedSet]);
                            if (linkedToNeighbour.filter(ball => firstLayerSet.has(ball)).length === 0)
                                for (const ball of linkedToNeighbour)
                                    detachedSet.add(ball);
                        }

                        if (detachedSet.size) {
                            for (const ball of [...detachedSet]) {
                                // Remove detached balls
                                removeObject(ball);
                                score += Ball.types[ball.type].score;

                                // Create falling balls for removed detached balls
                                const velocityX = (2 * Math.random() - 1) * 0.001;
                                const velocityY = ball.velocityY;
                                gameObjects.push(new FallingBall(ball.x, ball.y, ballRadius, velocityX, velocityY, ball.type));
                            }
                        }

                        // Check first layer for orphan balls
                        const orphansSet = new Set();
                        for (const ball of firstLayer.filter(ball => !linkedSet.has(ball)).filter(ball => !detachedSet.has(ball)))
                            if (getLinkedBalls(ball, [...linkedSet, ...detachedSet]).length === 1)
                                orphansSet.add(ball);

                        if (orphansSet.size) {
                            for (const ball of [...orphansSet]) {
                                // Remove orphan balls
                                removeObject(ball);
                                score += Ball.types[ball.type].score;

                                // Create falling balls for removed orphan balls
                                gameObjects.push(new FallingBall(ball.x, ball.y, ballRadius, ball.velocityX, ball.velocityY, ball.type));
                            }
                        }
                    }

                    setTimeout(createOrResetProjectile);
                    state = 'idle';
                    break;
                }
            }
        }

        // Reset projectile if outside the level
        if (projectile !== null && (projectile.y < 0 || projectile.y > 100)) {
            setTimeout(createOrResetProjectile);
            state = 'idle';
        }

        // Set state to fail if any ball reached bottom
        if (state === 'idle') {
            for (const gameObject of gameObjects) {
                if (gameObject.objectType !== 'Ball') continue;

                const scale = renderer.height / 100;
                if (gameObject.y + gameObject.radius > 90 - PADDING_BOTTOM / scale) {
                    score = levelStartScore;
                    state = 'fail';
                    break;
                }
            }
        }

        // Set state to win if all balls destroyed
        if (state === 'idle' && gameObjects.filter(gameObject => ['Ball', 'FallingBall', 'ExplodingBall', 'Particle'].includes(gameObject.objectType)).length === 0) {
            difficulty++;
            levelStartScore = score;

            localStorage.setItem('last_difficulty', difficulty);
            localStorage.setItem('last_score', score);

            state = 'win';

            // Submit score
            if (player !== null && typeof window.yandexGamesSDK !== 'undefined') {
                window.yandexGamesSDK.isAvailableMethod('leaderboards.setLeaderboardScore').then(result => {
                    if (!result) return;

                    window.yandexGamesSDK.getLeaderboards().then(leaderboards => leaderboards.setLeaderboardScore(LEADERBOARD, score));
                })
            }
        }

        if (objectDeleteQueue.size) {
            gameObjects = gameObjects.filter(gameObject => !objectDeleteQueue.has(gameObject));
            firstLayer = firstLayer.filter(gameObject => !objectDeleteQueue.has(gameObject));
            objectDeleteQueue.clear();
        }

        framebufferMultisample.bind();
        sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);
        renderer.clear();

        if (state === 'menu') {
            // Draw background
            {
                const scale = renderer.height / 100;
                spriteBatch.begin();
                spriteBatch.drawRectangleOffCenter(textures[`background_${background}_blur`], renderer.width / 2, renderer.height / 2, 4 * levelWidth * scale, 2 * renderer.height, 0, 0, 1, 1, 1, 1, 1, 1);
                spriteBatch.drawRectangleOffCenter(textures[`background_${background}`], renderer.width / 2, renderer.height / 2, levelWidth * scale, renderer.height, 0, 0, 1, 1, 1, 1, 1, 1);
                spriteBatch.end();
            }

            // Draw text background
            spriteBatch.begin();
            spriteBatch.drawRectangle(textures['white'], 0, 0, renderer.width, renderer.height, 0, 0, 1, 1, 0, 0, 0, 0.75);
            spriteBatch.drawRotatedRectangleOffCenter(textures['rays'], renderer.width / 2, renderer.height / 2, renderer.height * 0.5, renderer.height * 0.5, timestamp / 10000, 0, 0, 1, 1, 1, 1, 1, 0.5);
            spriteBatch.end();

            const fontSize = 32;

            // Draw buttons
            {
                const scale = renderer.height / 100;
                spriteBatch.begin();
                spriteBatch.drawRectangleOffCenter(textures['blue_button00'], renderer.width / 2, renderer.height / 2 - fontSize * 1.0, levelWidth * scale * 0.8, 72, 0, 0, 1, 1, 1, 1, 1, 1);
                spriteBatch.drawRectangleOffCenter(textures['blue_button00'], renderer.width / 2, renderer.height / 2 + fontSize * 2.0, levelWidth * scale * 0.8, 72, 0, 0, 1, 1, 1, 1, 1, 1);
                spriteBatch.end();
            }

            // Draw text
            if (font !== null) {
                const atlasPxRange = 8;
                const atlasGlyphSize = 40;
                fontShaderProgram.bind()
                    .setUniformMatrix('matrix', renderer.matrix)
                    .setUniform('screenPxRange', Math.max(2, fontSize * atlasPxRange / atlasGlyphSize))
                    .setUniform('outlineBias', 0.25);

                textures['font'].bind();
                renderer.beginGeometry();

                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 2.25, 'Продолжить', fontSize, 1, 1, 1, 1);
                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 1.25, `Уровень ${difficulty}`, fontSize * 0.75, 1, 1, 1, 1);

                renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 1.25, 'Новая игра', fontSize, 1, 1, 1, 1);

                renderer.endGeometry();
            }
        } else {
            spriteBatch.begin();

            // Draw background
            {
                const scale = renderer.height / 100;
                spriteBatch.drawRectangleOffCenter(textures[`background_${background}_blur`], renderer.width / 2, renderer.height / 2, 4 * levelWidth * scale, 2 * renderer.height, 0, 0, 1, 1, 1, 1, 1, 1);
                spriteBatch.drawRectangleOffCenter(textures[`background_${background}`], renderer.width / 2, renderer.height / 2, levelWidth * scale, renderer.height, 0, 0, 1, 1, 1, 1, 1, 1);
            }

            for (const gameObject of gameObjects)
                gameObject.draw();

            // Draw next projectile type
            {
                const nextProjectileRadius = ballRadius * 0.5;
                const scale = renderer.height / 100;
                const [x, y] = worldToScreen(-7, 95);
                spriteBatch.drawRectangleOffCenter(textures[Ball.types[nextProjectileType].texture], x, y - PADDING_BOTTOM, scale * nextProjectileRadius * 2, scale * nextProjectileRadius * 2, 0, 0, 1, 1, 1, 1, 1, 1);
            }

            spriteBatch.end();

            spriteBatch.begin();

            // Draw trajectory
            if (showTrajectory && state === 'idle' && projectile !== null) {
                let [clientX, clientY] = screenToWorld(cursorX, cursorY + PADDING_BOTTOM);
                clientY = Math.min(clientY, 95);

                const offsetX = clientX;
                const offsetY = clientY - 100;

                let [directionX, directionY] = normalize(offsetX, offsetY);

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
                        spriteBatch.drawRectangleOffCenter(textures[Ball.types[projectile.type].texture], x1, y1, scale * trajectoryBallRadius * 2, scale * trajectoryBallRadius * 2, 0, 0, 1, 1, 1, 1, 1, 0.25);
                    }
                }
            }

            // Draw border
            {
                const scale = renderer.height / 100;
                const [x2, y2] = worldToScreen(0, 90);
                spriteBatch.drawRectangleOffCenter(textures['white'], x2, y2 - PADDING_BOTTOM, levelWidth * scale, 0.2 * scale, 0, 0, 1, 1, 1, 1, 1, 1);
            }

            // Draw text background
            if (['start', 'win', 'fail'].includes(state)) {
                spriteBatch.drawRectangle(textures['white'], 0, 0, renderer.width, renderer.height, 0, 0, 1, 1, 0, 0, 0, 0.75);
                spriteBatch.drawRotatedRectangleOffCenter(textures['rays'], renderer.width / 2, renderer.height / 2, renderer.height * 0.5, renderer.height * 0.5, timestamp / 10000, 0, 0, 1, 1, 1, 1, 1, 0.5);
            }

            spriteBatch.end();

            // Draw text
            if (font !== null) {
                const fontSize = 32;
                const atlasPxRange = 8;
                const atlasGlyphSize = 40;
                fontShaderProgram.bind()
                    .setUniformMatrix('matrix', renderer.matrix)
                    .setUniform('screenPxRange', Math.max(2, fontSize * atlasPxRange / atlasGlyphSize))
                    .setUniform('outlineBias', 0.25);

                textures['font'].bind();
                renderer.beginGeometry();

                const scale = renderer.height / 100;
                const scoreStr = score.toString().padStart(6, '0') + ' ';
                const scoreWidth = renderer.measureString(font, scoreStr, fontSize);
                renderer.drawString(font, renderer.width / 2 + levelWidth / 2 * scale - scoreWidth, 0, scoreStr, fontSize, 1, 1, 1, 1);

                if (state === 'start') {
                    if (difficulty === 1) {
                        renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 1.75, 'Нажмите', fontSize, 1, 1, 1, 1);
                        renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 0.5, 'чтобы начать игру', fontSize, 1, 1, 1, 1);
                    } else {
                        renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 0.75, 'Уровень ' + difficulty, fontSize, 1, 1, 1, 1);

                        renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 2.75, 'Нажмите', fontSize * 0.75, 1, 1, 1, 1);
                        renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 3.75, 'чтобы продолжить', fontSize * 0.75, 1, 1, 1, 1);
                    }
                } else if (state === 'win') {
                    renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 0.75, 'Победа', fontSize, 1, 1, 1, 1);

                    renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 2.75, 'Нажмите', fontSize * 0.75, 1, 1, 1, 1);
                    renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 3.75, 'чтобы продолжить', fontSize * 0.75, 1, 1, 1, 1);
                } else if (state === 'fail') {
                    renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 - fontSize * 0.75, 'Поражение', fontSize, 1, 1, 1, 1);

                    renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 2.75, 'Нажмите', fontSize * 0.75, 1, 1, 1, 1);
                    renderer.drawStringOffCenter(font, renderer.width / 2, renderer.height / 2 + fontSize * 3.75, 'чтобы продолжить', fontSize * 0.75, 1, 1, 1, 1);
                }

                renderer.endGeometry();
            }
        }

        framebufferMultisample.unbind();
        framebufferMultisample.blit(framebuffer);

        context.viewport(0, 0, renderer.width, renderer.height);
        screenShaderProgram.bind();
        framebuffer.attachment.bind();
        renderer.beginGeometry();
        renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
        renderer.endGeometry();

        requestAnimationFrame(update);
    }

    (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', main) : main();
})();
