import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const DESKTOP_SIM_HEIGHT = 1280;
const deviceAspect = window.innerWidth / window.innerHeight;
const designAspect = GAME_WIDTH / GAME_HEIGHT;
const isDesktopWide = deviceAspect > designAspect;
// 桌面宽屏模拟手机竖屏视口；移动端/窄屏仍按 C3 fullscreen scale-outer 扩展高度。
const internalW = GAME_WIDTH;
const internalH = isDesktopWide ? DESKTOP_SIM_HEIGHT : Math.round(GAME_WIDTH / deviceAspect);

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
 * 移动端 canvas 全屏；桌面宽屏时用 640:960 的手机窗口居中显示。
 */
function updateCanvasSize(game: Phaser.Game): void {
  const canvas = game.canvas;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const desktopWide = vw / vh > GAME_WIDTH / GAME_HEIGHT;
  const displayW = desktopWide ? Math.round(vh * GAME_WIDTH / DESKTOP_SIM_HEIGHT) : vw;
  const displayH = desktopWide ? vh : Math.round(vw * internalH / internalW);

  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.background = '#000000';

  canvas.style.display = 'block';
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
  canvas.style.marginLeft = Math.round((vw - displayW) / 2) + 'px';
  canvas.style.marginTop = Math.round((vh - displayH) / 2) + 'px';

  // 告诉Phaser input系统CSS缩放比例，修正点击坐标映射
  const scaleX = internalW / displayW;
  const scaleY = internalH / displayH;
  game.input.scaleManager.displayScale.set(scaleX, scaleY);
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
console.log(`Giant 2048 v${APP_VERSION}`);

new Phaser.Game(config);
