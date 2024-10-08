import * as Sentry from '@sentry/browser';
import { AudioSystem } from './audio.js';
import { ShaderProgram, Framebuffer, Renderbuffer, Texture, Font, Renderer, SpriteBatch } from './graphics.js';

class ClickEvent {
    constructor() {
        this.handled = false;
    }

    stop() {
        this.handled = true;
    }
}

class GameObject {
    get objectType() { return 'GameObject'; }

    getBounds() {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    /**
     * @param {ClickEvent} event
     */
    click(event) { }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) { }

    draw() { }

    drawText() { }
}

class ImageButton extends GameObject {
    get objectType() { return 'Button'; }

    constructor(x, y, width, height, texture, onClick = () => { }) {
        super();

        this.x = x;
        this.y = y;

        this.width = width;
        this.height = height;

        this.texture = texture;
        this.visible = true;

        this.onClick = onClick;
    }

    getBounds() {
        const { x, y, width, height } = this;
        return { x, y, width, height };
    }

    /**
     * @param {ClickEvent} event
     */
    click(event) {
        if (!this.visible) return;

        this.onClick(event);
    }

    draw() {
        if (!this.visible) return;

        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(this.width, this.height);

        spriteBatch.drawRectangle(textures[this.texture], x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
    }
}

class Button extends GameObject {
    get objectType() { return 'Button'; }

    constructor(x, y, width, height, text, onClick = () => { }) {
        super();

        this.x = x;
        this.y = y;

        this.width = width;
        this.height = height;

        this.text = text;
        this.fontSize = 5;
        this.visible = true;

        this.onClick = onClick;
    }

    getBounds() {
        const { x, y, width, height } = this;
        return { x, y, width, height };
    }

    /**
     * @param {ClickEvent} event
     */
    click(event) {
        if (!this.visible) return;

        this.onClick(event);
    }

    draw() {
        if (!this.visible) return;

        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(this.width, this.height);

        spriteBatch.drawRectangle(textures['blue_button00'], x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
    }

    drawText() {
        if (!this.visible) return;

        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(this.width, this.height);
        const [_w, fontSize] = sizeWorldToScreen(0, this.fontSize);

        let text = this.text;
        if (typeof text === 'function') {
            text = text();
        }

        textSpriteBatch.drawStringOffCenter(textures['font'], font, x + w / 2, y + h / 2 - fontSize * 0.75, translations[language][text], fontSize, 1, 1, 1, 1);
    }
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

        this.offsetX = 0;
        this.offsetY = 0;

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

        if (paused || hidden) {
            return;
        }

        if (state === 'idle') {
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
        }

        if (projectile !== null && isShot) {
            const distanceX = projectile.x - this.x;
            const distanceY = projectile.y - this.y;
            const distance = magnitude(distanceX, distanceY);
            const [directionX, directionY] = normalize(distanceX, distanceY);
            if (distance < 30) {
                this.offsetX = 0.9 * this.offsetX + 0.1 * (-250 / (distanceX * distanceX + distanceY * distanceY) * directionX);
                this.offsetY = 0.9 * this.offsetY + 0.1 * (-250 / (distanceX * distanceX + distanceY * distanceY) * directionY);
            } else {
                this.offsetX *= 0.975;
                this.offsetY *= 0.975;
            }
        } else {
            this.offsetX *= 0.975;
            this.offsetY *= 0.975;
        }
    }

    draw() {
        if (state === 'menu') return;

        const texture = textures[Ball.types[this.type].texture];
        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(2 * this.radius, 2 * this.radius);
        spriteBatch.drawRectangleOffCenter(texture, x + this.offsetX, y + this.offsetY, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
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

        if (paused || hidden) {
            return;
        }

        if (this.x - this.radius < -levelWidth / 2 && this.velocityX < 0
            || this.x + this.radius > levelWidth / 2 && this.velocityX > 0) {
            this.velocityX = -this.velocityX;
            playImpactSound();
            playMeowSound();
        }

        if (isShot)
            this.angle += deltaTime / 100;
    }

    draw() {
        if (state === 'menu') return;

        const texture = textures[Ball.types[this.type].texture];
        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(2 * this.radius, 2 * this.radius);
        spriteBatch.drawRotatedRectangleOffCenter(texture, x, y, w, h, this.angle, 0, 0, 1, 1, 1, 1, 1, 1);
    }
}

class Particle extends Ball {
    get objectType() { return 'Particle'; }

