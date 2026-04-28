import * as Phaser from 'phaser';
import { SHOW_HIT_AREA_DEBUG } from '../config';

// 整组左上角 UI（头像/昵称/余额 + 星星/皇冠 + 分数）的位置偏移。
// 改这两个值就能整组移动，不用调每个子元素。
const HUD_OFFSET_X = 0;
const HUD_OFFSET_Y = 0;

const DEPTH = 200;

// debug 边框（受 localStorage 'giant2048:show_hit_area_debug' 控制）。
// 边框尺寸 = container 内所有子元素 bounding box + padding。
const HUD_BORDER_PADDING = 8;
const HUD_BORDER_COLOR = 0xff3355;

// 头像 / 昵称 / 余额（在 container 里的相对坐标）
const AVATAR_X = 44;
const AVATAR_Y = -150;
const AVATAR_RADIUS = 28;
const NAME_X = 85;
const NAME_Y = -192;
const BALANCE_X = 90;
const BALANCE_Y = -130;

// 星星 + 关卡分数
const STAR_X = 44;
const STAR_Y = -85;
const SCORE_DIGITS_X = 90;
const SCORE_DIGITS_Y = -83;

// 皇冠 + 历史最高分
const CROWN_X = 44;
const CROWN_Y = -30;
const TOP_SCORE_DIGITS_X = 90;
const TOP_SCORE_DIGITS_Y = -28;

// 精灵数字（白色 0-9）参数
const DIGIT_W = 45;
const DIGIT_H = 60;
const DIGIT_SCALE = 0.65;
const DIGIT_STRIDE = 28;
const WHITE_DIGIT_COORDS = [
  { x: 260, y: 1666 }, // 0
  { x: 316, y: 1666 }, // 1
  { x: 378, y: 1666 }, // 2
  { x: 436, y: 1666 }, // 3
  { x: 495, y: 1666 }, // 4
  { x: 555, y: 1666 }, // 5
  { x: 615, y: 1666 }, // 6
  { x: 675, y: 1666 }, // 7
  { x: 732, y: 1666 }, // 8
  { x: 793, y: 1666 }, // 9
];

export interface UserInfo {
  avatar: string;
  nickname: string;
  score: string;
  currency: string;
}

/**
 * 左上角 HUD：圆形头像 + 昵称 + 余额 + ⭐ 关卡分数 + 🥮 历史最高分。
 * 全部子元素都装在一个 Container 里，调 HUD_OFFSET_X/Y 就能整组移动。
 */
export class TopLeftHud {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreDigits: Phaser.GameObjects.Image[] = [];
  private topScoreDigits: Phaser.GameObjects.Image[] = [];
  private debugBorder: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(HUD_OFFSET_X, HUD_OFFSET_Y).setDepth(DEPTH);

