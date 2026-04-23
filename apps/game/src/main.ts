import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

// 模拟 C3 fullscreen "scale-outer"（project[12]=3）：
//  - 窄屏（设备 aspect < 设计 aspect）保持 width=GAME_WIDTH，往上下扩高；
//  - 宽屏保持 height=GAME_HEIGHT，往左右扩宽。
// 这样画布覆盖的 world 区域 ≥ 设计 640×960，背景等放在设计视窗外的元素也能显出来。
const deviceAspect = window.innerWidth / window.innerHeight;
const designAspect = GAME_WIDTH / GAME_HEIGHT;
const internalW = deviceAspect < designAspect
  ? GAME_WIDTH
  : Math.round(GAME_HEIGHT * deviceAspect);
const internalH = deviceAspect < designAspect
  ? Math.round(GAME_WIDTH / deviceAspect)
  : GAME_HEIGHT;

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
      // 原版 data.json 的设计坐标系固定是 640x960。
      updateCanvasSize(game);
      window.addEventListener('resize', () => updateCanvasSize(game));
    },
  },
};

/**
 * Canvas 全屏显示，同时让内部画布比例匹配 viewport。
 * 这样 CSS 全屏不会产生 X/Y 非等比拉伸，视觉上不变形。
 */
function updateCanvasSize(game: Phaser.Game): void {
  const canvas = game.canvas;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  canvas.style.display = 'block';
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.style.marginLeft = '0px';
  canvas.style.marginTop = '0px';

  // 告诉Phaser input系统CSS缩放比例，修正点击坐标映射
  const scaleX = internalW / vw;
  const scaleY = internalH / vh;
  game.input.scaleManager.displayScale.set(scaleX, scaleY);
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
console.log(`Giant 2048 v${APP_VERSION}`);

new Phaser.Game(config);
