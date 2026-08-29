const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
// 读取本项目 .env（显式指定路径，避免向上搜索到 Python 版 .env）
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// ---------- 读取 Skill 文件 ----------
const SKILL_DIR_GIANT = path.join(__dirname, 'skills', 'giant');
const SKILL_DIR_GILDED = path.join(__dirname, 'skills', 'gilded');

function readSkillFiles(directory) {
  const files = fs.readdirSync(directory).filter(f => f.endsWith('.md'));
  return files.map(f => fs.readFileSync(path.join(directory, f), 'utf-8'));
}

// Skill 配方是静态文件：首次读取后缓存，避免每次请求都用 readFileSync 同步读盘、
// 阻塞事件循环（Node 单线程，同步 I/O 会让并发请求排队）。
// 注意：改过 skills/ 下的 md 后需要重启服务才会生效。
const RECIPE_CACHE = new Map();

function loadRecipe(source) {
  if (RECIPE_CACHE.has(source)) return RECIPE_CACHE.get(source);
  const result = read_recipe_from_disk(source);
  RECIPE_CACHE.set(source, result);
  return result;
}

function read_recipe_from_disk(source) {
  if (source === '天宫') {
    const dir = SKILL_DIR_GIANT;
    const files = ['SKILL.md', 'visual-grammar.md', 'model-recipes.md', 'failure-constraints.md', 'scene-library.md'];
    return files.map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      return content;
    }).join('\n');
  }
  if (source === '鎏金') {
    const dir = SKILL_DIR_GILDED;
    const files = ['SKILL.md', 'visual-grammar.md', 'model-recipes.md', 'failure-constraints.md',
      'subject-compiler.md', 'hair-costume-grammar.md'];
    return files.map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      return content;
    }).join('\n');
  }
  return '';
}

const BRANCHES = {
  baiyu: { id: 'baiyu', name: '白玉金阙', src: '天宫', scene: '礼仪宫殿、天门、中轴长阶、云端回廊、白玉露台', mat: '象牙白玉石、朱砂木柱、古金构件、深色木顶、黑镜面漆地', light: '清晨/落日金光，阴影青灰，局部矿物青绿', mood: '庄严、神圣、秩序、静谧', ar: '16:9', raw: true, s: 200, c: 5 },
  yunhai: { id: 'yunhai', name: '云海孤城', src: '天宫', scene: '空殿、断桥、悬台、远山、无尽云海', mat: '大面积留白，单/极少人物', light: '雾蓝、月白、淡金，低饱和', mood: '辽阔、孤寂、超脱、时间停滞', ar: '16:9', raw: true, s: 200, c: 5 },
  shenmu: { id: 'shenmu', name: '神木仙境', src: '天宫', scene: '巨型古松、盘根古树、垂藤、悬崖寺观、林间天门', mat: '苍老木纹、青苔、岩壁、白玉栏杆、铜铃玉饰', light: '树冠缝隙体积光与薄雾', mood: '生机、古老、隐秘、敬畏', ar: '16:9', raw: true, s: 200, c: 5 },
  bingxue: { id: 'bingxue', name: '冰雪天关', src: '天宫', scene: '雪谷、冰壁、白色巨龙或冰雕天门、黑色绝壁、云瀑', mat: '冷蓝白为主，极少暖金点光', light: '冷蓝白，极低暖金', mood: '肃杀、清寂、朝圣、边界感', ar: '9:16', raw: true, s: 200, c: 5 },
  yuegong: { id: 'yuegong', name: '月宫星阙', src: '天宫', scene: '巨月、圆形月门、星河、夜间宫阙、悬浮山峰', mat: '月白、深青、暗金、少量朱红', light: '月光 / 殿内暖光单一主光', mood: '浪漫、清冷、遥远、神秘', ar: '1:1', raw: true, s: 200, c: 5 },
  shuimo_t: { id: 'shuimo_t', name: '水墨金箔（天宫版）', src: '天宫', scene: '人物衣袂化为山水、墨色云海、液态大漆、矿物颜料与金箔山脊', mat: '湿墨、半透明玉、树脂、鎏金、矿物青绿', light: '冷青黑大场域，暖掠光沿结构显现', mood: '抽象、材质转化、东方留白', ar: '16:9', raw: true, s: 200, c: 5 },
  meng: { id: 'meng', name: '梦幻透明鎏金', src: '鎏金', scene: '人物、动物、神兽、花卉、器物、抽象、近景/单体', mat: '透明琥珀金液/玻璃为主，少量花丝金属 / 碎金箔', light: '深青黑场域、暖象牙主体、香槟金高光、弱冷青边光', mood: '梦幻、神秘、精致、静谧 / 克制力量', ar: '16:9', raw: false, s: 350, c: 5 },
  shuimo_j: { id: 'shuimo_j', name: '水墨金箔世界（鎏金版）', src: '鎏金', scene: '山水、建筑、巨树、服装延展、微缩世界、抽象地形', mat: '湿墨/黑漆 + 贴附碎金箔 + 白树脂云/宣纸/矿物青绿', light: '冷青黑大场域，暖掠光沿结构短暂显现', mood: '辽阔、古老、内省、东方留白', ar: '16:9', raw: false, s: 350, c: 5 },
  yuxue: { id: 'yuxue', name: '雨雪湿光', src: '鎏金', scene: '雨、雪、雾、湿发、湿毛、雨夜街巷、风雪荒野', mat: '湿润真实表面、稀疏金痕、透明水膜、天气粒子', light: '冷青灰天气，暖肤色/主体局部低角度金光', mood: '触觉化、亲密、脆弱、坚韧', ar: '16:9', raw: false, s: 350, c: 5 },
  huasi: { id: 'huasi', name: '花丝圣像', src: '鎏金', scene: '仪式人物、神兽正面、祭器、面具、王座、门扉、雕像', mat: '实心花丝金属 + 透明金液分层；珍珠/月弧可选', light: '近黑背景、暖金主光、局部强反射 bloom', mood: '庄严、华丽、神圣', ar: '1:1', raw: false, s: 325, c: 3 },
  kuangcai: { id: 'kuangcai', name: '矿彩树脂梦境', src: '鎏金', scene: '花卉、海洋生物、地貌、器物、抽象、桌面微缩', mat: '象牙树脂、半透玉质、青绿矿彩、朱砂小点、湿墨、金箔', light: '柔和顶光/侧光，金在树脂内部折射', mood: '超现实、精工、宁静、珍贵', ar: '3:4', raw: false, s: 400, c: 5 },
};