    constructor(x, y, radius, velocityX, velocityY, type) {
        super(x, y, radius, velocityX, velocityY, type);

        this.lifetime = 250 * Math.random();
    }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) {
        super.update(deltaTime);

        if (paused || hidden) {
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

    constructor(x, y, radius, velocityX, velocityY, type) {
        super(x, y, radius, velocityX, velocityY, type);

        this.lifetime = 5000;
    }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) {
        super.update(deltaTime);

        if (paused || hidden) {
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
        if (state === 'menu') return;

        const texture = textures[Ball.types[this.type].texture];
        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(2 * this.radius, 2 * this.radius);
        const alpha = (this.lifetime / 5000);
        spriteBatch.drawRectangleOffCenter(texture, x, y, w, h, 0, 0, 1, 1, 1, 1, 1, alpha);
    }
}

class ExplodingBall extends Ball {
    get objectType() { return 'ExplodingBall'; }

    constructor(x, y, radius, velocityX, velocityY, type, explodeAfter = 0) {
        super(x, y, radius, velocityX, velocityY, type);

        this.lifetime = 200;
        this.explodeAfter = explodeAfter;
    }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) {
        super.update(deltaTime);

        if (paused || hidden) {
            return;
        }

        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        if (this.explodeAfter > 0) {
            this.explodeAfter -= deltaTime;
            return;
        }

        if (this.lifetime === 200) {
            // Create particles
            for (let i = 0; i < 10; i++) {
                let velocityX = 2 * Math.random() - 1;
                let velocityY = 2 * Math.random() - 1;
                [velocityX, velocityY] = normalize(velocityX, velocityY);

                velocityX *= 0.025;
                velocityY *= 0.025;

                const particleRadius = ballRadius * 0.25;
                gameObjects.push(new Particle(this.x, this.y, particleRadius, velocityX, velocityY, this.type));
            }
        }

        this.radius *= 1.05;
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0 || this.y - this.radius > 100) {
            removeObject(this);
        }
    }

