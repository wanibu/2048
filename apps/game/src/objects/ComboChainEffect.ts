import * as Phaser from 'phaser';
import {
  COMBO_BANNER_DEPTH,
  COMBO_BANNER_FADE_MS,
  COMBO_BANNER_HOLD_MS,
  COMBO_BANNER_POP_MS,
  COMBO_BANNER_REGION,
  COMBO_BANNER_SCALE_FINAL,
  COMBO_BANNER_X,
  COMBO_BANNER_Y,
  COMBO_CANDY_ARC_HEIGHT,
  COMBO_CANDY_COUNT,
  COMBO_CANDY_FLY_MS,
  COMBO_CANDY_FROM,
  COMBO_CANDY_REGION,
  COMBO_CANDY_STAGGER_MS,
  COMBO_CANDY_START_DELAY_MS,
  COMBO_CANDY_TO,
  GIANT_SCREAM_FRAMES,
  GIANT_SCREAM_FRAME_MS,
  GIANT_TWEEN_MS,
  GIANT_TWEEN_Y_OFFSET,
  GIRL_SURPRISE_FRAME_MS,
  GIRL_SURPRISE_FRAMES,
} from '../config';

export class ComboChainEffect {
  private readonly banner: Phaser.GameObjects.Image;
  private readonly giantBaseY: number;
  private activeTimers: Phaser.Time.TimerEvent[] = [];
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private activeCandies: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly girl: Phaser.GameObjects.Image,
    private readonly giant: Phaser.GameObjects.Image,
  ) {
    this.giantBaseY = giant.y;
    this.registerFrames();
    this.banner = scene.add.image(COMBO_BANNER_X, COMBO_BANNER_Y, 'shared0-orig', 'combo-banner');
    this.banner.setOrigin(0.5, 0.5);
    this.banner.setScale(0);
    this.banner.setAlpha(0);
    this.banner.setDepth(COMBO_BANNER_DEPTH);
    this.banner.setVisible(false);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  play(comboCount: number): void {
    this.clearRuntimeState();
    this.playBanner();
    this.playGirlSurprise();
    this.playGiantScream();
    this.playCandyFly(comboCount);
  }

  destroy(): void {
    this.clearRuntimeState();
    this.banner.destroy();
  }

  private registerFrames(): void {
    const shared0 = this.scene.textures.get('shared0-orig');
    if (!shared0.has('combo-banner')) {
      shared0.add('combo-banner', 0, COMBO_BANNER_REGION.x, COMBO_BANNER_REGION.y, COMBO_BANNER_REGION.w, COMBO_BANNER_REGION.h);
    }
    GIANT_SCREAM_FRAMES.forEach((frame, index) => {
      const frameKey = `giant-scream-${index}`;
      if (!shared0.has(frameKey)) {
        shared0.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
      }
    });

    const shared3 = this.scene.textures.get('shared3');
    if (!shared3.has('combo-candy')) {
      shared3.add('combo-candy', 0, COMBO_CANDY_REGION.x, COMBO_CANDY_REGION.y, COMBO_CANDY_REGION.w, COMBO_CANDY_REGION.h);
    }
  }

  private playBanner(): void {
    this.banner.setVisible(true);
    this.banner.setScale(0);
    this.banner.setAlpha(0);

    const popIn = this.scene.tweens.add({
      targets: this.banner,
      scaleX: COMBO_BANNER_SCALE_FINAL * 1.3,
      scaleY: COMBO_BANNER_SCALE_FINAL * 1.3,
      alpha: 1,
      duration: COMBO_BANNER_POP_MS,
      ease: 'Back.easeOut',
    });
    this.activeTweens.push(popIn);

    const settle = this.scene.time.delayedCall(COMBO_BANNER_POP_MS, () => {
      const settleTween = this.scene.tweens.add({
        targets: this.banner,
        scaleX: COMBO_BANNER_SCALE_FINAL,
        scaleY: COMBO_BANNER_SCALE_FINAL,
        duration: 80,
        ease: 'Quad.easeOut',
      });
      this.activeTweens.push(settleTween);
    });
    this.activeTimers.push(settle);

    const fade = this.scene.time.delayedCall(COMBO_BANNER_POP_MS + COMBO_BANNER_HOLD_MS, () => {
      const fadeTween = this.scene.tweens.add({
        targets: this.banner,
        alpha: 0,
        scaleX: COMBO_BANNER_SCALE_FINAL * 1.2,
        scaleY: COMBO_BANNER_SCALE_FINAL * 1.2,
        duration: COMBO_BANNER_FADE_MS,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.banner.setVisible(false);
        },
      });
      this.activeTweens.push(fadeTween);
    });
    this.activeTimers.push(fade);
  }

  private playGirlSurprise(): void {
    this.girl.setData('busy', true);
    this.girl.setFrame('girl-surprise-0');
    let frameIndex = 0;
    const surpriseTicker = this.scene.time.addEvent({
      delay: GIRL_SURPRISE_FRAME_MS,
      repeat: GIRL_SURPRISE_FRAMES.length - 1,
      callback: () => {
        frameIndex = Math.min(frameIndex + 1, GIRL_SURPRISE_FRAMES.length - 1);
        this.girl.setFrame(`girl-surprise-${frameIndex}`);
      },
    });
    this.activeTimers.push(surpriseTicker);

    const resetDelay = GIRL_SURPRISE_FRAMES.length * GIRL_SURPRISE_FRAME_MS + 400;
    const reset = this.scene.time.delayedCall(resetDelay, () => {
      this.girl.setFrame('girl-default');
      this.girl.setData('busy', false);
    });
    this.activeTimers.push(reset);
  }

  private playGiantScream(): void {
    this.giant.setData('busy', true);
    const moveTween = this.scene.tweens.add({
      targets: this.giant,
      y: this.giantBaseY + GIANT_TWEEN_Y_OFFSET,
      duration: GIANT_TWEEN_MS,
      yoyo: true,
      ease: 'Cubic',
    });
    this.activeTweens.push(moveTween);

    this.giant.setTexture('shared0-orig', 'giant-scream-0');
    let frameIndex = 0;
    const screamTicker = this.scene.time.addEvent({
      delay: GIANT_SCREAM_FRAME_MS,
      repeat: GIANT_SCREAM_FRAMES.length - 1,
      callback: () => {
        frameIndex = Math.min(frameIndex + 1, GIANT_SCREAM_FRAMES.length - 1);
        this.giant.setFrame(`giant-scream-${frameIndex}`);
      },
    });
    this.activeTimers.push(screamTicker);
  }

  private playCandyFly(_comboCount: number): void {
    const candyCount = COMBO_CANDY_COUNT;
    const start = this.scene.time.delayedCall(COMBO_CANDY_START_DELAY_MS, () => {
      let completed = 0;
      for (let i = 0; i < candyCount; i++) {
        const launch = this.scene.time.delayedCall(i * COMBO_CANDY_STAGGER_MS, () => {
          const sprite = this.scene.add.image(
            COMBO_CANDY_FROM.x + Phaser.Math.FloatBetween(-20, 20),
            COMBO_CANDY_FROM.y + Phaser.Math.FloatBetween(-20, 20),
            'shared3',
            'combo-candy',
          );
          sprite.setOrigin(0.5, 0.5);
          sprite.setDepth(COMBO_BANNER_DEPTH - 1);
          this.activeCandies.push(sprite);

          const sx = sprite.x;
          const sy = sprite.y;
          const counter = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: COMBO_CANDY_FLY_MS,
            ease: 'Linear',
            onUpdate: (tween) => {
              const value = tween.getValue() ?? 0;
              const x = Phaser.Math.Linear(sx, COMBO_CANDY_TO.x, value);
              const y = Phaser.Math.Linear(sy, COMBO_CANDY_TO.y, value) - COMBO_CANDY_ARC_HEIGHT * 4 * value * (1 - value);
              const scale = 1 + 0.3 * Math.sin(value * Math.PI);
              sprite.setPosition(x, y);
              sprite.setScale(scale);
              if (value >= 0.85) {
                sprite.setAlpha(1 - (value - 0.85) / 0.15);
              }
            },
            onComplete: () => {
              this.removeCandy(sprite);
              completed++;
              if (completed === candyCount) {
                this.giant.setTexture('shared0-orig', 'giant-default');
                this.giant.setData('busy', false);
              }
            },
          });
          this.activeTweens.push(counter);
        });
        this.activeTimers.push(launch);
      }
    });
    this.activeTimers.push(start);
  }

  private clearRuntimeState(): void {
    this.activeTimers.forEach((timer) => timer.remove(false));
    this.activeTimers = [];
    this.activeTweens.forEach((tween) => tween.stop());
    this.activeTweens = [];
    this.activeCandies.forEach((candy) => candy.destroy());
    this.activeCandies = [];
    this.banner.setVisible(false);
    this.banner.setAlpha(0);
    this.banner.setScale(0);
    this.girl.setFrame('girl-default');
    this.girl.setData('busy', false);
    this.giant.setTexture('shared0-orig', 'giant-default');
    this.giant.setData('busy', false);
    this.giant.y = this.giantBaseY;
  }

  private removeCandy(candy: Phaser.GameObjects.Image): void {
    this.activeCandies = this.activeCandies.filter((entry) => entry !== candy);
    candy.destroy();
  }
}
