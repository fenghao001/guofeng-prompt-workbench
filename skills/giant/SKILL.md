---
name: giant-celestial-palace-prompts
description: Convert a short Chinese scene idea into a coherent house style of monumental Chinese celestial-palace imagery, then produce a ready-to-use ImageGen prompt and a pasteable Midjourney prompt ending in --v 8.2. Use for 巨物天宫、中式仙宫、白玉京、云海宫殿、东方玄幻巨构、云上仙境、仙山神殿、天门、巨型古树、月宫、冰雪天关, or when the user wants this established style without supplying reference images. Also use when the user asks to directly generate an ImageGen image in this style; do not use for unrelated image aesthetics or video motion prompts.
---

# 巨物天宫中式美学提示词

把用户的一句话场景编译为稳定、可变化的“巨物天宫中式美学”，而不是套用一段固定提示词。始终保留用户明确给出的人物、数量、动作、物件、地点、时间和情绪。

## 工作流

1. 从用户输入提取不可改动的事实：场景、人物数量或群体、动作、关键物件、时代限制、画幅和输出意图。
2. 读取 [references/visual-grammar.md](references/visual-grammar.md)，选择一个主风格分支；只在用户要求混合时组合两个分支。
3. 涉及喝茶、奏乐、议事、宴饮、阅读、祭礼等活动时，读取 [references/scene-library.md](references/scene-library.md)，确保动作可读且道具关系正确。
4. 读取 [references/model-recipes.md](references/model-recipes.md)，分别编写 ImageGen 与 Midjourney 版本；不得把同一段提示词机械复制给两个模型。
5. 读取 [references/failure-constraints.md](references/failure-constraints.md)，添加与当前场景有关的约束，避免堆砌全部负面词。
6. 仅当用户询问风格出处、研究依据或证据链时，读取 [references/evidence-index.md](references/evidence-index.md)。
7. 输出前自检：内容保真、人物尺度、建筑逻辑、光线一致、两种模型格式、Midjourney 版本后缀。

## 默认视觉决策

当用户没有指定时采用以下默认值：

- 主风格：白玉金阙，辅以云海孤城的留白。
- 时代语言：架空中华天界；轮廓偏唐宋的舒展，空间礼序与细部参考传统宫殿，不宣称历史复原。
- 画幅：横向电影定场镜头，`16:9`。
- 光线：清晨或日落的低角度金光，阴影保持青灰冷调。
- 构图：环境主导，前景框景、中景人物与活动、远景云海或巨构，层次清楚。
- 色彩：象牙白、朱砂红、古金、矿物青绿、雾蓝；避免霓虹和高饱和杂色。
- 人物：使用原创、非特定真人的古装人物，默认背面或侧后方，不生成名人肖像。
- 文本：画面中无文字、标志、水印、字幕或界面元素，除非用户明确要求。

## 人物尺度规则

不要把所有人物都缩成同一种“小人”。

- 纯景观或独行者：人物高度约占画面 1%–5%，承担尺度与情绪锚点。
- 群体活动：人物高度约占画面 8%–15%，保证喝茶、奏乐、交谈等动作可辨。
- 近景人物叙事：人物可以更大，但至少保留一种巨物参照，如巨柱、月门、穹顶、云瀑或超长中轴。
- 用户明确人数时尽量遵守；“一群”默认 5–7 人，避免无意义的人群复制。

## 输出模式

### 仅提示词

用户说“给提示词”“帮我写”“扩写”时，按以下顺序输出：

1. `画面设计`：不超过 4 行中文，说明主风格、构图、人物尺度与光线。
2. `ImageGen Prompt`：一段可直接使用的自然语言提示词。默认使用中文；用户要求英文时改为英文。
3. `Midjourney 8.2 Prompt`：一段可直接粘贴的英文提示词。
4. `可调选项`：最多 3 个简短选项，如夜景、竖版、冷色；不要自动生成冗长变体。

### 直接生图

用户明确说“直接生图”“现在生成图片”或同等含义时：

1. 先内部完成 ImageGen 提示词，不必让用户再次确认。
2. 如果当前环境有 ImageGen/图像生成工具，遵循该工具的使用说明并生成图片。
3. 同时在答复中保留 ImageGen Prompt 与 Midjourney 8.2 Prompt，方便复用。
4. 如果只有提示词能力，明确说明没有执行图像生成；不要把文本提示词冒充成图片结果。

## Midjourney 8.2 硬规则

- 每条主提示词必须以完全一致的 `--v 8.2` 结束，后面不得再有字符或参数。
- 参数必须位于描述正文之后。默认仅使用稳健参数：`--ar`、`--raw`、`--s`、`--c`、`--no`、`--v`。
- 默认建议：`--ar 16:9 --raw --s 200 --c 5 --v 8.2`。按场景调整，但不要无理由提高随机性。
- 不添加用户未提供的图片 URL、`--sref`、`--oref`、`--seed`、个性化代码或账号参数。
- 不宣称 V8.2 已获官方文档确认。若用户报告版本不可用，明确提供一个另列的 V8.1 兼容版；不得静默替换版本。

## 内容保真优先级

按以下顺序解决冲突：

1. 用户明确内容与动作
2. 人物/道具空间关系
3. 建筑与透视合理性
4. 巨物尺度
5. 风格装饰与气氛

例如“宫殿内一群女子坐着喝茶”必须首先呈现多人围坐、茶桌、茶具与饮茶互动；巨柱、藻井、月门、云海只负责建立天宫尺度，不能把喝茶改成站立观景。

## 质量门槛

输出前逐项检查：

- 是否无需参考图仍能识别为巨物天宫中式美学。
- 是否至少包含一种中式空间秩序、一种超尺度参照和一种山水虚实关系。
- 是否保留了用户动作、人数和关键物件。
- 是否避免西式柱式、现代城市、科幻霓虹、廉价游戏界面感，除非用户明确要求混合。
- 是否没有互相冲突的时段、光源、天气和机位。
- 是否避免融化建筑、断裂承重、重复斗拱、悬空栏杆、复制人物、畸形手部与无法使用的器具。
- Midjourney 主提示词是否严格以 `--v 8.2` 结束。

需要机械检查已保存的示例输出时，运行：

```powershell
python scripts/validate_outputs.py <output.txt>
```