    draw() {
        if (state === 'menu') return;

        const texture = textures[Ball.types[this.type].texture];
        const [x, y] = positionWorldToScreen(this.x, this.y);
        const [w, h] = sizeWorldToScreen(2 * this.radius, 2 * this.radius);
        const alpha = (this.lifetime / 200);
        spriteBatch.drawRectangleOffCenter(texture, x, y, w, h, 0, 0, 1, 1, 1, 1, 1, alpha);
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
uniform sampler2D overlayTexture;

uniform float overlayBrightness;

in vec2 fragTexCoords;

out vec4 color;

void main() {
    vec3 result = texture(colorTexture, fragTexCoords).rgb + overlayBrightness * texture(overlayTexture, fragTexCoords).rgb;
    color = vec4(pow(result, vec3(1.0 / 2.4)), 1.0);
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

/** @type {SpriteBatch} */
let textSpriteBatch = null;

/** @type {Framebuffer} */
let framebufferMultisample = null;

/** @type {Framebuffer} */
let framebuffer = null;

/** @type {Framebuffer} */
let overlayFramebuffer = null;

/** @type {AudioSystem} */
let audioSystem = null

/** @type {AudioBuffer[]} */
let impactSounds = [];

let nextImpactSound = 0;

/** @type {AudioBuffer[]} */
let meowSounds = [];

let nextMeowSound = 0;

/** @type {GameObject[]} */
let gameObjects = [];

/** @type {Ball[]} */
let firstLayer = [];

/** @type {Projectile} */
let projectile = null;

let nextProjectileType = 0;

let state = 'start';

let btnContinue = null;
let btnNewGame = null;
let btnLanguage = null;
let btnMenu = null;
let btnPause = null;
let btnMute = null;

const ballRadius = 4;
const levelWidth = 45;

let difficulty = 1;
let score = 0;
let levelStartScore = 0;

let cursorX = 0;
let cursorY = 0;

let showTrajectory = false;

const LEADERBOARD = 'puzzlebobble';

let player = null;
let isShot = false;

const backgrounds = [
    { textureName: 'background_0', blurTextureName: 'background_0_blur' },
    { textureName: 'background_1', blurTextureName: 'background_1_blur' },
    { textureName: 'background_2', blurTextureName: 'background_2_blur' },
    { textureName: 'background_3', blurTextureName: 'background_3_blur' },
];

let backgroundIndex = 0;

const PADDING_BOTTOM = 0;

const translations = {
    ru: {
        newGame: 'Новая игра',
        continue: 'Продолжить',
        level: 'Уровень',
        win: 'Победа',
        fail: 'Поражение',
        press: 'Нажмите',
        toStartGame: 'чтобы начать игру',
        toContinue: 'чтобы продолжить',
        language: 'Язык: ',
        ru: 'Язык: Русский',
        en: 'Язык: Английский',
    },
    en: {
        newGame: 'New Game',
        continue: 'Continue',
        level: 'Level',
        win: 'Win',
        fail: 'Fail',
        press: 'Press',
        toStartGame: 'to start game',
        toContinue: 'to continue',
        ru: 'Language: Russian',
        en: 'Language: English',
    },
};

let language = 'en';

let hidden = false;
let paused = false;
let muted = false;

const FALL_SPEED_BASE = 0.0005;

let fallSpeed;

async function loadText(url) {
    const response = await fetch(url);
    return response.text();
}

async function loadBinary(url) {
    const response = await fetch(url);
    return response.arrayBuffer();
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

function positionWorldToScreen(x, y) {
    const offsetX = renderer.width / 2;
    const offsetY = -PADDING_BOTTOM;
    const scale = renderer.height / 100;
    return [scale * x + offsetX, scale * y + offsetY];
}

function positionScreenToWorld(x, y) {
    const offsetX = renderer.width / 2;
    const offsetY = -PADDING_BOTTOM;
    const scale = renderer.height / 100;
    return [(x - offsetX) / scale, (y - offsetY) / scale];
}

function sizeWorldToScreen(x, y) {
    const scale = renderer.height / 100;
    return [scale * x, scale * y];
}

function sizeScreenToWorld(x, y) {
    const scale = renderer.height / 100;
    return [x / scale, y / scale];
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

function getBallAt(balls, x, y) {
    for (const ball of balls) {
        if (dot2(x - ball.x, y - ball.y) < 1.25 * ball.radius * ball.radius) {
            return ball;
        }
    }

    return null;
}

function raycastBall(balls, x, y, dx, dy) {
    let ball = null;
    let step = 0;
    while (ball === null && step < 128) {
        ball = getBallAt(balls, x, y);

        x += dx * ballRadius / 2;
        y += dy * ballRadius / 2;

        if (x - ballRadius < -levelWidth / 2 || x + ballRadius > levelWidth / 2) {
            dx = -dx;
        }

        step++;
    }

    return ball;
}

function getNextProjectileTypes() {
    const balls = gameObjects.filter(gameObject => gameObject.objectType === 'Ball');
    const foundSet = new Set();
    const y0 = -5;
    for (let x0 = -10; x0 < 10; x0++) {
        const [x, y] = normalize(x0, y0);
        const ball = raycastBall(balls, 0, 90, x, y);
        if (ball !== null)
            foundSet.add(ball);
    }

    const found = [];
    for (const ball of [...foundSet]) {
        // Increase probability of balls with more linked balls of the same type
        const linkedCount = getLinkedBallsOfSameType(ball).length;
        for (let i = 0; i < linkedCount; i++)
            found.push(ball);
    }

    return found.map(ball => ball.type);
}

function getNextProjectileType() {
    const types = getNextProjectileTypes();
    if (types.length === 0) {
        const typesOnBoard = getBallTypesOnBoard();
        if (typesOnBoard.length === 0)
            return 0;

        return typesOnBoard[Math.floor(typesOnBoard.length * Math.random())];
    }

    return types[Math.floor(types.length * Math.random())];
}

function createOrResetProjectile() {
    gameObjects = gameObjects.filter(gameObject => gameObject !== projectile);

    const typesOnBoard = getBallTypesOnBoard();
    const currentType = typesOnBoard.length > 0 && typesOnBoard.includes(nextProjectileType) ? nextProjectileType : getNextProjectileType();
    nextProjectileType = getNextProjectileType();

    gameObjects.push(projectile = new Projectile(0, 95, ballRadius, 0, 0, currentType));
}

function createOrResetLevel() {
    gameObjects = gameObjects.filter(gameObject => gameObject.objectType !== 'Ball');
    firstLayer = [];

    fallSpeed = FALL_SPEED_BASE * Math.pow(1.1, difficulty);

    const minY = -difficulty;
    for (let y = minY; y < 5; y++)
        for (let x = -2; x < (y % 2 ? 2 : 3); x++) {
            const type = Math.floor(Math.min(difficulty + 3, Ball.types.length) * Math.random());
            const gameObject = new Ball(2 * ballRadius * x + (y % 2 ? ballRadius : 0), ballRadius + 2 * ballRadius * y, ballRadius, 0, fallSpeed, type);
            gameObjects.push(gameObject);

            if (y === minY) firstLayer.push(gameObject);
        }

    backgroundIndex = Math.floor(difficulty / 3) % backgrounds.length;

    nextProjectileType = getNextProjectileTypes();
    createOrResetProjectile();
}

function resize() {
    const width = document.documentElement.clientWidth * window.devicePixelRatio;
    const height = document.documentElement.clientHeight * window.devicePixelRatio;

    canvas.width = width;
    canvas.height = height;

    renderer.resize(width, height);
    framebufferMultisample.resize(width, height).attachRenderbuffer(new Renderbuffer(context, width, height));
    framebuffer.resize(width, height).attachTexture(new Texture(context, context.TEXTURE_2D, width, height));
    overlayFramebuffer.resize(width, height).attachTexture(new Texture(context, context.TEXTURE_2D, width, height));
}

function continueGame() {
    state = 'idle';

    btnContinue.visible = false;
    btnNewGame.visible = false;
    btnLanguage.visible = false;

    btnMenu.visible = true;
    btnPause.visible = true;
    btnMute.visible = true;
}

function newGame() {
    difficulty = 1;
    score = 0;
    levelStartScore = 0;
    state = 'idle';
    isShot = false;
    createOrResetLevel();

    btnContinue.visible = false;
    btnNewGame.visible = false;
    btnLanguage.visible = false;

    btnMenu.visible = true;
    btnPause.visible = true;
    btnMute.visible = true;
}

function setLanguage(value) {
    const availableLanguages = Object.keys(translations);
    if (availableLanguages.includes(value))
        language = value;
    else if (['be', 'kk', 'uk', 'uz'].includes(value))
        language = 'ru';
    else
        language = 'en';

    btnLanguage.text = language;

    Sentry.setTag('language', language);
    console.log(`Language changed to ${language}`);
}

function nextLanguage() {
    const availableLanguages = Object.keys(translations);
    const languageIndex = availableLanguages.findIndex(item => item === language);
    if (languageIndex === -1 || languageIndex === availableLanguages.length - 1)
        setLanguage(availableLanguages[0]);
    else
        setLanguage(availableLanguages[languageIndex + 1]);

}

function menu() {
    state = 'menu';

    btnContinue.visible = true;
    btnNewGame.visible = true;
    btnLanguage.visible = true;

    btnMenu.visible = false;
    btnPause.visible = false;
    btnMute.visible = false;
}

function togglePause() {
    paused = !paused;
    btnPause.texture = paused ? 'btn_play' : 'btn_pause';

    if (hidden || paused || muted) {
        audioSystem?.suspend();

        if (typeof window.yandexGamesSDK !== 'undefined')
            window.yandexGamesSDK.features.GameplayAPI?.stop();
    } else {
        audioSystem?.resume();

        if (typeof window.yandexGamesSDK !== 'undefined')
            window.yandexGamesSDK.features.GameplayAPI?.start();
    }
}

function toggleMute() {
    muted = !muted;
    btnMute.texture = muted ? 'btn_mute' : 'btn_unmute';

    if (hidden || paused || muted) {
        audioSystem?.suspend();

        if (typeof window.yandexGamesSDK !== 'undefined')
            window.yandexGamesSDK.features.GameplayAPI?.stop();
    } else {
        audioSystem?.resume();

        if (typeof window.yandexGamesSDK !== 'undefined')
            window.yandexGamesSDK.features.GameplayAPI?.start();
    }
}

async function main() {
    Sentry.init({
        dsn: "https://467bb70629ddf06d676a334cf029ae10@o4507607024140288.ingest.de.sentry.io/4507607028662352",
        tracesSampleRate: 1.0,
        ignoreErrors: ['No parent to post message'],
        release: '1.0.26',
    });

    GameAnalytics('configureBuild', '0.20.0');
    GameAnalytics('setEnabledInfoLog', true);
    GameAnalytics('initialize', '12fd1ab146688e461b8fa239357afb23', 'dd5cd8fd5ee98fae5f628cd28e16106e55d14a22');

    canvas = document.getElementById('canvas');
    if (canvas === null) return console.error('#canvas not found');

    context = canvas.getContext('webgl2', { antialias: false });
    if (context === null) return console.error("Can't create webgl context");

    sceneShaderProgram = new ShaderProgram(context, SCENE_VERTEX_SHADER_SOURCE, SCENE_FRAGMENT_SHADER_SOURCE);
    screenShaderProgram = new ShaderProgram(context, SCREEN_VERTEX_SHADER_SOURCE, SCREEN_FRAGMENT_SHADER_SOURCE);
    fontShaderProgram = new ShaderProgram(context, FONT_VERTEX_SHADER_SOURCE, FONT_FRAGMENT_SHADER_SOURCE);

    renderer = new Renderer(context, canvas.width, canvas.height);
    spriteBatch = new SpriteBatch(renderer);
    textSpriteBatch = new SpriteBatch(renderer);
    framebufferMultisample = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
    framebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
    overlayFramebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);

    await Promise.all([
        ...[
            'background_0', 'background_0_blur', 'background_1', 'background_1_blur', 'background_2', 'background_2_blur', 'background_3', 'background_3_blur',
            'ball0', 'ball1', 'ball2', 'ball3', 'ball4', 'ball5', 'ball6', 'ball7',
            'blue_button00', 'btn_menu', 'btn_mute', 'btn_pause', 'btn_play', 'btn_unmute', 'circle_05', 'lang_en', 'lang_ru', 'rays', 'white',
        ].map(name => loadImage(`./assets/${name}.png`).then(image => textures[name] = new Texture(context, context.TEXTURE_2D, image.width, image.height, context.SRGB8_ALPHA8).setImage(image))),
        loadImage('./assets/font.png').then(image => textures['font'] = new Texture(context, context.TEXTURE_2D, image.width, image.height, context.RGBA8).setImage(image)),
        loadBinary('./assets/font.bin').then(fontData => font = new Font().deserializeData(fontData)),
    ]);

    gameObjects.push(btnContinue = new Button(-0.45 * levelWidth, 35, 0.9 * levelWidth, 8, 'continue', continueGame));
    btnContinue.fontSize = 4.5;

    gameObjects.push(btnNewGame = new Button(-0.45 * levelWidth, 45, 0.9 * levelWidth, 8, 'newGame', newGame));
    gameObjects.push(btnLanguage = new Button(-0.45 * levelWidth, 55, 0.9 * levelWidth, 8, language, nextLanguage));
    btnLanguage.fontSize = 3;

    gameObjects.push(btnMenu = new ImageButton(-0.45 * levelWidth, 2, 8, 8, 'btn_menu', menu));
    btnMenu.visible = false;

    gameObjects.push(btnPause = new ImageButton(-0.45 * levelWidth + 10, 2, 8, 8, 'btn_pause', togglePause));
    btnPause.visible = false;

    gameObjects.push(btnMute = new ImageButton(-0.45 * levelWidth + 20, 2, 8, 8, 'btn_unmute', toggleMute));
    btnMute.visible = false;

    document.addEventListener('visibilitychange', function () {
        hidden = document.hidden;

        if (hidden || paused || muted) {
            audioSystem?.suspend();

            if (typeof window.yandexGamesSDK !== 'undefined')
                window.yandexGamesSDK.features.GameplayAPI?.stop();
        } else {
            audioSystem?.resume();

            if (typeof window.yandexGamesSDK !== 'undefined')
                window.yandexGamesSDK.features.GameplayAPI?.start();
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

            // Load meow sounds
            Promise.all([
                loadAudio('./assets/meow1.mp3'),
                loadAudio('./assets/meow2.mp3'),
                loadAudio('./assets/meow3.mp3'),
                loadAudio('./assets/meow4.mp3'),
                loadAudio('./assets/meow5.mp3'),
                loadAudio('./assets/meow6.mp3'),
                loadAudio('./assets/meow7.mp3'),
                loadAudio('./assets/meow8.mp3'),
                loadAudio('./assets/meow9.mp3'),
                loadAudio('./assets/meow10.mp3'),
                loadAudio('./assets/meow11.mp3'),
                loadAudio('./assets/meow12.mp3'),
                loadAudio('./assets/meow13.mp3'),
                loadAudio('./assets/meow14.mp3'),
                loadAudio('./assets/meow15.mp3'),
                loadAudio('./assets/meow16.mp3'),
                loadAudio('./assets/meow17.mp3'),
                loadAudio('./assets/meow18.mp3'),
                loadAudio('./assets/meow19.mp3'),
                loadAudio('./assets/meow20.mp3'),
                loadAudio('./assets/meow21.mp3'),
                loadAudio('./assets/meow22.mp3'),
            ]).then(result => meowSounds = result);
        }

        cursorX = event.clientX * window.devicePixelRatio;
        cursorY = event.clientY * window.devicePixelRatio;

        const clickEvent = new ClickEvent();
        for (const button of gameObjects.filter(gameObject => gameObject.objectType === 'Button')) {
            if (!button.visible) continue;

            const { x, y, width, height } = button.getBounds();
            const [x1, y1] = positionWorldToScreen(x, y);
            const [w1, h1] = sizeWorldToScreen(width, height);
            if (cursorX > x1 && cursorX <= x1 + w1 && cursorY > y1 && cursorY <= y1 + h1) {
                return button.click(clickEvent);
            }
        }

        if (state === 'start') {
            state = 'idle';

            btnContinue.visible = false;
            btnNewGame.visible = false;
            btnLanguage.visible = false;

            btnMenu.visible = true;
            btnPause.visible = true;
            btnMute.visible = true;

            GameAnalytics('addProgressionEvent', 'Start', `level_${difficulty.toString().padStart(3, '0')}`, '', '', score);
        } else if (['win', 'fail'].includes(state)) {
            if (typeof window.yandexGamesSDK !== 'undefined') {
                audioSystem?.suspend();
                window.yandexGamesSDK.features.GameplayAPI?.stop();
                paused = true;

                window.yandexGamesSDK.adv.showFullscreenAdv({
                    callbacks: {
                        onClose() {
                            createOrResetLevel();
                            audioSystem?.resume();
                            window.yandexGamesSDK.features.GameplayAPI?.start();
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

        if (paused || hidden || isShot) return;

        cursorX = event.clientX * window.devicePixelRatio;
        cursorY = event.clientY * window.devicePixelRatio;

        for (const button of gameObjects.filter(gameObject => gameObject.objectType === 'Button')) {
            if (!button.visible) continue;

            const { x, y, width, height } = button.getBounds();
            const [x1, y1] = positionWorldToScreen(x, y);
            const [w1, h1] = sizeWorldToScreen(width, height);
            if (cursorX > x1 && cursorX <= x1 + w1 && cursorY > y1 && cursorY <= y1 + h1) {
                return;
            }
        }

        const [_x, y] = positionScreenToWorld(cursorX, cursorY);
        showTrajectory = event.button === 0 && y < 90;
    });

    document.addEventListener('pointermove', event => {
        event.preventDefault();

        if (paused || hidden || isShot) return;

        cursorX = event.clientX * window.devicePixelRatio;
        cursorY = event.clientY * window.devicePixelRatio;

        for (const button of gameObjects.filter(gameObject => gameObject.objectType === 'Button')) {
            if (!button.visible) continue;

            const { x, y, width, height } = button.getBounds();
            const [x1, y1] = positionWorldToScreen(x, y);
            const [w1, h1] = sizeWorldToScreen(width, height);
            if (cursorX > x1 && cursorX <= x1 + w1 && cursorY > y1 && cursorY <= y1 + h1) {
                return;
            }
        }

        const [_x, y] = positionScreenToWorld(cursorX, cursorY);
        showTrajectory = event.buttons === 1 && y < 90;
    });

    document.addEventListener('pointerup', event => {
        event.preventDefault();

        if (paused || hidden) return;

        cursorX = event.clientX * window.devicePixelRatio;
        cursorY = event.clientY * window.devicePixelRatio;

        for (const button of gameObjects.filter(gameObject => gameObject.objectType === 'Button')) {
            if (!button.visible) continue;

            const { x, y, width, height } = button.getBounds();
            const [x1, y1] = positionWorldToScreen(x, y);
            const [w1, h1] = sizeWorldToScreen(width, height);
            if (cursorX > x1 && cursorX <= x1 + w1 && cursorY > y1 && cursorY <= y1 + h1) {
                return;
            }
        }

        const [worldCursorX, worldCursorY] = positionScreenToWorld(cursorX, cursorY);
        if (state === 'idle' && !isShot && event.button === 0 && worldCursorY < 90) {
            isShot = true;

            const offsetX = worldCursorX;
            const offsetY = Math.min(worldCursorY, 95) - 100;

            const [directionX, directionY] = normalize(offsetX, offsetY);

            const speed = 0.05;

            projectile.velocityX = directionX * speed;
            projectile.velocityY = directionY * speed;
        } else if (state === 'idle' && !isShot && (event.button === 2 || event.button === 0 && worldCursorY >= 90)) {
            const type = projectile.type;
            projectile.type = nextProjectileType;
            nextProjectileType = type;
        }

        showTrajectory = false;
    });

    resize();
    addEventListener('resize', resize);

    const deviceLanguage = navigator.language.slice(0, 2).toLowerCase();
    console.log(`Device language: ${deviceLanguage}`);
    setLanguage(deviceLanguage);

    requestAnimationFrame(update);

    const lastDifficulty = Number(localStorage.getItem('last_difficulty') || 0);
    if (lastDifficulty > 1) {
        difficulty = lastDifficulty;
        state = 'menu';
    } else {
        btnContinue.visible = false;
        btnNewGame.visible = false;
        btnLanguage.visible = false;
    }

    const lastScore = Number(localStorage.getItem('last_score') || 0);
    if (lastScore > 0) {
        score = lastScore;
        levelStartScore = lastScore;
    }

    Sentry.setContext('game', { level: difficulty });

    createOrResetLevel();
    console.log('Game ready');

    await window.yandexGamesSDKPromise;

    if (typeof window.yandexGamesSDK !== 'undefined') {
        window.yandexGamesSDK.features.LoadingAPI?.ready();
        console.log('Yandex Games SDK ready');

        const yandexGamesSDKLanguage = window.yandexGamesSDK.environment.i18n.lang;
        console.log(`SDK language: ${yandexGamesSDKLanguage}`);
        setLanguage(yandexGamesSDKLanguage);

        window.yandexGamesSDK.getPlayer({ scopes: false }).then(result => {
            player = result;
            Sentry.setUser({ id: result });
            GameAnalytics('configureUserId', result);
        });

        window.yandexGamesSDK.adv.getBannerAdvStatus().then(({ stickyAdvIsShowing, reason }) => {
            if (!stickyAdvIsShowing)
                window.yandexGamesSDK.adv.showBannerAdv();
            else if (reason)
                console.error(reason);
        });
    }
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

function playImpactSound(offset = 0) {
    if (audioSystem === null || muted || impactSounds.length === 0) return;

    audioSystem.play(impactSounds[nextImpactSound++ % impactSounds.length], false, offset);
}

function playMeowSound(offset = 0) {
    if (audioSystem === null || muted || meowSounds.length === 0) return;

    audioSystem.play(meowSounds[nextMeowSound++ % meowSounds.length], false, offset);
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
    requestAnimationFrame(update);

    const deltaTime = Math.min((prevTimestamp !== null) ? timestamp - prevTimestamp : 0, MAX_DELTA_TIME);
    prevTimestamp = timestamp;

    for (const gameObject of gameObjects)
        gameObject.update(deltaTime);

    // If all balls are on top, pull them down
    if (state === 'idle') {
        let maxY = 0;
        const balls = gameObjects.filter(gameObject => gameObject.objectType === 'Ball');
        for (const ball of balls) {
            if (ball.y > maxY)
                maxY = ball.y;
        }

        const [_x, y] = positionScreenToWorld(0, 0);
        if (maxY < y + 4 * ballRadius && maxY < 50) {
            for (const ball of balls)
                ball.y += deltaTime / 100;
        }
    }

    if (isShot) {
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
                playMeowSound();

                // Add ball on the contact point
                const addedBall = new Ball(x, y, gameObject.radius, gameObject.velocityX, gameObject.velocityY, projectile.type);
                gameObjects.push(addedBall);

                const linkedSet = new Set(getLinkedBallsOfSameType(addedBall));
                if (linkedSet.size > 2) {
                    for (const ball of [...linkedSet]) {
                        // Remove linked balls
                        removeObject(ball);
                        score += Ball.types[ball.type].score;

                        const explodeAfter = 5 * magnitude(addedBall.x - ball.x, addedBall.y - ball.y);

                        // Create exploding ball for removed linked balls
                        const explodingBall = new ExplodingBall(ball.x, ball.y, ballRadius, ball.velocityX, ball.velocityY, ball.type, explodeAfter);
                        gameObjects.push(explodingBall);
                    }

                    let timeOffset = 0;
                    for (let i = 0; i < Math.min(linkedSet.size, 3); i++) {
                        playMeowSound(timeOffset += 75 + Math.random() * 50);
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
                isShot = false;
                break;
            }
        }
    }

    // Reset projectile if outside the level
    if (projectile !== null && (projectile.y < 0 || projectile.y > 100)) {
        setTimeout(createOrResetProjectile);
        isShot = false;
    }

    if (objectDeleteQueue.size) {
        gameObjects = gameObjects.filter(gameObject => !objectDeleteQueue.has(gameObject));
        firstLayer = firstLayer.filter(gameObject => !objectDeleteQueue.has(gameObject));
        objectDeleteQueue.clear();
    }

    // Set state to fail if any ball reached bottom
    if (state === 'idle') {
        const balls = gameObjects.filter(gameObject => gameObject.objectType === 'Ball');
        for (const ball of balls) {
            if (ball.y + ball.radius > 90) {
                score = levelStartScore;
                state = 'fail';
                isShot = false;

                GameAnalytics('addProgressionEvent', 'Fail', `level_${difficulty.toString().padStart(3, '0')}`, '', '', score);
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
        isShot = false;

        // Submit score
        if (player !== null && typeof window.yandexGamesSDK !== 'undefined') {
            window.yandexGamesSDK.isAvailableMethod('leaderboards.setLeaderboardScore').then(result => {
                if (!result) return;

                window.yandexGamesSDK.getLeaderboards().then(leaderboards => leaderboards.setLeaderboardScore(LEADERBOARD, score));
            })
        }

        Sentry.setContext('game', { level: difficulty });

        GameAnalytics('addProgressionEvent', 'Complete', `level_${difficulty.toString().padStart(3, '0')}`, '', '', score);
    }

    framebufferMultisample.bind();
    renderer.clear(Math.pow(0.63, 2.2), Math.pow(0.88, 2.2), Math.pow(0.98, 2.2), 1);
    sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);

    if (state === 'menu') {
        // Draw background
        {
            spriteBatch.begin();

            const texture = textures[backgrounds[backgroundIndex].blurTextureName];
            const scale = renderer.height / 100;
            const x = renderer.width / 2;
            const y = renderer.height / 2;
            const w = 4 * levelWidth * scale;
            const h = 2 * renderer.height;
            spriteBatch.drawRectangleOffCenter(texture, x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);

            const texture1 = textures[backgrounds[backgroundIndex].textureName];
            const [w1, _h1] = sizeWorldToScreen(levelWidth, 0);
            spriteBatch.drawRectangleOffCenter(texture1, renderer.width / 2, renderer.height / 2, w1, renderer.height, 0, 0, 1, 1, 1, 1, 1, 1);

            spriteBatch.end();
        }

        // Draw text background
        spriteBatch.begin();
        spriteBatch.drawRectangle(textures['white'], 0, 0, renderer.width, renderer.height, 0, 0, 1, 1, 0, 0, 0, 0.75);
        spriteBatch.drawRotatedRectangleOffCenter(textures['rays'], renderer.width / 2, renderer.height / 2, renderer.height * 0.5, renderer.height * 0.5, timestamp / 10000, 0, 0, 1, 1, 1, 1, 1, 0.5);

        for (const gameObject of gameObjects)
            gameObject.draw();

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

            textSpriteBatch.begin();

            for (const gameObject of gameObjects)
                gameObject.drawText();

            textSpriteBatch.end();
        }
    } else {
        spriteBatch.begin();

        // Draw background
        {
            const texture = textures[backgrounds[backgroundIndex].blurTextureName];
            const scale = renderer.height / 100;
            const x = renderer.width / 2;
            const y = renderer.height / 2;
            const w = 4 * levelWidth * scale;
            const h = 2 * renderer.height;
            spriteBatch.drawRectangleOffCenter(texture, x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);

            const texture1 = textures[backgrounds[backgroundIndex].textureName];
            const [w1, _h1] = sizeWorldToScreen(levelWidth, 0);
            spriteBatch.drawRectangleOffCenter(texture1, renderer.width / 2, renderer.height / 2, w1, renderer.height, 0, 0, 1, 1, 1, 1, 1, 1);
        }

        for (const gameObject of gameObjects.filter(gameObject => gameObject.objectType !== 'Button'))
            gameObject.draw();

        for (const gameObject of gameObjects.filter(gameObject => gameObject.objectType === 'Button'))
            gameObject.draw();

        // Draw next projectile type
        {
            const nextProjectileRadius = ballRadius * 0.5;
            const [x, y] = positionWorldToScreen(-7, 95);
            const [w, h] = sizeWorldToScreen(2 * nextProjectileRadius, 2 * nextProjectileRadius);
            spriteBatch.drawRectangleOffCenter(textures[Ball.types[nextProjectileType].texture], x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
        }

        if (showTrajectory && state === 'idle' && projectile !== null)
            drawTrajectory();

        // Draw border
        {
            const [x, y] = positionWorldToScreen(0, 90);
            const [w, h] = sizeWorldToScreen(levelWidth, 0.2);
            spriteBatch.drawRectangleOffCenter(textures['white'], x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
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

            textSpriteBatch.begin();

            if (state !== 'win' && state !== 'fail') {
                const [_w, screenFontSize] = sizeWorldToScreen(0, 4);
                const scoreStr = score.toString().padStart(6, '0') + ' ';
                const scoreWidth = renderer.measureString(font, scoreStr, screenFontSize);
                const [x, y] = positionWorldToScreen(levelWidth / 2, 89);
                textSpriteBatch.drawString(textures['font'], font, x - scoreWidth, y - screenFontSize, scoreStr, screenFontSize, 1, 1, 1, 1);
            }

            if (state === 'start') {
                if (difficulty === 1) {
                    const [_w, screenFontSize] = sizeWorldToScreen(0, 4);
                    let [x, y] = positionWorldToScreen(0, 50);
                    y -= screenFontSize;
                    textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].press, screenFontSize, 1, 1, 1, 1);

                    y += screenFontSize;
                    textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].toStartGame, screenFontSize, 1, 1, 1, 1);
                } else {
                    let [_w, screenFontSize] = sizeWorldToScreen(0, 4);
                    let [x, y] = positionWorldToScreen(0, 50);
                    y -= screenFontSize * 1.5;
                    textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].level + ' ' + difficulty, screenFontSize, 1, 1, 1, 1);

                    y += screenFontSize * 1.5;
                    screenFontSize *= 0.75;
                    textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].press, screenFontSize * 0.75, 1, 1, 1, 1);

                    y += screenFontSize;
                    textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].toContinue, screenFontSize * 0.75, 1, 1, 1, 1);
                }
            } else if (state === 'win') {
                let [_w, screenFontSize] = sizeWorldToScreen(0, 4);
                let [x, y] = positionWorldToScreen(0, 50);
                y -= screenFontSize * 1.5;
                textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].win, screenFontSize, 1, 1, 1, 1);

                y += screenFontSize * 1.5;
                screenFontSize *= 0.75;
                textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].press, screenFontSize * 0.75, 1, 1, 1, 1);

                y += screenFontSize;
                textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].toContinue, screenFontSize * 0.75, 1, 1, 1, 1);
            } else if (state === 'fail') {
                let [_w, screenFontSize] = sizeWorldToScreen(0, 4);
                let [x, y] = positionWorldToScreen(0, 50);
                y -= screenFontSize * 1.5;
                textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].fail, screenFontSize, 1, 1, 1, 1);

                y += screenFontSize * 1.5;
                screenFontSize *= 0.75;
                textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].press, screenFontSize * 0.75, 1, 1, 1, 1);

                y += screenFontSize;
                textSpriteBatch.drawStringOffCenter(textures['font'], font, x, y, translations[language].toContinue, screenFontSize * 0.75, 1, 1, 1, 1);
            }

            textSpriteBatch.end();
        }
    }

    framebufferMultisample.unbind();
    framebufferMultisample.blit(framebuffer);

    framebufferMultisample.bind();
    renderer.clear(0, 0, 0, 0);
    sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);

    if (showTrajectory && state === 'idle' && projectile !== null) {
        spriteBatch.begin();

        projectile.draw();
        drawTrajectory();

        spriteBatch.end();
    }

    framebufferMultisample.unbind();
    framebufferMultisample.blit(overlayFramebuffer);

    context.viewport(0, 0, renderer.width, renderer.height);
    screenShaderProgram.bind().setUniformInteger('overlayTexture', 1).setUniform('overlayBrightness', (Math.sin(8 * timestamp / 1000) + 1) / 2);
    framebuffer.attachment.bind();
    overlayFramebuffer.attachment.bind(1);
    renderer.beginGeometry();
    renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
    renderer.endGeometry();
}

