// 浏览器指纹生成：采集设备特征生成唯一ID
// 用于标识玩家身份，不需要登录注册

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getFingerprint(): Promise<string> {
  const components: string[] = [];

  // 1. Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Giant2048FP', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('Giant2048FP', 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    components.push('canvas-error');
  }

  // 2. 屏幕信息
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // 3. 时区
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // 4. 语言
  components.push(navigator.language);

  // 5. 平台
  components.push(navigator.platform);

  // 6. User Agent
  components.push(navigator.userAgent);

  // 7. 硬件并发数
  components.push(String(navigator.hardwareConcurrency || 0));

  // 组合所有特征生成 hash
  const raw = components.join('|||');
  return sha256(raw);
}
