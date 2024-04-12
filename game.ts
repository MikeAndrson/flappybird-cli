const keypress = require("keypress");

class Game {
  bird: Bird;
  pipes: Pipe[] = [];
  score: number = 0;
  state: "running" | "failed" = "running";
  loop?: NodeJS.Timeout;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly fps: number,
  ) {
    this.bird = new Bird(width * 0.3, height * 0.5);
  }

  init() {
    this._start();
    this._listenForKeyPresses();
  }

  _start() {
    this.bird = new Bird(this.width * 0.3, this.height * 0.5);
    this.pipes = [];
    this.score = 0;
    this.state = "running";
    this.loop = setInterval(() => {
      this._updateGameState();
      this._render();
    }, 1000 / this.fps);
  }

  _fail() {
    this.state = "failed";
    clearInterval(this.loop);
    this._render();
  }

  _listenForKeyPresses() {
    keypress(process.stdin);
    process.stdin.on("keypress", (_ch, key) => {
      if (!key) return;
      if (key.ctrl && key.name == "c") {
        process.stdin.pause();
        clearInterval(this.loop);
      } else if (key.name === "space") {
        this.bird.y -= 2;
      } else if (key.name === "r") {
        if (this.state === "failed") {
          this._start();
        }
      }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  _updateGameState() {
    const random = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const pushPipePair = () => {
      const gapMultiplier = 0.2;
      const heightMultiplier = random(1, 7) / 10;
      this.pipes.push(new Pipe(this.width, 0, this.height * heightMultiplier));
      this.pipes.push(
        new Pipe(
          this.width,
          this.height * (heightMultiplier + gapMultiplier),
          this.height * (1 - (heightMultiplier + gapMultiplier)),
        ),
      );
    };

    // create pipe if there are none
    if (this.pipes.length === 0) {
      pushPipePair();
    } else {
      // create more pipes
      const lastPipe = this.pipes.at(-1)!;
      const gapBetweenPipes = random(6, 8) / 10;
      if (lastPipe.x < this.width * gapBetweenPipes) {
        pushPipePair();
      }
    }

    // bird gravity
    this.bird.y += 1;

    // check if out of bounds
    if (Math.abs(this.bird.y - this.height) <= 1 || this.bird.y <= 0) {
      this._fail();
    }

    // move pipes
    for (const pipe of this.pipes) {
      pipe.x -= 1;

      // check pipe collision
      if (
        Math.abs(this.bird.x - pipe.x) <= 1 &&
        this.bird.y >= pipe.y &&
        this.bird.y <= pipe.y + pipe.height
      ) {
        this._fail();
        break;
      }

      // increase score (hack: only the top pipe)
      if (this.bird.x === pipe.x && pipe.y === 0) {
        this.score++;
      }
    }

    // destroy pipes that are out of the screen
    this.pipes = this.pipes.filter((pipe) => pipe.x >= 0);
  }

  _render() {
    const put = (s: string) => process.stdout.write(s);
    const clear = () => put("\x1Bc");

    clear();
    for (let pY = -1; pY <= this.height; pY++) {
      for (let pX = -1; pX <= this.width; pX++) {
        let toRender = " ";
        if (pX === -1 || pX === this.width || pY === -1 || pY === this.height) {
          toRender = "*";
        } else if (pX === this.bird.x && pY === this.bird.y) {
          toRender = ">";
        } else {
          for (const pipe of this.pipes) {
            if (pX === pipe.x && pY >= pipe.y && pY <= pipe.y + pipe.height) {
              toRender = "|";
              break;
            }
          }
        }
        put(toRender);
      }
      put("\n");
    }

    put(`Score: ${this.score}\n`);
    if (this.state === "failed") {
      put("Game Over!\n");
      put("Press R to Restart.\n");
    }
  }
}

class Bird {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.y = ~~y;
    this.x = ~~x;
  }
}

class Pipe {
  public x: number;
  public y: number;
  public height: number;

  constructor(x: number, y: number, height: number) {
    this.height = ~~height;
    this.y = ~~y;
    this.x = ~~x;
  }
}

(() => {
  const width = process.argv[2] ? parseInt(process.argv[2]) : 100;
  const height = process.argv[3] ? parseInt(process.argv[3]) : 20;
  const fps = process.argv[4] ? parseInt(process.argv[4]) : 10;

  const game = new Game(width, height, fps);
  game.init();
})();