    this.registerWhiteDigitFrames();
    this.createScoreIcons();
    // 初始 0 分；最高分从 localStorage 取
    this.setScore(0);
    const savedTop = parseInt(localStorage.getItem('giant2048_topscore') || '0') || 0;
    this.setTopScore(savedTop);
  }

  // 自动计算 children bounding box 重画 debug 边框。
  // 在 setScore / setTopScore / applyUserInfo 后调用，让边框始终包住实际内容。
  // 本地 dev 默认开；生产 build 默认关，需 localStorage 'giant2048:show_hit_area_debug' 才开。
  private redrawDebugBorder(): void {
    if (!import.meta.env.DEV && !SHOW_HIT_AREA_DEBUG) return;
    if (this.debugBorder) {
      this.container.remove(this.debugBorder, true);
      this.debugBorder = null;
    }
    if (this.container.length === 0) return;
    const bounds = this.container.getBounds();
    const localX = bounds.x - this.container.x;
    const localY = bounds.y - this.container.y;
    const g = this.scene.add.graphics();
    g.lineStyle(2, HUD_BORDER_COLOR, 0.9);
    g.strokeRect(
      localX - HUD_BORDER_PADDING,
      localY - HUD_BORDER_PADDING,
      bounds.width + HUD_BORDER_PADDING * 2,
      bounds.height + HUD_BORDER_PADDING * 2,
    );
    this.container.add(g);
    this.debugBorder = g;
  }

  // 关卡分数（每次得分调）
  setScore(num: number): void {
    this.scoreDigits.forEach((img) => img.destroy());
    this.scoreDigits = this.renderDigits(num, SCORE_DIGITS_X, SCORE_DIGITS_Y);
    this.redrawDebugBorder();
  }

  // 历史最高分
  setTopScore(num: number): void {
    this.topScoreDigits.forEach((img) => img.destroy());
    this.topScoreDigits = this.renderDigits(num, TOP_SCORE_DIGITS_X, TOP_SCORE_DIGITS_Y);
    this.redrawDebugBorder();
  }

  // 玩家信息：圆形头像 + 昵称 + 余额。auth/login 后调进来。
  applyUserInfo(info: UserInfo): void {
    const scene = this.scene;

    // 灰色 placeholder 圆，避免头像 URL 加载前空白
    const placeholder = scene.add.circle(AVATAR_X, AVATAR_Y, AVATAR_RADIUS, 0x666666);
    placeholder.setStrokeStyle(2, 0xffffff, 0.9);
    this.container.add(placeholder);

    const nickname = (info.nickname || 'Player').slice(0, 16);
    const nameText = scene.add.text(NAME_X, NAME_Y, nickname, {
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: '900',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.container.add(nameText);

    // 余额精灵数字（不带逗号、不显示 VND）
    const num = parseInt(info.score || '0') || 0;
    this.renderDigits(num, BALANCE_X, BALANCE_Y);
    this.redrawDebugBorder();

    if (!info.avatar) return;

    // 动态加载 avatar URL，用 Graphics 圆做几何 mask 实现圆形裁切
    const key = `avatar-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    scene.load.image(key, info.avatar);
    scene.load.once(`filecomplete-image-${key}`, () => {
      const img = scene.add.image(AVATAR_X, AVATAR_Y, key);
      img.setDisplaySize(AVATAR_RADIUS * 2, AVATAR_RADIUS * 2);
      // mask graphic 也加进 container：container 偏移时 mask 跟着移动
      const mask = scene.make.graphics();
      mask.fillStyle(0xffffff);
      // 注意：mask 用世界坐标。container 当前偏移 HUD_OFFSET_X/Y 已在 container.x/y。
      // 让 mask 的圆心 = avatar 在世界系的位置 = container.x + AVATAR_X
      mask.fillCircle(this.container.x + AVATAR_X, this.container.y + AVATAR_Y, AVATAR_RADIUS);
      img.setMask(mask.createGeometryMask());
      this.container.add(img);
      placeholder.destroy();
      this.redrawDebugBorder();
    });
    scene.load.once('loaderror', (file: { key: string }) => {
      if (file.key === key) console.warn('[avatar] load failed:', info.avatar);
    });
    scene.load.start();
  }

  private registerWhiteDigitFrames(): void {
    const tex = this.scene.textures.get('shared1');
    for (let d = 0; d <= 9; d++) {
      const k = `white-${d}`;
      if (!tex.has(k)) {
        tex.add(k, 0, WHITE_DIGIT_COORDS[d].x, WHITE_DIGIT_COORDS[d].y, DIGIT_W, DIGIT_H);
      }
    }
  }

  private createScoreIcons(): void {
    const tex = this.scene.textures.get('shared3');
    if (!tex.has('star-ui')) tex.add('star-ui', 0, 1, 193, 50, 50);
    if (!tex.has('crown-ui')) tex.add('crown-ui', 0, 65, 193, 50, 50);

    const star = this.scene.add.image(STAR_X, STAR_Y, 'shared3', 'star-ui');
    star.setOrigin(0.5, 0.5);
    star.setDisplaySize(50, 50);
    this.container.add(star);

    const crown = this.scene.add.image(CROWN_X, CROWN_Y, 'shared3', 'crown-ui');
    crown.setOrigin(0.5, 0.5);
    crown.setDisplaySize(50, 50);
    this.container.add(crown);
  }

  private renderDigits(num: number, startX: number, startY: number): Phaser.GameObjects.Image[] {
    const digits = String(num).split('');
    const images: Phaser.GameObjects.Image[] = [];
    digits.forEach((d, i) => {
      const img = this.scene.add.image(startX + i * DIGIT_STRIDE, startY, 'shared1', `white-${d}`);
      img.setScale(DIGIT_SCALE);
      this.container.add(img);
      images.push(img);
    });
    return images;
  }
}