function get_branch(branchId) {
  return BRANCHES[branchId] || null;
}

// 用字符串拼接避免模板字符串中的backtick问题
function build_system(branch, secondary) {
  const recipePrimary = loadRecipe(branch.src);
  const recipeSecondary = secondary ? loadRecipe(secondary.src) : '';
  const b = BRANCHES[branch.id];
  if (!b) throw new Error(`未知分支 ${branch.id}`);

  const branchFeatures = "【当前分支】\n" + b.name + "\n场景：" + b.scene + "\n材质：" + b.mat + "\n光影：" + b.light + "\n氛围：" + b.mood + "\n画幅比例：" + b.ar + "\nMJ 参数默认：--raw --s " + b.s + " --c " + b.c + "\n\n【输出结构（必须保留四段，每段前面都要有 ### 标题）】\n### 画面设计\n（3行以内，按主感觉铺陈，结尾自然过渡）\n### ImageGen Prompt\n（中文描述，便于 ImageGen 使用）\n### Midjourney 8.2 Prompt\n（英文，严格以 --v 8.2 结尾，包含 --ar " + b.ar + " --raw --s " + b.s + " --c " + b.c + " 以及 no text, no logos, no watermarks 等约束）\n### 可调选项\n（可选项，勾选后可在生成后自行修改）\n\n【硬性规则】\n- Midjourney 8.2 Prompt 必须以 --v 8.2 结尾，中间不能插入其他参数。\n- 禁止出现 --sref, --oref, --seed, --profile, --p, --hd 等非法参数。\n- --ar 后面必须跟 W:H 格式，如 --ar 16:9。\n- --raw, --s, --c 必须保留，数值可根据分支默认调整。\n- 输出仅最终结果，不要设计说明、自检表、规则分析或元内容。";

  let system = "这是唯一必须遵循的规范\n\n" + recipePrimary + "\n\n" + branchFeatures + "\n";

  // 混合分支：加载其 Skill 配方，让「叠加」真正生效（不仅是名字）
  if (secondary) {
    system += "\n\n【混合分支：" + secondary.name + "（" + secondary.src + "系）】\n以下为该分支的 Skill 配方，可与主分支风格融合，按主感觉协调二者视觉语言：\n\n" + recipeSecondary + "\n";
  }

  return system;
}

