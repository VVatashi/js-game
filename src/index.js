(() => {
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

    /** @type {HTMLCanvasElement} canvas */
    let canvas = null;

    /** @type {WebGL2RenderingContext} context */
    let context = null;

    /** @type {number} prevTimestamp */
    let prevTimestamp = null;

    /** @type {ShaderProgram} shaderProgram */
    let shaderProgram = null;

    /** @type {Texture} texture */
    let texture = null;

    /** @type {Renderer} renderer */
    let renderer = null;

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
        image.src = '/assets/test.png';
        image.addEventListener('load', () => {
            texture = new Texture(context, context.TEXTURE_2D, image);
            image.remove();
        });
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

        shaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);
        texture?.bind();

        renderer.clear()
            .beginGeometry()
            .drawRotatedRectangleOffCenter(canvas.width / 2, canvas.height / 2, 512, 512, timestamp / 1000, 0, 0, 1, 1, 1, 1, 1, 1)
            .endGeometry();

        requestAnimationFrame(update);
    }

    (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', main) : main();
})();
