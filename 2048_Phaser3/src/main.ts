import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

// 内部画布用视口比例，宽度固定640，高度按比例算
const aspectRatio = window.innerHeight / window.innerWidth;
const internalW = GAME_WIDTH;
const internalH = Math.round(GAME_WIDTH * aspectRatio);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: internalW,
  height: internalH,
  parent: document.body,
  backgroundColor: '#000000',
  scale: {
    // 不用Phaser自带缩放，手动控制canvas尺寸（和原版C3一致）
    mode: Phaser.Scale.NONE,
  },
  render: {
    antialias: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene],
  callbacks: {
    postBoot: (game: Phaser.Game) => {
      // 和原版一样：canvas CSS = 视口大小，margin = 0
      updateCanvasSize(game);
      window.addEventListener('resize', () => updateCanvasSize(game));
    },
  },
};

/**
 * 原版C3的canvas控制方式：
 * canvas.style.width = 视口宽 + "px"
 * canvas.style.height = 视口高 + "px"
 * canvas.style.marginLeft = "0px"
 * canvas.style.marginTop = "0px"
 * canvas内部分辨率 = 视口 × DPR
 */
function updateCanvasSize(game: Phaser.Game): void {
  const canvas = game.canvas;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 和原版C3一致：canvas CSS = 视口大小，margin = 0
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.style.marginLeft = '0px';
  canvas.style.marginTop = '0px';

  // Phaser内部保持640×960不变
  // canvas CSS拉伸到视口大小，浏览器自动缩放渲染内容
}

new Phaser.Game(config);
