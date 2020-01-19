'use strict';

const pallet = [
  [.7, .5, 1.0, 1.0],
  [.5, .9, .5, 1.0],
  [1.0, .5, .5, 1.0],
  [1.0, .8, .5, 1.0],
  [1.0, 1.0, 1.0, 1.0],
];

function mod(n, m) {
  return ((n % m) + m) % m;
}

function weighted(w) {
  const t = w.reduce((a, b) => a + b, 0);
  const r = Math.random();
  let c = 0.0;
  for (let i = 0; i < w.length; i++) {
    c += Math.max(w[i] / t, 0.0);
    if (r < c) {
      return i;
    }
  }
}

class Game2D {
  constructor() {
    this.shapes = [];
    this.keys = new Object();
    this.dx = 0;
    this.dy = 0;
    this.aspect = 1;
    this.score = [0, 0, 0, 0, 0, 0, 0, 0];
    this.target = [1, 1, 1, 1, 1, 1, 1, 1];
    this.scale = 1;
    this.life = 10;
    onmessage = (e) => Object.assign(this, e.data);
  }
  tick() {
    this.shapes.forEach((shape) => shape.tick(this.aspect, this.keys, this.dx, this.dy, this.score, this.target));
    this.shapes.forEach((shape) => shape.collide(this.shapes, this.score, this.target));
    this.target.forEach((_, i) => {
      if (this.score[i] > this.target[i]) {
        this.target.forEach((_, t) => this.target[t] += 1);
      }
    });
    postMessage({
      shapes: this.shapes.map((shape) => shape.data()),
    });
  }
  start() {
    setInterval(this.tick.bind(this), 16.66);
  }
}

class Sprite {
  constructor(
    index,
    color,
    position,
    velocity
  ) {
    this.collides = true;
    this.scale = [.2, .2, .2];
    this.acceleration = [0, 0, 0, 0, 0, 0];
    this.random();
    if (index !== undefined) this.index = index;
    if (color !== undefined) this.color = color;
    if (position !== undefined) this.position = position;
    if (velocity !== undefined) this.velocity = velocity;
  }
  random() {
    this.index = Math.floor(Math.random() * 4);
    this.color = Math.floor(Math.random() * 4);
    this.position = [Math.random() * 6.0 - 3.0, -3.0, -5, 0, 0, Math.random() * 6.0 - 3.0];
    this.velocity = [Math.random() * .02 - .01, Math.random() * .02 - .01, 0, 0, 0, Math.random() * .02 - .01];
  }
  tick(aspect) {
    for (var i = 0; i < 6; i++) {
      this.velocity[i] += this.acceleration[i];
      this.position[i] += this.velocity[i];
    }
    this.position[0] = mod(this.position[0] + 3.0 * aspect, 6.0 * aspect) - 3.0 * aspect;
    this.position[1] = mod(this.position[1] + 3.0, 6.0) - 3.0;
  }
  data() {
    return new Array(
      ...this.position,
      ...this.scale,
      ...pallet[this.color],
      this.index
    );
  }
  collide() { }
}

class Ship extends Sprite {
  constructor(...args) {
    super(...args);
    this.collides = false;
  }
  tick(aspect, keys, dx, dy) {
    for (var i = 0; i < 6; i++) {
      this.velocity[i] *= 0.99;
    }
    this.velocity[5] = (keys["a"] && !keys["d"]) ? -0.1 : (keys["d"] && !keys["a"]) ? 0.1 : 0;
    if (keys["w"] && !keys["s"]) {
      this.acceleration[0] = Math.sin(this.position[5]) * 0.001;
      this.acceleration[1] = Math.cos(this.position[5]) * 0.001;
    } else {
      this.acceleration[0] = Math.sin(this.position[5]) * Math.min(100, Math.abs(dy)) / 100000;
      this.acceleration[1] = Math.cos(this.position[5]) * Math.min(100, Math.abs(dy)) / 100000;
    }
    this.acceleration[5] = dx / 1000;
    super.tick(aspect, keys, dx, dy);
  }
  collide(others, score, target) {
    others.forEach((shape) => {
      if (!shape.collides) {
        return 0;
      }
      const dx = shape.position[0] - this.position[0];
      const dy = shape.position[1] - this.position[1];
      if (Math.sqrt(dx * dx + dy * dy) < .2) {
        postMessage({ sound: this.position });
        if (score[shape.index]) {
          score[shape.index]++;
        } else {
          score[shape.index] = 1;
        }
        if (score[shape.color + 4]) {
          score[shape.color + 4]++;
        } else {
          score[shape.color + 4] = 1;
        }
        shape.random();
        const weights = score.map((v, i) => target[i] - v);
        const total = weights.reduce((a, b) => a + b, 0);
        if(total<1) {
          postMessage({ win: true });
          return;
        }
        // benevolence
        shape.index = weighted(weights.slice(0, 4));
        shape.color = weighted(weights.slice(4, 8));
      }
    });
  }
}

class Score extends Sprite {
  constructor(...args) {
    super(...args);
    this.collides = false;
  }
  tick(_, __, ___, ____, score, target) {
    if (score[this.index - 32]) {
      this.position[5] = score[this.index - 32] / target[this.index - 32] * 6.4;
    }
    if (score[this.color + 4]) {
      this.position[5] = score[this.color + 4] / target[this.color + 4] * 6.4;
    }
  }
  collide() { }
}

const game = new Game2D();

game.shapes.push(new Ship(
  8,
  4,
  [0, 0, -5, 0, 0, 0],
  [0, 0, 0, 0, 0, 0]
))

for (var i = 0; i < 4; i++) {
  game.shapes.push(new Score(
    i + 32,
    4,
    [i / 2 - .75, 2.5, -5, 0, 0, 0],
    [0, 0, 0, 0, 0, 0]
  ));
  game.shapes.push(new Score(
    32,
    i,
    [-i / 2 + .75, -2.5, -5, 0, 0, 0],
    [0, 0, 0, 0, 0, 0]
  ));
}

for (var i = 0; i < 10; i++) {
  game.shapes.push(new Sprite());
}
game.start();