function build_user(p) {
  const brief = (p.brief || '').trim();
  const subject = (p.subject || '').trim();
  const styling = (p.styling || '').trim();
  const activity = (p.activity || '').trim();
  const scale = (p.scale || '').trim();
  const materials = (p.materials || []).filter(m => m).join('、') || '';
  const ar = p.ar || '16:9';
  const raw = p.raw ? '1' : '0';
  const s = p.s || '200';
  const c = p.c || '5';
  // 前端发送的是 branchId / secondaryId（与 Python 版保持一致）
  const primaryBranch = get_branch(p.branchId) || BRANCHES['baiyu'];
  const secondaryBranch = p.secondaryId ? get_branch(p.secondaryId) : null;

  let user = `【创作自然语言】${brief}\n`;
  if (subject) user += `【主体描述】${subject}\n`;
  if (styling) user += `【画面风格】${styling}\n`;
  if (activity) user += `【活动主题】${activity}\n`;
  user += `【画幅与 MJ 参数】--ar ${ar} --raw ${raw} --s ${s} --c ${c}\n`;
  if (materials) user += `【材质】${materials}\n`;
  user += `【主分支】${primaryBranch.name}\n`;
  if (secondaryBranch) user += `【混合分支】${secondaryBranch.name}\n`;
  user += `--v 8.2`;
  return user;
}

function parse_sections(text) {
  // 按 "### " 切分，捕获每个 section 直到下一个标题或文末，避免长输出被 500 字截断
  const blocks = (text || '').split(/### /);
  let design = '', img = '', mj = '', opt = '';

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const nl = block.indexOf('\n');
    const head = (nl >= 0 ? block.slice(0, nl) : block).trim();
    const body = (nl >= 0 ? block.slice(nl + 1) : '').trim();
    if (head.includes('画面设计')) design = body;
    else if (head.includes('ImageGen Prompt')) img = body;
    else if (head.includes('Midjourney 8.2 Prompt')) mj = body;
    else if (head.includes('可调选项')) opt = body;
  }

  if (mj && !mj.endsWith('--v 8.2')) {
    if (!mj.includes('--v')) mj += ' --v 8.2';
    else {
      const lines = mj.split('\n');
      const last = lines[lines.length - 1].trim();
      if (last.includes('--v') && !last.includes('8.2')) {
        lines[lines.length - 1] = last.replace(/--v\d*/, '--v 8.2');
        mj = lines.join('\n');
      }
    }
  }

  return { design, img, mj, opt };
}