function drawTrajectory() {
    let [clientX, clientY] = positionScreenToWorld(cursorX, cursorY);
    clientY = Math.min(clientY, 95);

    const offsetX = clientX;
    const offsetY = clientY - 100;

    let [directionX, directionY] = normalize(offsetX, offsetY);

    let x = projectile.x;
    let y = projectile.y;

    const balls = gameObjects.filter(gameObject => gameObject.objectType === 'Ball');

    for (let i = 1; i <= 1000; i++) {
        x += directionX / 10;
        y += directionY / 10;

        if (x - projectile.radius < -levelWidth / 2 || x + projectile.radius > levelWidth / 2) {
            directionX = -directionX;
        }

        if (i % 50 === 0) {
            for (const ball of balls) {
                if (dot2(x - ball.x, y - ball.y) < 1.5 * ballRadius * ballRadius)
                    return;
            }

            const trajectoryBallRadius = ballRadius / 3;
            const [x1, y1] = positionWorldToScreen(x, y);
            const [w, h] = sizeWorldToScreen(2 * trajectoryBallRadius, 2 * trajectoryBallRadius);
            spriteBatch.drawRectangleOffCenter(textures['circle_05'], x1, y1, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
        }
    }
}

function saveFile(name, data) {
    const url = URL.createObjectURL(new Blob([data]));

    const link = document.createElement('a');
    link.href = url;
    link.download = name;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
    });
}

(document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', main) : main();
