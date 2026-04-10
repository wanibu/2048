// 前后端共享的游戏逻辑：操作记录 + 链式签名

export interface GameAction {
  step: number;       // 第几步
  type: 'shoot' | 'rotate' | 'direct_merge'; // 操作类型
  col?: number;       // 发射列
  value?: number;     // 糖果值
  direction?: 'cw' | 'ccw'; // 旋转方向
  resultValue?: number; // 直接合并的结果值
}

export interface GameRecord {
  actions: GameAction[];
  finalScore: number;
  finalSign: string;
  seed: number;        // 随机种子，用于重放验证
}

// 简单hash函数（前后端一致）
// 生产环境可换成 HMAC-SHA256
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 链式签名：sign = hash(prevSign + actionJson)
export async function chainSign(prevSign: string, action: GameAction): Promise<string> {
  const actionStr = JSON.stringify(action);
  return sha256(prevSign + actionStr);
}

// 初始签名（用种子生成）
export async function initSign(seed: number): Promise<string> {
  return sha256(`giant2048_seed_${seed}`);
}

// 验证整个游戏记录
export async function verifyGameRecord(record: GameRecord): Promise<boolean> {
  let sign = await initSign(record.seed);

  for (const action of record.actions) {
    sign = await chainSign(sign, action);
  }

  return sign === record.finalSign;
}