function validate_output(sections, requireHuman) {
  const errors = [];
  const mj = (sections.mj || '').trim();

  const forbidden = /--sref|--oref|--seed|--profile|--p\b|--hd/i;
  if (forbidden.test(mj)) {
    errors.push('MJ 提示词含非法参数：--sref / --oref / --seed / --profile / --p / --hd');
  }

  if (!mj.endsWith('--v 8.2')) {
    errors.push('Midjourney 8.2 Prompt 必须以 --v 8.2 结尾');
  }

  if (/\b(https?|www)\S+/.test(mj)) {
    errors.push('MJ 提示词含非法 URL');
  }

  if (/{{|\}\}/.test(mj)) {
    errors.push('MJ 提示词含未完成占位符');
  }

  if (!/--ar\s+\d+:\d+/.test(mj)) {
    errors.push('MJ 提示词缺少 --ar 画幅参数');
  }

  if (requireHuman) {
    const humanTerms = /发饰|头饰|服装|服饰|纹理|质地|妆容|眼妆|嘴唇|发型|首饰/;
    if (!humanTerms.test(mj) && !humanTerms.test(sections.design || '')) {
      errors.push('（requireHuman 模式）缺少人物造型词（如：发饰、服装、纹理等）');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------- SSRF 防护：不要让服务端变成打内网的代理 ----------
// 页面允许使用者自行填写 Base URL，若不校验，服务端就会被拿去请求任意地址
// （扫内网、探测云元数据 169.254.169.254 等）。这里只拦「私有 / 本机 / 非 http(s)」，
// 公网域名一律放行，换豆包 / DeepSeek / NVIDIA 等端点都不受影响。
function isBlockedHost(hostname) {
  const h = (hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return true;

  // IPv4 字面量
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127 || a === 10 || a === 0) return true;      // 回环 / 私有 A 类 / 0.0.0.0
    if (a === 169 && b === 254) return true;                // 云元数据 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true;       // 私有 B 类
    if (a === 192 && b === 168) return true;                // 私有 C 类
    if (a >= 224) return true;                              // 组播 / 保留段
    return false;
  }

  // IPv6 字面量：回环、未指定、唯一本地、链路本地
  if (h === '::1' || h === '::' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;

  return false;
}

function assertSafeEndpoint(base) {
  let u;
  try {
    u = new URL(base);
  } catch (_) {
    throw new Error('接口地址不是合法 URL：' + base);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('接口地址协议必须是 http 或 https：' + base);
  }
  if (isBlockedHost(u.hostname)) {
    throw new Error('接口地址指向内网或本机地址，已拒绝：' + base);
  }
}

function isNVIDIA(cfg) {
  const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').toLowerCase();
  const model = (cfg.model || process.env.LLM_MODEL || '').toLowerCase();
  return base.includes('nvidia.com') || base.includes('integrate.api') || model.startsWith('nvidia/');
}

function build_messages(system, user, cfg) {
  // NVIDIA 原型端点对 system role 支持不稳定，常报 400；
  // 把 system 内容合并到 user 前面，既保留 Skill 配方约束，又避免角色错误。
  if (isNVIDIA(cfg) && system) {
    return [{ role: 'user', content: '[系统规范]\n' + system + '\n\n---\n[用户请求]\n' + user }];
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

// ---------- OpenAI 通用调用参数 ----------
// 取值优先级：面板填写 > .env 站点默认 > 不发送（交给模型服务端默认）
// 关键语义：只有取到有效值时才把字段写进请求体。很多兼容端点（豆包 / NVIDIA / vLLM）
// 遇到不认识的参数会直接报 400，所以「留空即不发送」是安全的默认行为。

// 取第一个非空值；全空返回 null 表示「不发送该参数」
function pick(cfgVal, envVal) {
  const a = (cfgVal === undefined || cfgVal === null) ? '' : String(cfgVal).trim();
  if (a !== '') return a;
  const b = (envVal === undefined || envVal === null) ? '' : String(envVal).trim();
  if (b !== '') return b;
  return null;
}

function toNum(v) {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// 标准 OpenAI Chat Completions 通用参数（temperature / top_p / penalty / seed / stop ...）
function build_params(cfg, opts) {
  const params = {};
  const o = opts || {};

  // max_tokens 字段名：o 系、豆包 thinking 等推理模型要求改用 max_completion_tokens
  const tokenField = pick(cfg.tokenField, process.env.TOKEN_FIELD) === 'max_completion_tokens'
    ? 'max_completion_tokens'
    : 'max_tokens';
  // 默认值刻意压低：16K 输出会让单次生成耗时数分钟；四段提示词 4K 通常已足够。
  // 需要更长输出时，在 .env / 平台环境变量里设 MAX_TOKENS 即可覆盖。
  let maxTokens = parseInt(pick(cfg.maxTokens, process.env.MAX_TOKENS) || '4096', 10);
  if (o.maxTokens) maxTokens = o.maxTokens;
  params[tokenField] = maxTokens;

  const temperature = toNum(pick(cfg.temperature, process.env.TEMPERATURE));
  if (temperature !== null) params.temperature = temperature;

  const topP = toNum(pick(cfg.topP, process.env.TOP_P));
  if (topP !== null) params.top_p = topP;

  const presencePenalty = toNum(pick(cfg.presencePenalty, process.env.PRESENCE_PENALTY));
  if (presencePenalty !== null) params.presence_penalty = presencePenalty;

  const frequencyPenalty = toNum(pick(cfg.frequencyPenalty, process.env.FREQUENCY_PENALTY));
  if (frequencyPenalty !== null) params.frequency_penalty = frequencyPenalty;

  // seed 必须是整数
  const seed = toNum(pick(cfg.seed, process.env.SEED));
  if (seed !== null) params.seed = Math.trunc(seed);

  // stop：支持多值，前端用英文逗号分隔
  const stopRaw = pick(cfg.stop, process.env.STOP);
  if (stopRaw) {
    const parts = stopRaw.split(',').map(s => s.trim()).filter(s => s.length);
    if (parts.length === 1) params.stop = parts[0];
    else if (parts.length > 1) params.stop = parts;
  }

  // response_format：text（默认） / json_object
  const rf = pick(cfg.responseFormat, process.env.RESPONSE_FORMAT);
  if (rf === 'json_object') params.response_format = { type: 'json_object' };
  else if (rf === 'text') params.response_format = { type: 'text' };

  // user：稳定标识，便于服务端做滥用追踪
  const userTag = pick(cfg.user, process.env.LLM_USER);
  if (userTag) params.user = userTag;

  // 思考 / 推理强度（o 系、豆包 thinking、DeepSeek-reasoner 等）
  if (cfg.reasoningEnabled && cfg.reasoningEffort) {
    params.reasoning_effort = cfg.reasoningEffort;
  }

  return params;
}

// 非 OpenAI 标准的扩展参数：仅部分兼容端点支持（vLLM / 豆包 / 本地推理服务）。
// 通过 extra_body 合并进请求体顶层；不支持的端点保持留空即可避免报错。
function build_extra_body(cfg) {
  const extra = {};

  const topK = toNum(pick(cfg.topK, process.env.TOP_K));
  if (topK !== null) extra.top_k = Math.trunc(topK);

  const repPen = toNum(pick(cfg.repetitionPenalty, process.env.REPETITION_PENALTY));
  if (repPen !== null) extra.repetition_penalty = repPen;

  return Object.keys(extra).length ? extra : null;
}

// Skill 配方动辄上万字，塞进代码块会直接撑爆；统一截断并标注原文长度
function shortContent(raw) {
  const c = (raw || '').replace(/\n/g, '\\n');
  return c.length > 90 ? c.slice(0, 90) + '…（共 ' + (raw || '').length + ' 字，完整原文见预览上方）' : c;
}

// 形式一：OpenAI SDK（Node.js）—— 对齐 DeepSeek / OpenAI 官方示例写法
function build_sdk_code(cfg, params, extra, messages) {
  const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
  const model = cfg.model || process.env.LLM_MODEL || '';
  const p = params || {};

  const L = [];
  L.push('// Please install OpenAI SDK first: `npm install openai`');
  L.push('import OpenAI from "openai";');
  L.push('');
  L.push('const openai = new OpenAI({');
  L.push("  baseURL: '" + base + "',");
  L.push('  apiKey: process.env.LLM_API_KEY,');
  L.push('});');
  L.push('');
  L.push('async function main() {');
  L.push('  const completion = await openai.chat.completions.create({');
  L.push('    messages: [');
  (messages || []).forEach(m => {
    L.push('      { role: "' + m.role + '", content: "' + shortContent(m.content).replace(/"/g, '\\"') + '" },');
  });
  L.push('    ],');
  L.push('    model: "' + model + '",');

  // 思考模式：DeepSeek 风格用 thinking 开关，配合 reasoning_effort
  if (cfg.reasoningEnabled) {
    L.push('    thinking: {"type": "enabled"},');
  }

  Object.keys(p).forEach(k => {
    if (p[k] === undefined) return;
    L.push('    ' + k + ': ' + JSON.stringify(p[k]) + ',');
  });
  if (extra) {
    L.push('    // 扩展参数（非 OpenAI 标准）：合并进请求体顶层');
    L.push('    extra_body: ' + JSON.stringify(extra) + ',');
  }
  L.push('    stream: false,');
  L.push('  });');
  L.push('');
  L.push('  console.log(completion.choices[0].message.content);');
  L.push('}');
  L.push('');
  L.push('main();');

  return L.join('\n');
}

// 形式二：原生 HTTP（axios）—— 对齐 NVIDIA 官方示例写法，不依赖 SDK，能看清真实请求体
function build_http_code(cfg, params, extra, messages) {
  const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
  const model = cfg.model || process.env.LLM_MODEL || '';
  const p = params || {};

  // 组装 payload：字段顺序与官方示例一致（model / messages / 参数... / stream）
  const payload = {
    model: model,
    messages: (messages || []).map(m => ({ role: m.role, content: shortContent(m.content) })),
  };
  Object.keys(p).forEach(k => { if (p[k] !== undefined) payload[k] = p[k]; });
  if (extra) Object.keys(extra).forEach(k => { payload[k] = extra[k]; });
  payload.stream = false;

  // 整体缩进 2 空格，嵌进 main() 内部
  const payloadText = JSON.stringify(payload, null, 2).replace(/\n/g, '\n  ');

  const L = [];
  L.push('// Please install axios first: `npm install axios`');
  L.push("import axios from 'axios';");
  L.push('');
  L.push("const invokeUrl = '" + base + "/chat/completions';");
  L.push('const stream = false;');
  L.push('');
  L.push('const headers = {');
  L.push('  "Authorization": "Bearer $LLM_API_KEY",');
  L.push('  "Accept": stream ? "text/event-stream" : "application/json",');
  L.push('};');
  L.push('');
  L.push('async function main() {');
  L.push('  const payload = ' + payloadText + ';');
  L.push('');
  L.push('  const response = await axios.post(invokeUrl, payload, {');
  L.push('    headers: headers,');
  L.push("    responseType: stream ? 'stream' : 'json',");
  L.push('  });');
  L.push('');
  L.push('  if (stream) {');
  L.push("    response.data.on('data', (chunk) => {");
  L.push('      console.log(chunk.toString());');
  L.push('    });');
  L.push('  } else {');
  L.push('    console.log(JSON.stringify(response.data));');
  L.push('  }');
  L.push('}');
  L.push('');
  L.push('main().catch(error => {');
  L.push('  if (error.response) {');
  L.push('    console.error(`HTTP ${error.response.status}`);');
  L.push('    if (error.response.data?.on) {');
  L.push("      error.response.data.on('data', (chunk) => console.error(chunk.toString()));");
  L.push('    } else {');
  L.push('      console.error(error.response.data);');
  L.push('    }');
  L.push('  } else {');
  L.push('    console.error(error);');
  L.push('  }');
  L.push('});');

  return L.join('\n');
}

// opts.maxTokens：可覆盖输出上限（测试连接时压到很小，既快又能验证参数是否被端点接受）
async function call_llm(system, user, cfg, opts) {
  // 优先级：前端面板传入的 config > .env 站点默认（改 .env 后须重启服务生效）
  const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
  const key = cfg.apiKey || process.env.LLM_API_KEY || '';
  const model = cfg.model || process.env.LLM_MODEL || '';

  if (!base) throw new Error('未配置接口地址（Base URL）：请在面板填写，或在 .env 设置 LLM_BASE_URL');
  if (!key) throw new Error('未配置 API Key：请在面板填写，或在 .env 设置 LLM_API_KEY');
  if (!model) throw new Error('未配置模型名：请在面板填写，或在 .env 设置 LLM_MODEL');

  // SSRF 防护：拒绝内网 / 本机 / 非 http(s) 的端点
  assertSafeEndpoint(base);

  const messages = build_messages(system, user, cfg);

  // 通用调用参数：只发送面板/站点显式配置过的字段
  const params = build_params(cfg, opts);
  const extra = build_extra_body(cfg);
  const kwargs = { model, messages, ...params };
  if (extra) Object.assign(kwargs, extra);

  const payloadSize = JSON.stringify(kwargs).length;
  const region = process.env.RAILWAY_REGION || process.env.FLY_REGION || 'unknown';
  console.log(`[call_llm] base=${base} model=${model} payloadBytes=${payloadSize} region=${region}`);

  // 主路径走 axios 原生 HTTP：在 Railway 容器里比 OpenAI SDK 更稳定（避免 ETIMEDOUT）
  const url = base + '/chat/completions';
  try {
    const r = await axios.post(url, kwargs, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      timeout: 300000,
      responseType: 'json',
      validateStatus: () => true,
    });
    if (r.status >= 200 && r.status < 300) {
      const content = r.data?.choices?.[0]?.message?.content;
      if (content) return content;
      throw new Error('LLM 返回为空：choices[0].message.content 缺失');
    }
    const err = new Error(`LLM 调用失败: HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
    err.status = r.status;
    err.body = r.data;
    throw err;
  } catch (e) {
    if (e.response) {
      const err = new Error(`LLM 调用失败: HTTP ${e.response.status}: ${JSON.stringify(e.response.data).slice(0, 200)}`);
      err.status = e.response.status;
      err.body = e.response.data;
      throw err;
    }
    // 已经是我们构造好的 HTTP 错误对象（带 status/body），直接原样抛出
    if (e.status != null || e.body != null) throw e;
    throw new Error('LLM 调用失败: ' + e.message);
  }
}

// MOCK 演示模式示例输出（结构合法：MJ 以 --v 8.2 结尾、含 --ar）
function mock_sections(branch, p) {
  const ar = p.ar || branch.ar;
  const s = p.s || branch.s;
  const c = p.c || branch.c;
  const sceneOne = (branch.scene || '').split('、')[0] || '场景';
  const matOne = (branch.mat || '').split('、')[0] || '材质';
  return {
    design: '（演示模式示例，非真实生成）「' + branch.name + '」：' + (p.brief || '主体') + '。场景 ' + branch.scene + '，材质 ' + branch.mat + '，光影 ' + branch.light + '，氛围 ' + branch.mood + '。',
    img: '（演示模式示例）' + (p.brief || '主体') + '，置于' + sceneOne + '，' + matOne + '质感，' + branch.light + '，' + branch.mood + '氛围，构图稳定，主体落地有支撑。',
    mj: 'demo mock output MOCK mode, ' + sceneOne + ', ' + matOne + ', cinematic lighting --ar ' + ar + ' --raw --s ' + s + ' --c ' + c + ' --v 8.2',
    opt: '（演示模式示例）可调选项：景别（特写/全景）、光影强度、' + matOne + '密度。\n关闭演示模式：.env 中 MOCK=0，重启服务即可真实生成。'
  };
}

// ---------- API 路由 ----------

// 忠实返回 .env 当前值：页面占位符显示的就是这里的内容（改 .env 后须重启服务生效）
app.get('/api/config', (req, res) => {
  // 空字符串 = 站点未设置，该参数最终不会被发送（交给模型服务端默认）
  const cfg = {
    baseUrl: process.env.LLM_BASE_URL || '',
    model: process.env.LLM_MODEL || '',
    maxTokens: parseInt(process.env.MAX_TOKENS || '4096', 10),
    apiKeySet: !!process.env.LLM_API_KEY,
    mock: process.env.MOCK === '1',
    reasoningEnabled: false,
    reasoningEffort: 'medium',
  };
  const masked = process.env.LLM_API_KEY ? '****' + process.env.LLM_API_KEY.slice(-4) : '(空)';
  res.json({ ...cfg, apiKeyMasked: masked });
});

app.post('/api/generate', async (req, res) => {
  try {
    const p = req.body;
    if (!p.brief || !p.brief.trim()) {
      return res.status(400).json({ error: '请填写创作自然语言' });
    }

    const branch = get_branch(p.branchId);
    if (!branch) return res.status(400).json({ error: '未知风格分支' });

    const secondary = p.secondaryId ? get_branch(p.secondaryId) : null;
    const system = build_system(branch, secondary);
    const user = build_user(p);

    // MOCK=1 演示模式：不调用真实接口，返回示例结构（.env 中设 MOCK=0 并重启即可真实生成）
    if (process.env.MOCK === '1') {
      return res.json(mock_sections(branch, p));
    }

    const raw = await call_llm(system, user, p.config || {});

    let sections = parse_sections(raw);
    if (!sections.design && !sections.img && !sections.mj && !sections.opt) {
      sections = { design: '', img: '', mj: '', opt: '', raw };
    }

    res.json(sections);
  } catch (e) {
    const status = e.status ?? e.response?.status ?? null;
    const body = e.body ?? e.response?.data ?? null;
    let bodyStr = null;
    try { bodyStr = JSON.stringify(body); } catch (_) { bodyStr = String(body); }
    console.error('[/api/generate] 失败:', e.message, '| status:', status, '| body:', bodyStr);
    res.status(500).json({ error: 'LLM 调用失败: ' + e.message, status, body });
  }
});

app.post('/api/validate', (req, res) => {
  try {
    const p = req.body;
    const sections = {
      design: p.design || '',
      img: p.img || '',
      mj: p.mj || '',
      opt: p.opt || '',
    };
    const result = validate_output(sections, p.requireHuman ?? false);
    res.json(result);
  } catch (e) {
    res.status(500).json({ valid: false, errors: [e.message] });
  }
});

// 诊断接口：直接用 axios 发最小 payload 到 LLM 端点，定位是「网络连接问题」还是「OpenAI SDK 问题」
app.post('/api/health-llm', async (req, res) => {
  const cfg = req.body || {};
  const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
  const model = cfg.model || process.env.LLM_MODEL || '';
  const key = cfg.apiKey || process.env.LLM_API_KEY || '';
  const url = base + '/chat/completions';
  const payload = { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 2 };
  const start = Date.now();
  try {
    // SSRF 防护：拒绝内网 / 本机 / 非 http(s) 的端点
    assertSafeEndpoint(base);
    const r = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      timeout: 30000,
      validateStatus: () => true,
    });
    return res.json({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      latencyMs: Date.now() - start,
      target: { baseUrl: base, model: model },
      bodyPreview: JSON.stringify(r.data).slice(0, 200),
    });
  } catch (e) {
    return res.json({
      ok: false,
      error: e.message,
      code: e.code,
      latencyMs: Date.now() - start,
      target: { baseUrl: base, model: model },
    });
  }
});

app.post('/api/test', async (req, res) => {
  const cfg = req.body || {};
  const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
  const model = cfg.model || process.env.LLM_MODEL || '';
  try {
    if (process.env.MOCK === '1') {
      return res.json({ ok: true, sample: '(演示模式 MOCK=1，未真实调用)' });
    }
    // 测试连接不发送 system role，避免部分端点（如 NVIDIA 原型）因角色问题报 400
    // max_tokens 压到 64：既快速返回，又能顺带验证通用参数是否被端点接受
    const text = await call_llm('', '你是连接测试助手，只回复「ok」两个字，不要多余内容。\n\nping', cfg, { maxTokens: 64 });
    return res.json({ ok: true, sample: text ? text.slice(0, 60) : '' });
  } catch (e) {
    return res.json({
      ok: false,
      error: e.message,
      status: e.status,
      body: e.body,
      target: { baseUrl: base, model: model }
    });
  }
});

// 查看请求体：组装与 /api/generate 完全一致的消息，但不真正调用 LLM、不消耗额度
app.post('/api/preview', (req, res) => {
  try {
    const p = req.body;
    const branch = get_branch(p.branchId);
    if (!branch) return res.status(400).json({ error: '未知风格分支' });

    const secondary = p.secondaryId ? get_branch(p.secondaryId) : null;
    const system = build_system(branch, secondary);
    const user = build_user(p);

    const cfg = p.config || {};
    const base = (cfg.baseUrl || process.env.LLM_BASE_URL || '').replace(/\/$/, '');
    const model = cfg.model || process.env.LLM_MODEL || '';
    const key = cfg.apiKey || process.env.LLM_API_KEY || '';

    const messages = build_messages(system, user, cfg);
    const params = build_params(cfg);
    const extra = build_extra_body(cfg);

    res.json({
      model: model,
      baseUrl: base,
      apiKeyMasked: key ? ('****' + key.slice(-4)) : '(空)',
      messages,
      // 实际会随请求发出的调用参数（未配置的一律不出现在这里）
      params,
      extra_body: extra,
      // 两种可直接复制运行的代码形式：OpenAI SDK 版 / 原生 HTTP(axios) 版
      sdkCode: build_sdk_code(cfg, params, extra, messages),
      httpCode: build_http_code(cfg, params, extra, messages),
      mock: process.env.MOCK === '1',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌐 Node.js 版工作台运行在 http://0.0.0.0:${PORT}`);
  console.log('请用浏览器打开上面的链接，或访问 http://127.0.0.1:' + PORT);
});

module.exports = app;