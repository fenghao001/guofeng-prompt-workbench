// ============================================================
//  axios-call.mjs  ·  原生 HTTP（axios）真实调用版
//  运行：  node axios-call.mjs
//  依赖：  npm install axios dotenv   （项目里已装好）
//  特点：  不依赖 SDK，能看清真实请求体 / 响应体，便于调试
// ============================================================
import 'dotenv/config';
import axios from 'axios';

/* ============================================================
 *  ↓↓↓  可手动修改区  ↓↓↓
 *  直接在下面改这几个常量即可，改完保存再跑。
 * ============================================================ */
// 系统提示词
const SYSTEM_PROMPT = '你是一位国风提示词专家，擅长天宫 / 鎏金水墨风格，输出严格按【人物资产】【场景资产】【道具资产】【色板资产】四段。';
// 你的需求
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

// NVIDIA 端点不支持 system role，自动把 system 合并进单条 user 消息
const isNVIDIA = BASE_URL.includes('nvidia');
const messages = isNVIDIA
  ? [{ role: 'user', content: `[系统规范]\n${SYSTEM_PROMPT}\n\n---\n[用户请求]\n${USER_PROMPT}` }]
  : [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: USER_PROMPT },
    ];

const invokeUrl = BASE_URL.replace(/\/$/, '') + '/chat/completions';
const headers = {
  'Authorization': 'Bearer ' + API_KEY,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};
const payload = {
  model: MODEL,
  messages,
  max_tokens: MAX_TOKENS,
  stream: false,
};

console.log('→ POST:', invokeUrl, '| 模型:', MODEL, '| NVIDIA单消息模式:', isNVIDIA);
console.log('→ 请求体:', JSON.stringify(payload, null, 2));
console.log('→ 请求中...\n');

try {
  const response = await axios.post(invokeUrl, payload, { headers, responseType: 'json' });
  const data = response.data;
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
    || JSON.stringify(data, null, 2);
  console.log('=== 模型返回 ===');
  console.log(content);
} catch (error) {
  if (error.response) {
    console.error('HTTP ' + error.response.status);
    console.error(JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error);
  }
  process.exit(1);
}
