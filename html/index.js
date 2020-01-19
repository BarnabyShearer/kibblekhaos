'use strict';

class Game2D {
  constructor(parent, target, tiles, sounds, vertex, fragment) {

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext()

    this.panner = audioCtx.createPanner();
    this.panner.connect(audioCtx.destination)

    const audio = document.createElement('audio');
    audio.src = sounds;
    parent.appendChild(audio);
    audioCtx.createMediaElementSource(audio).connect(this.panner);

    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);

    const gl = this.gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!this.gl) throw new Error('WebGL failed to initialize.');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    const program = gl.createProgram();
    gl.attachShader(program, this.compileShader(vertex, gl.VERTEX_SHADER));
    gl.attachShader(program, this.compileShader(fragment, gl.FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    this.gl.useProgram(program);
    const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < count; i++) gl.enableVertexAttribArray(i);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0, 0.0,
      -1.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
      1.0, -1.0, 0.0,
      -1.0, -1.0, 0.0
    ]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    const image = new Image();
    image.onload = function () {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    image.src = tiles;
    this.sizeUniform = gl.getUniformLocation(program, "inSize");
    this.translateUniform = gl.getUniformLocation(program, "inTranslate");
    this.rotateUniform = gl.getUniformLocation(program, "inRotate");
    this.scaleUniform = gl.getUniformLocation(program, "inScale");
    this.colorUniform = gl.getUniformLocation(program, "inColor");
    this.indexUniform = gl.getUniformLocation(program, "inIndex");

    this.shapes = [];

    this.keys = new Object();
    document.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
      this.ticker.postMessage({ keys: this.keys });
    }, false);
    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
      this.ticker.postMessage({ keys: this.keys });
    }, false);
    document.addEventListener("touchstart", (e) => {
      this.x = e.touches[0].pageX;
      this.y = e.touches[0].pageY;
    });
    this.dx = 0;
    this.dy = 0;
    document.addEventListener("touchmove", (e) => this.ticker.postMessage({
      dx: e.touches[0].pageX - this.x,
      dy: e.touches[0].pageY - this.y,
    }));
    document.addEventListener("touchend", (e) => this.ticker.postMessage({
      dx: 0,
      dy: 0,
    }));
    this.ticker = new Worker("worker.js");
    this.ticker.onmessage = (e) => {
      if (e.data.shapes) {
        this.shapes = e.data.shapes;
      }
      if (e.data.sound) {
        this.panner.setPosition(-e.data.sound[0], e.data.sound[1], 0);
        audio.play();
      }
      if (e.data.win) {
        window.location.href = "done.html";
      }
    };
    this.ticker.postMessage({ target });
  }
  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('An error occurred compiling the ' + type + ' shader: ' + this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }
  draw() {
    const gl = this.gl;
    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(this.sizeUniform, gl.canvas.clientWidth, gl.canvas.clientHeight);
    this.ticker.postMessage({ aspect: gl.drawingBufferWidth / gl.drawingBufferHeight });
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.shapes.forEach((shape) => {
      gl.uniform3f(this.translateUniform, shape[0], shape[1], shape[2]);
      gl.uniform3f(this.rotateUniform, shape[3], shape[4], shape[5]);
      gl.uniform3f(this.scaleUniform, shape[6], shape[7], shape[8]);
      gl.uniform4f(this.colorUniform, shape[9], shape[10], shape[11], shape[12]);
      gl.uniform1i(this.indexUniform, shape[13]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    requestAnimationFrame(this.draw.bind(this));
  }
  start() {
    requestAnimationFrame(this.draw.bind(this));
  }
}

const diet = [0, 0, 0, 0, 0, 0, 0, 0];
for (let i = 0; i < 20; i++) {
  diet[Math.floor(Math.random() * 4)]++;
  diet[4 + Math.floor(Math.random() * 4)]++;
}
const li = document.getElementsByTagName("li");
for (let i = 0; i < 4; i++) {
  li[i + 1].innerText = `${diet[i] * 5}%`;
  li[i + 6].innerText = `${diet[i + 4] * 5}%`;
}
document.forms[0].addEventListener('submit', (e) => {
  e.preventDefault();
  document.body.removeChild(document.getElementsByTagName("main")[0]);
  const gl = new Game2D(
    document.body,
    diet,
    "tiles.png",
    "sound.wav",
    `
attribute vec3 inPosition;
uniform vec2 inSize;
uniform vec3 inTranslate;
uniform vec3 inRotate;
uniform vec3 inScale;
uniform int inIndex;
varying vec2 vTexture;
varying vec2 vPos;
varying float vPie;

mat4 translate(vec3 t) {
  return mat4(
    vec4(1, 0, 0, 0),
    vec4(0, 1, 0, 0),
    vec4(0, 0, 1, 0),
    vec4(t, 1)
  );
}

mat4 rotateZ(float a) {
  return mat4(
    vec4(cos(a), -sin(a), 0, 0),
    vec4(sin(a), cos(a), 0, 0),
    vec4(0, 0, 1, 0),
    vec4(0, 0, 0, 1)
  );
}

mat4 scale(vec3 s) {
  return mat4(
    vec4(s.x, 0, 0, 0),
    vec4(0, s.y, 0, 0),
    vec4(0, 0, s.z, 0),
    vec4(0, 0, 0, 1)
  );
}

mat4 view_frustum(
  float angle_of_view,
  float aspect_ratio,
  float near,
  float far
) {
  float f = 1.0 / tan(angle_of_view / 2.0);
  float rangeInv = 1.0 / (near - far);
  return mat4(
    vec4(f / aspect_ratio, 0.0, 0.0, 0.0),
    vec4(0.0, f, 0.0, 0.0),
    vec4(0.0, 0.0, (near + far) * rangeInv, -1.0),
    vec4(0.0, 0.0, near * far * rangeInv * 2.0, 0.0)
  );
}

void main() {
  if(inIndex<32) {
    gl_Position = view_frustum(1.0, inSize.x / inSize.y, 1.0, 10.0)
      * translate(inTranslate)
      * rotateZ(inRotate.z)
      * scale(inScale)
      * vec4(inPosition, 1.0);
    vPie = 7.0;
  } else {
    gl_Position = view_frustum(1.0, inSize.x / inSize.y, 1.0, 10.0)
    * translate(inTranslate)
    * scale(inScale)
    * vec4(inPosition, 1.0);
    vPie = inRotate.z;
  }
  vPos = inPosition.xy;
  vTexture = inPosition.xy / vec2(16.0) + vec2((float(inIndex) + 0.5)/8.0, -(float(inIndex/8) + 0.5)/8.0);
}
`, `
precision mediump float;
uniform sampler2D inTexture;
uniform vec4 inColor;
varying vec2 vTexture;
varying vec2 vPos;
varying float vPie;
void main() {
  float a = atan(vPos.x, vPos.y) + 3.141592;
  float c = clamp((vPie-a)*3.0, 0.0, 0.5) + 0.5;
  gl_FragColor = texture2D(inTexture, vTexture) * inColor * vec4(c);
}
`).start();
});
