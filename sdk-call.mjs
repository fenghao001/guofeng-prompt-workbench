// ============================================================
//  sdk-call.mjs  ·  OpenAI SDK（Node.js）真实调用版
//  运行：  node sdk-call.mjs
//  依赖：  npm install openai dotenv   （项目里已装好）
// ============================================================
import 'dotenv/config';
import OpenAI from 'openai';

/* ============================================================
 *  ↓↓↓  可手动修改区  ↓↓↓
 *  直接在下面改这几个常量即可，改完保存再跑。
 * ============================================================ */
const SYSTEM_PROMPT = '你是一位国风提示词专家，擅长天宫 / 鎏金水墨风格，输出严格按【人物资产】【场景资产】【道具资产】【色板资产】四段。';
const USER_PROMPT   = '请为「金冠神女」生成一套资产 prompt，要求鎏金水墨风、竖版 9:16。';
const MODEL_OVERRIDE = '';     // 留空 = 用 .env 的 LLM_MODEL；填了就优先用这个
const MAX_TOKENS    = 1024;    // 输出上限，按需调大/调小

/* 以下一般不用改，自动从 .env 读取（LLM_BASE_URL / LLM_API_KEY / LLM_MODEL） */
const BASE_URL = process.env.LLM_BASE_URL || '';
const API_KEY  = process.env.LLM_API_KEY || '';
const MODEL    = MODEL_OVERRIDE || process.env.LLM_MODEL || '';

if (!BASE_URL || !API_KEY || !MODEL) {
  console.error('缺少配置：请在 .env 设置 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL，或在上方填 MODEL_OVERRIDE');
  process.exit(1);
}

const openai = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });

// NVIDIA 端点不支持 system role，自动把 system 合并进单条 user 消息
const isNVIDIA = BASE_URL.includes('nvidia');
const messages = isNVIDIA
  ? [{ role: 'user', content: `[系统规范]\n${SYSTEM_PROMPT}\n\n---\n[用户请求]\n${USER_PROMPT}` }]
  : [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: USER_PROMPT },
    ];

console.log('→ 端点:', BASE_URL, '| 模型:', MODEL, '| NVIDIA单消息模式:', isNVIDIA);
console.log('→ 请求中...\n');

const resp = await openai.chat.completions.create({
  model: MODEL,
  messages,
  max_tokens: MAX_TOKENS,
  stream: false,
});

console.log('=== 模型返回 ===');
console.log(resp.choices[0].message.content);
