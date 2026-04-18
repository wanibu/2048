import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const DESKTOP_BREAKPOINT = 768;
const IPHONE_14_PRO_MAX_ASPECT_RATIO = 430 / 932;
const DESKTOP_VIEWPORT_HEIGHT_RATIO = 0.94;

function getTargetAspectRatio(): number {
  if (window.innerWidth >= DESKTOP_BREAKPOINT) {
    return IPHONE_14_PRO_MAX_ASPECT_RATIO;
  }

  return window.innerWidth / window.innerHeight;
}

const internalW = GAME_WIDTH;
const internalH = Math.round(GAME_WIDTH / getTargetAspectRatio());

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
  const isDesktop = vw >= DESKTOP_BREAKPOINT;

  let displayW = vw;
  let displayH = vh;

  if (isDesktop) {
    displayH = Math.floor(vh * DESKTOP_VIEWPORT_HEIGHT_RATIO);
    displayW = Math.floor(displayH * getTargetAspectRatio());

    if (displayW > vw) {
      displayW = vw;
      displayH = Math.floor(displayW / getTargetAspectRatio());
    }
  }

  const marginLeft = Math.max(0, Math.floor((vw - displayW) / 2));
  const marginTop = Math.max(0, Math.floor((vh - displayH) / 2));

  canvas.style.display = 'block';
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
  canvas.style.marginLeft = marginLeft + 'px';
  canvas.style.marginTop = marginTop + 'px';

  // 告诉Phaser input系统CSS缩放比例，修正点击坐标映射
  const scaleX = internalW / displayW;
  const scaleY = internalH / displayH;
  game.input.scaleManager.displayScale.set(scaleX, scaleY);
}

new Phaser.Game(config);
