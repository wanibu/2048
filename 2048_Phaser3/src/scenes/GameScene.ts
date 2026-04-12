import Phaser from 'phaser';
import { GRID_ROWS, GRID_COLS, SPAWN_NUMBER_MAX, SHAPE_VALUES, calcLayout, LayoutConfig } from '../config';
import { Grid } from '../objects/Grid';
import { Sling } from '../objects/Sling';
import { Shape } from '../objects/Shape';
import { MergeSystem } from '../systems/MergeSystem';
import { RotateSystem } from '../systems/RotateSystem';
import { ActionRecorder } from '../systems/ActionRecorder';
import { HUD } from '../ui/HUD';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private sling!: Sling;
  private mergeSystem!: MergeSystem;
  private rotateSystem!: RotateSystem;
  private recorder!: ActionRecorder;
  private hud!: HUD;
  private layout!: LayoutConfig;
  private isRotating: boolean = false;
  private lastLandedCol: number | undefined;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const layout = calcLayout(w, h);

    // 背景铺满实际可见区域
    const bg = this.add.image(w / 2, h / 2, 'playbackground');
    bg.setScale(Math.max(w / bg.width, h / bg.height));
    // depth越小越在底层，-1000确保背景在所有元素下面
    bg.setDepth(-1000);

    this.layout = layout;
    // 操作记录器：和后端通信，每步操作发给后端验证
    this.recorder = new ActionRecorder();
    this.hud = new HUD(this, w);
    // 网格：根据实际canvas尺寸动态计算cellSize和偏移
    this.grid = new Grid(this, layout);
    // 合并系统：BFS扫描相邻同值方块，执行合并
    this.mergeSystem = new MergeSystem(this.grid);
    // 旋转系统：数据层矩阵转置 + 视觉Tween动画
    this.rotateSystem = new RotateSystem(this.grid);

    // 弹弓：拖拽选列、拉弓动画、发射糖果
    this.sling = new Sling(this, this.grid, layout);
    this.sling.onShoot((shape, col) => this.handleShoot(shape, col));

    // 旋转按钮：左下↺ 右下↻，键盘A/D
    this.createRotateButtons(w, h, layout);

    // 恢复之前的游戏状态（窗口resize后）
    this.restoreState();

    // 监听窗口resize：保存状态后刷新页面
    window.addEventListener('resize', this.onResize);

    // 后端开局：获取 gameId + 第1/2个糖果
    this.initBackend();

    // 后端返回下一个糖果时更新弹弓
    this.recorder.onNextCandy((candy: number) => {
      this.sling.setNextCandy(candy);
    });

    console.log('[GameScene] create done');
    this.printGrid('初始棋盘');
  }

  // 窗口resize处理：保存当前状态，刷新页面
  private onResize = (): void => {
    // 防抖：300ms内多次resize只触发一次
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.saveState();
      window.location.reload();
    }, 300);
  };
  private resizeTimer: number | null = null;

  // 保存当前游戏状态到 sessionStorage
  // 同时保存当前的操作记录，这样恢复后后端验证仍然有效
  private saveState(): void {
    const state = {
      grid: this.grid.data.map(row => [...row]),
      score: this.hud.getScore(),
      // 保存 gameId 和当前签名，恢复后继续
      gameId: this.recorder.getGameId(),
      sign: this.recorder.getSign(),
    };
    sessionStorage.setItem('giant2048_state', JSON.stringify(state));
    // 标记正在游戏中，刷新后 MenuScene 会直接跳到 GameScene
    sessionStorage.setItem('giant2048_playing', '1');
    console.log('[保存状态]', state);
  }

  // 从 sessionStorage 恢复游戏状态
  private restoreState(): void {
    const saved = sessionStorage.getItem('giant2048_state');
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      console.log('[恢复状态]', state);

      // 恢复棋盘
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const value = state.grid[r][c];
          if (value > 0) {
            this.grid.placeBorder(r, c, value);
          }
        }
      }

      // 恢复分数
      if (state.score > 0) {
        this.hud.setScore(state.score);
      }

      // 注意：resize 恢复后后端状态已丢失，需要重新开局
      // TODO: 后续可以用 gameId 恢复后端会话

      // 用完即删，避免下次正常进入时还恢复
      sessionStorage.removeItem('giant2048_state');
      this.printGrid('恢复后棋盘');
    } catch (e) {
      console.error('[恢复失败]', e);
      sessionStorage.removeItem('giant2048_state');
    }
  }

  // 后端开局：获取 gameId 和第一批糖果
  private async initBackend(): Promise<void> {
    try {
      const { currentCandy, nextCandy } = await this.recorder.init();
      console.log(`[开局] gameId=${this.recorder.getGameId()}, current=${currentCandy}, next=${nextCandy}`);
      this.sling.initCandies(currentCandy, nextCandy);
    } catch (e) {
      console.error('[开局失败] 使用本地随机模式', e);
      // fallback: 本地随机
      const pool = [2, 4, 8, 16, 32];
      const c = pool[Math.floor(Math.random() * pool.length)];
      const n = pool[Math.floor(Math.random() * pool.length)];
      this.sling.initCandies(c, n);
    }
  }

  // ===== DEBUG: 打印棋盘 =====
  private printGrid(label: string): void {
    console.log(`\n===== ${label} =====`);
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = this.grid.data[r].map(v => v === 0 ? '  .' : String(v).padStart(3));
      console.log(`行${r + 1}: [${row.join(',')}]`);
    }
    console.log('========================\n');
  }

  // 创建左右旋转按钮，放在页面最底部
  private createRotateButtons(w: number, h: number, layout: LayoutConfig): void {
    const btnSize = layout.cellSize * 0.7;
    // 按钮Y位置在页面最底部
    const btnY = h - btnSize * 0.8;

    // 左旋转按钮 — 左下角，逆时针旋转90°
    const leftBtn = this.add.text(w * 0.15, btnY, '↺', {
      fontSize: `${Math.round(btnSize)}px`,
      color: '#ffffff',
      stroke: '#2e7d32',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    leftBtn.on('pointerdown', () => this.doRotate('ccw'));

    // 右旋转按钮 — 右下角，顺时针旋转90°
    const rightBtn = this.add.text(w * 0.85, btnY, '↻', {
      fontSize: `${Math.round(btnSize)}px`,
      color: '#ffffff',
      stroke: '#2e7d32',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);

    rightBtn.on('pointerdown', () => this.doRotate('cw'));

    // 键盘 A=逆时针 D=顺时针
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-A', () => this.doRotate('ccw'));
      this.input.keyboard.on('keydown-D', () => this.doRotate('cw'));
    }
  }

  // 执行旋转：数据层转置 + 视觉动画 + 旋转后检查合并
  private doRotate(direction: 'cw' | 'ccw'): void {
    if (this.isRotating) return;
    this.isRotating = true;

    console.log(`[旋转] 方向: ${direction === 'cw' ? '顺时针' : '逆时针'}`);
    this.printGrid('旋转前');

    if (direction === 'cw') {
      this.rotateSystem.rotateCW();
    } else {
      this.rotateSystem.rotateCCW();
    }

    this.sound.play('rotation', { volume: 0.3 });
    this.recorder.recordRotate(direction);

    // 等旋转动画完成后检查合并（不重新生成弹弓糖果）
    this.time.delayedCall(250, () => {
      this.isRotating = false;
      this.printGrid('旋转后');
      this.checkMergesAfterRotation();
    });
  }

  // 处理发射：计算落点 → 飞行动画 → 落地 → 合并检查
  private handleShoot(shape: Shape, col: number): void {
    console.log(`[发射] 列=${col + 1}, 值=${shape.value}`);
    this.printGrid('发射前');

    const landingRow = this.findLandingRow(col);
    console.log(`[落点] 计算结果: 行=${landingRow === -1 ? '满' : landingRow + 1}, 列=${col + 1}`);

    if (landingRow === -1) {
      // 列满了，检查最底行是否同值可直接合并
      const bottomRow = GRID_ROWS - 1;
      if (this.grid.data[bottomRow][col] === shape.value) {
        console.log(`[直接合并] 列${col + 1}满，底行值=${this.grid.data[bottomRow][col]}与发射值=${shape.value}相同，直接合并`);
        const shootValue = shape.value;
        shape.destroy();
        const newValue = shootValue * 2;
        this.recorder.recordDirectMerge(col, shootValue, newValue);
        const border = this.grid.borders[bottomRow][col];
        if (border) {
          border.setValue(newValue);
          this.grid.data[bottomRow][col] = newValue;
        }
        this.sound.play('slingshot2', { volume: 0.3 });
        this.lastLandedCol = col;
        if (border) {
          this.tweens.add({
            targets: border,
            scaleX: 1.3, scaleY: 1.3,
            duration: 120, yoyo: true,
            ease: 'Back.easeOut',
          });
        }
        this.hud.addScore(newValue);
        this.printGrid('直接合并后');
        this.time.delayedCall(150, () => this.checkMerges());
        this.sling.respawn();
        return;
      }
      // 打不出去，不换糖果，糖果回到弹弓上
      console.log(`[拒绝] 列${col + 1}满，底行值=${this.grid.data[bottomRow][col]}与发射值=${shape.value}不同，不能发射`);
      this.sling.cancelShoot(shape);
      return;
    }

    const body = shape.getBody();
    body.setVelocity(0, 0);

    const targetPos = this.grid.cellToPixel(landingRow, col);
    const distance = Math.abs(shape.y - targetPos.y);
    const duration = Math.max(150, distance * 0.4);

    this.tweens.add({
      targets: shape,
      y: targetPos.y,
      duration,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.landShape(shape, col, landingRow);
      },
    });
  }

  private findLandingRow(col: number): number {
    const colData = Array.from({length: GRID_ROWS}, (_, r) => this.grid.data[r][col]);
    console.log(`[findLandingRow] 列${col + 1}数据: [${colData.map(v => v || '.').join(', ')}]`);

    // 糖果从下方（行5）往上飞
    // 最底行有东西 → 糖果进不去，返回-1（由handleShoot判断是否可直接合并）
    if (this.grid.data[GRID_ROWS - 1][col] !== 0) {
      console.log(`[findLandingRow] 最底行已占据，进不去`);
      return -1;
    }

    // 从底部往上找：第一个有东西的行，糖果停在它下方一格
    for (let r = GRID_ROWS - 2; r >= 0; r--) {
      if (this.grid.data[r][col] !== 0) {
        // 行r有阻挡，糖果停在行r+1（已确认行GRID_ROWS-1是空的，r+1也在范围内）
        console.log(`[findLandingRow] 从底往上，阻挡在行${r + 1}，落在行${r + 2}`);
        return r + 1;
      }
    }

    // 整列为空，飞到最顶行
    console.log(`[findLandingRow] 整列空，落在行1`);
    return 0;
  }

  // 糖果落地：销毁Shape → 创建Border → 播放音效 → 检查合并
  private landShape(shape: Shape, col: number, targetRow: number): void {
    const value = shape.value;
    console.log(`[落地] 行${targetRow + 1} 列${col + 1} 值=${value}`);
    this.recorder.recordShoot(col, value);
    shape.destroy();

    const border = this.grid.placeBorder(targetRow, col, value);

    this.tweens.add({
      targets: border,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    this.sound.play('slingshot2', { volume: 0.3 });
    this.lastLandedCol = col;
    this.printGrid('落地后');
    this.time.delayedCall(150, () => this.checkMerges());
  }

  // 合并检查：BFS找相邻同值组 → 执行最大组合并 → 链式检查
  // 合并规则：2个×2, 3个×4, 4个×8
  // 合并位置：纵向取最小行号（向上靠拢），横向取打入的列（吸引）
  private checkMerges(): void {
    const groups = this.mergeSystem.findMergeGroups();
    console.log(`[合并检查] 找到 ${groups.length} 个合并组`);

    if (groups.length === 0) {
      this.lastLandedCol = undefined;
      this.sling.respawn();
      // 检查是否游戏结束
      this.time.delayedCall(400, () => this.checkGameOver());
      return;
    }

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const group = groups[0];
    console.log(`[合并] 值=${group.value}, 数量=${group.cells.length}, 位置=[${group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ')}]`);

    const result = this.mergeSystem.executeMerge(group, this.lastLandedCol);
    console.log(`[合并结果] 新值=${result.newValue}, 位置=(${result.row + 1},${result.col + 1})`);

    this.hud.addScore(result.newValue);
    this.recorder.reportScore(this.hud.getScore());
    this.sound.play('collapse1', { volume: 0.4 });
    this.lastLandedCol = result.col;

    const border = this.grid.borders[result.row][result.col];
    if (border) {
      this.tweens.add({
        targets: border,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    this.printGrid('合并后');
    // 合并后上靠：方块往上填补空隙
    this.applyGravityUp();
    this.printGrid('上靠后');
    this.time.delayedCall(400, () => this.checkMerges());
  }

  // 旋转后合并检查——不调用 respawn，因为弹弓上已经有糖果
  private checkMergesAfterRotation(): void {
    const groups = this.mergeSystem.findMergeGroups();
    console.log(`[旋转后合并检查] 找到 ${groups.length} 个合并组`);

    if (groups.length === 0) return;

    groups.sort((a, b) => b.cells.length - a.cells.length);
    const group = groups[0];
    console.log(`[旋转后合并] 值=${group.value}, 数量=${group.cells.length}, 位置=[${group.cells.map(c => `(${c.row + 1},${c.col + 1})`).join(', ')}]`);

    const result = this.mergeSystem.executeMerge(group);
    console.log(`[旋转后合并结果] 新值=${result.newValue}, 位置=(${result.row + 1},${result.col + 1})`);

    this.hud.addScore(result.newValue);
    this.sound.play('collapse1', { volume: 0.4 });

    const border = this.grid.borders[result.row][result.col];
    if (border) {
      this.tweens.add({
        targets: border,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }

    this.printGrid('旋转合并后');
    this.applyGravityUp();
    this.printGrid('旋转上靠后');
    this.time.delayedCall(400, () => this.checkMergesAfterRotation());
  }

  // 上靠逻辑：合并消除格子后，下方方块往上填补空隙
  // 每列独立处理，所有方块紧贴顶部已有方块，中间不留空隙
  private applyGravityUp(): void {
    const layout = this.grid.layout;
    for (let col = 0; col < GRID_COLS; col++) {
      // 收集这列所有非空值，保持从上到下的顺序
      const values: number[] = [];
      const borders: (typeof this.grid.borders[0][0])[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        if (this.grid.data[r][col] !== 0) {
          values.push(this.grid.data[r][col]);
          borders.push(this.grid.borders[r][col]);
        }
      }

      // 清空这列
      for (let r = 0; r < GRID_ROWS; r++) {
        this.grid.data[r][col] = 0;
        this.grid.borders[r][col] = null;
      }

      // 从顶部开始重新填入
      for (let i = 0; i < values.length; i++) {
        this.grid.data[i][col] = values[i];
        this.grid.borders[i][col] = borders[i];

        const border = borders[i];
        if (border) {
          border.gridRow = i;
          border.gridCol = col;
          // Tween 移动到新位置
          const { x, y } = this.grid.cellToPixel(i, col);
          this.tweens.add({
            targets: border,
            x, y,
            duration: 150,
            ease: 'Quad.easeOut',
          });
        }
      }
    }
  }

  // 检查游戏是否结束：所有列都满且当前糖果无法放置到任何列
  private checkGameOver(): void {
    // 检查是否有任何列可以放置任何糖果
    let canPlace = false;
    for (let col = 0; col < GRID_COLS; col++) {
      // 列有空格 → 可以放
      const landingRow = this.findLandingRow(col);
      if (landingRow !== -1) {
        canPlace = true;
        break;
      }
      // 列满但最底行有同值 → 可以直接合并（但我们不知道未来的糖果值）
      // 所以只要有任何一列的最底行存在值，就检查所有可能的生成值
      const bottomVal = this.grid.data[GRID_ROWS - 1][col];
      if (bottomVal > 0) {
        // 检查当前弹弓糖果是否能打进
        const spawnPool = SHAPE_VALUES.slice(-SPAWN_NUMBER_MAX);
        if (spawnPool.includes(bottomVal)) {
          canPlace = true;
          break;
        }
      }
    }

    if (!canPlace) {
      console.log('[游戏结束] 无法放置任何糖果');
      this.gameOver();
    }
  }

  // 游戏结束处理
  private gameOver(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 半透明遮罩
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    overlay.setDepth(200);

    // Game Over 文字
    this.add.text(w / 2, h * 0.35, 'GAME OVER', {
      fontSize: `${Math.round(w * 0.1)}px`,
      color: '#ff5555',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(201);

    // 分数
    this.add.text(w / 2, h * 0.45, `Score: ${this.hud.getScore()}`, {
      fontSize: `${Math.round(w * 0.07)}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    // 提交分数到后端并结束游戏
    this.recorder.reportScore(this.hud.getScore());
    this.recorder.finish();

    // 重新开始按钮
    const restartBtn = this.add.text(w / 2, h * 0.58, '↻ RESTART', {
      fontSize: `${Math.round(w * 0.06)}px`,
      color: '#ffffff',
      backgroundColor: '#4caf50',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    restartBtn.on('pointerdown', () => {
      // 清除 resize 状态
      sessionStorage.removeItem('giant2048_state');
      sessionStorage.removeItem('giant2048_playing');
      // 移除 resize 监听
      window.removeEventListener('resize', this.onResize);
      this.scene.start('GameScene');
    });
  }

}
