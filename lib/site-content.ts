export const managedPageSlugs = [
  "home",
  "about",
  "ai-side-business",
  "ai-tools",
  "talent-number",
  "growth",
  "cases",
  "contact"
] as const;

export type ManagedPageSlug = (typeof managedPageSlugs)[number];

export type ManagedContentItem = {
  id: string;
  title?: string;
  text: string;
  label?: string;
  value?: string;
  quote?: string;
  href?: string;
  image?: string;
  alt?: string;
};

export type ManagedContentSection = {
  key: string;
  label: string;
  eyebrow?: string;
  title: string;
  description?: string;
  items: ManagedContentItem[];
};

export type ManagedPageContent = {
  slug: ManagedPageSlug;
  label: string;
  path: string;
  seoTitle: string;
  seoDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    accent?: string;
    tagline?: string;
    description: string;
  };
  sections: ManagedContentSection[];
  cta?: {
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
};

export const managedPageDefaults: Record<ManagedPageSlug, ManagedPageContent> = {
  home: {
    slug: "home",
    label: "首页",
    path: "/",
    seoTitle: "首页",
    seoDescription: "你好，我是萧小遥。帮普通人借助 AI 提升效率、增加收入，找到适合自己的成长路径。",
    hero: {
      eyebrow: "AI 副业探索者、天赋数字咨询师、普通人成长陪跑者",
      title: "你好，我是",
      accent: "萧小遥",
      tagline: "帮普通人借助 AI 提升效率、增加收入，找到适合自己的成长路径。",
      description: "这里分享 AI 工具实战、副业项目与天赋数字，也提供一套能长期使用的成长工作台，把计划、行动、收益和复盘放进同一个系统。"
    },
    sections: [
      {
        key: "pain-points",
        label: "常见困惑",
        eyebrow: "Common Questions",
        title: "很多人都在这里卡住了",
        description: "你不是一个人。副业、工具和成长的问题，往往不是缺少努力，而是缺少清晰路径。",
        items: [
          { id: "pain-1", title: "副业尝试很多，却没有稳定结果", text: "学了很多方法，试了很多项目，但总在忙碌和放弃之间循环。", image: "/assets/cards/pain-side-project.jpg", alt: "创作者面对多个尚未完成的副业项目" },
          { id: "pain-2", title: "会用 AI，却不知道怎样落地", text: "工具越来越多，但没有形成真正节省时间、产生作品的工作流。", image: "/assets/cards/pain-ai-workflow.jpg", alt: "创作者把 AI 工具连接成实际工作流" },
          { id: "pain-3", title: "方向太多，行动反而变少", text: "想成长、想转型，也想增加收入，却不知道此刻最该先做什么。", image: "/assets/cards/pain-focus.jpg", alt: "创作者在许多路径中选择清晰方向" },
          { id: "pain-4", title: "想寻找自己的第二曲线", text: "希望在主业之外积累新能力和收入，又担心选错方向、投入太重。", image: "/assets/cards/pain-second-curve.jpg", alt: "职场人走向自己的第二成长曲线" }
        ]
      },
      {
        key: "services",
        label: "服务方向",
        eyebrow: "What I Do",
        title: "从工具到行动，找到适合你的那条路",
        description: "围绕 AI 实战、副业验证、天赋数字和个人成长，提供可以真正落地的内容与服务。",
        items: [
          { id: "service-1", title: "AI 工具实战", text: "从提示词到工作流，把 AI 变成日常真正可用的能力。", href: "/ai-tools", image: "/assets/cards/service-ai-tools.jpg", alt: "创作者使用 AI 完成日常工作流" },
          { id: "service-2", title: "AI 副业项目", text: "按成本、难度和变现方式拆解适合普通人验证的项目。", href: "/ai-side-business", image: "/assets/cards/service-side-business.jpg", alt: "创作者经营轻量 AI 副业项目" },
          { id: "service-3", title: "天赋数字咨询", text: "整理优势模式、行动节奏和更适合长期投入的方向。", href: "/talent-number", image: "/assets/cards/service-talent.jpg", alt: "咨询师与来访者梳理个人优势路径" },
          { id: "service-4", title: "个人成长系统", text: "用任务、习惯、项目、收益与复盘形成自己的行动闭环。", href: "/workspace", image: "/assets/cards/service-growth.jpg", alt: "用任务日历和复盘构建个人成长系统" }
        ]
      },
      {
        key: "tools",
        label: "AI 工具箱",
        eyebrow: "AI Toolbox",
        title: "把工具用进真实场景",
        description: "从写作、图像、编程到视频，选择当前任务真正需要的那一个。",
        items: []
      },
      {
        key: "workspace",
        label: "成长工作台介绍",
        eyebrow: "Growth Workspace",
        title: "把成长变成看得见的日常",
        description: "任务四象限、日历视图、项目推进、副业收益、成长记录与 AI 助手统一保存在 MySQL。",
        items: [
          { id: "workspace-1", text: "任务四象限与子任务", image: "/assets/cards/tool-membership-cards.jpg", alt: "用数字卡片梳理任务优先级" },
          { id: "workspace-2", text: "日历视图与每日任务", image: "/assets/cards/service-growth.jpg", alt: "用日历规划每日任务和成长行动" },
          { id: "workspace-3", text: "项目阶段、进度与风险", image: "/assets/cards/pain-side-project.jpg", alt: "整理项目进度、数据与风险" },
          { id: "workspace-4", text: "收益、习惯与成长复盘", image: "/assets/cards/pain-second-curve.jpg", alt: "从工作走向长期成长与第二曲线" }
        ]
      },
      {
        key: "latest",
        label: "最新内容",
        eyebrow: "Latest Notes",
        title: "最近在写什么",
        description: "记录 AI 工具、副业实验、天赋数字和普通人的成长复盘。",
        items: []
      }
    ],
    cta: { title: "想找到更适合自己的 AI 副业和成长路径吗？", description: "你可以先从一个真实问题开始：工具不会用、方向不清楚，或者只是想做一次阶段复盘。", primaryLabel: "联系萧小遥", primaryHref: "/contact", secondaryLabel: "了解我的故事", secondaryHref: "/about" }
  },
  about: {
    slug: "about",
    label: "个人简介",
    path: "/about",
    seoTitle: "个人简介",
    seoDescription: "了解萧小遥：AI 副业探索者、天赋数字咨询师、普通人成长陪跑者。",
    hero: {
      eyebrow: "About Xiaoxiao Yao",
      title: "我不是来催你跑更快，",
      accent: "我想陪你走得更清楚。",
      description: "这里是萧小遥的个人介绍，也是萧遥AI副业基地的底色：用 AI 提升效率，用天赋数字理解自己，用复盘陪伴长期成长。"
    },
    sections: [
      {
        key: "story",
        label: "个人故事",
        eyebrow: "Story",
        title: "关于萧小遥",
        description: "我的内容会围绕 AI 工具实战、AI 副业项目、天赋数字咨询和个人成长复盘展开。",
        items: [
          { id: "story-1", text: "你好，我是萧小遥，AI 副业探索者、天赋数字咨询师、普通人成长陪跑者。" },
          { id: "story-2", text: "我关注普通人如何借助 AI 提升效率、增加收入，也关心一个人在尝试副业和自我成长时，怎样找到更适合自己的节奏。" },
          { id: "story-3", text: "萧遥AI副业基地会持续分享 AI 工具实战、AI 副业项目、天赋数字咨询和个人成长复盘。这里不制造焦虑，更希望陪你把想法拆小，把行动落稳。" }
        ]
      },
      {
        key: "offerings",
        label: "服务方向",
        eyebrow: "What I Do",
        title: "我现在主要在做的四件事",
        description: "这些方向会持续沉淀成内容、服务、案例和工具。",
        items: [
          { id: "offering-1", title: "公众号智能体", text: "围绕选题、写作、排版和运营，搭建更省力的公众号内容工作流。", image: "/assets/cards/tool-wechat-agent.jpg", alt: "公众号智能体内容工作流" },
          { id: "offering-2", title: "AI 工具代充值", text: "协助处理常用 AI 工具订阅与充值，让工具使用少一点折腾。", image: "/assets/cards/tool-ai-recharge.jpg", alt: "AI 工具订阅与充值服务" },
          { id: "offering-3", title: "AI 副业项目", text: "拆解普通人可验证的小项目，从内容、服务到自动化逐步落地。", image: "/assets/cards/service-side-business.jpg", alt: "普通人 AI 副业项目探索" },
          { id: "offering-4", title: "天赋数字咨询", text: "用天赋数字看见性格底色、行动节奏和更适合长期投入的方向。", image: "/assets/cards/service-talent.jpg", alt: "天赋数字咨询与个人路径梳理" }
        ]
      },
      {
        key: "principles",
        label: "个人原则",
        eyebrow: "Principles",
        title: "我在意的三件事",
        description: "这些原则会决定我后续内容、咨询服务和案例复盘的方向。",
        items: [
          { id: "principle-1", title: "先会用，再谈变现", text: "AI 不是神秘捷径。先把工具用在真实场景里，能节省时间、提升效率，才有机会长出副业项目。" },
          { id: "principle-2", title: "先适合，再追速度", text: "结合天赋数字和现实资源，看见自己的优势、卡点和更适合长期投入的方向。" },
          { id: "principle-3", title: "先复盘，再迭代", text: "成长不是喊口号，而是一次次记录、调整和继续行动，让普通人的小进步真的积累起来。" }
        ]
      }
    ],
    cta: { title: "每个人都有自己的出发方式。", description: "如果你正在探索 AI 工具、副业方向、天赋数字或成长复盘，可以先从一个真实问题开始聊起。", primaryLabel: "预约一次对话", primaryHref: "/contact", secondaryLabel: "读成长笔记", secondaryHref: "/growth" }
  },
  "ai-side-business": {
    slug: "ai-side-business",
    label: "副业项目",
    path: "/ai-side-business",
    seoTitle: "AI 副业项目",
    seoDescription: "萧小遥拆解适合普通人逐步验证的 AI 副业项目。",
    hero: { eyebrow: "AI Side Business", title: "用 AI 做副业，先从", accent: "一个小作品开始。", description: "AI 副业不是神秘捷径，它更像一套新的生产工具。这里会展示适合普通人逐步验证的项目方向。" },
    sections: [
      { key: "projects", label: "项目列表", eyebrow: "Projects", title: "AI 副业项目，不看热闹，看能不能跑通。", description: "从适合人群、启动成本、操作难度、变现方式和实战建议几个角度拆解项目。", items: [] },
      { key: "roadmap", label: "起步路径", eyebrow: "Roadmap", title: "一条更稳的起步路径", description: "如果一开始就想做大，反而容易被复杂度拖住。用一轮清晰验证替代空想。", items: [
        { id: "roadmap-1", text: "明确你能稳定投入的时间和可迁移能力" },
        { id: "roadmap-2", text: "选一个低成本场景，不直接追逐热门风口" },
        { id: "roadmap-3", text: "做出最小可展示作品，并获取真实反馈" },
        { id: "roadmap-4", text: "把有效动作沉淀成模板、案例和服务说明" }
      ] }
    ],
    cta: { title: "不确定从哪个 AI 副业方向开始？", description: "带着你的时间预算、已有技能和想尝试的方向来，我们先帮你拆出一个可以验证的第一步。", primaryLabel: "预约副业定位", primaryHref: "/contact", secondaryLabel: "查看案例反馈", secondaryHref: "/cases" }
  },
  "ai-tools": {
    slug: "ai-tools",
    label: "AI 工具栏",
    path: "/ai-tools",
    seoTitle: "AI 工具栏",
    seoDescription: "萧小遥实测整理的 AI 写作、图像、效率与音视频工具。",
    hero: {
      eyebrow: "AI Tools",
      title: "不是收藏更多工具，",
      accent: "而是把一个流程真正跑通。",
      description: "这里收录我实际关注和使用的 AI 工具，按场景整理用途、特点与入口。先选当前任务真正需要的那一个，再把它放进你的真实工作流。"
    },
    sections: [
      {
        key: "tools",
        label: "工具列表",
        eyebrow: "AI Toolbox",
        title: "把工具用进真实场景",
        description: "从写作、图像、效率到音视频，不追求收藏更多，只选择当前任务真正需要的工具。",
        items: []
      }
    ],
    cta: { title: "工具不缺，缺的是一个能跑通的场景。", description: "如果你不知道该从哪个 AI 工具开始，或者想把工具组合成自己的工作流，可以先带着一个真实任务来聊。", primaryLabel: "联系萧小遥", primaryHref: "/contact", secondaryLabel: "看副业项目", secondaryHref: "/ai-side-business" }
  },
  "talent-number": {
    slug: "talent-number",
    label: "天赋数字",
    path: "/talent-number",
    seoTitle: "天赋数字｜读懂你的生命地图",
    seoDescription: "了解天赋数字的由来，把数字作为自我观察的生命地图，探索性格特质、天赋潜力、行动节奏与成长方向。",
    hero: { eyebrow: "Talent Number · Life Map", title: "读懂你的生命地图，", accent: "成为自己的导航者。", description: "天赋数字是一种源自西方数字哲学传统的自我探索工具。它不替你预测命运，而是提供一组观察自己的线索：看见天赋潜力、理解性格模式，再把觉察变成选择和行动。" },
    sections: [
      { key: "origin", label: "天赋数字的由来", eyebrow: "Origin", title: "从数字哲学，到一门认识自己的语言", description: "天赋数字常被追溯到古希腊毕达哥拉斯学派关于数字、秩序与生命的哲学传统。今天，它更多被用作一套象征性的自我观察工具。", items: [
        { id: "origin-1", title: "古希腊数字哲学", text: "约在 2500 年前，毕达哥拉斯学派开始思考数字与世界秩序之间的关系，数字不只用于计算，也被赋予哲学意义。" },
        { id: "origin-2", title: "从数字学到天赋数字", text: "后来的数字学沿着这条传统发展，尝试用出生日期等数字线索，描述一个人的性格倾向、优势潜力与成长课题。" },
        { id: "origin-3", title: "成为自我观察的镜子", text: "我们今天了解天赋数字，不是为了未卜先知或听天由命，而是多一个角度认识自己、发挥优势并改善惯性模式。" }
      ] },
      { key: "life-map", label: "生命地图", eyebrow: "Life Map", title: "它像一幅地图，也像一台导航仪", description: "地图呈现可能的地形，导航仪提供方向和节奏；真正决定走向哪里、怎样抵达的人，始终是你自己。", items: [
        { id: "map-1", title: "看见自己是谁", text: "认识与生俱来的性格底色、能量来源与天赋潜力。" },
        { id: "map-2", title: "理解自己的节奏", text: "观察关系模式、行动方式，以及不同人生阶段可能面对的课题。" },
        { id: "map-3", title: "选择想成为的自己", text: "把对自己的理解带回现实，在工作、关系和成长中作出更适合的选择。" }
      ] },
      { key: "dimensions", label: "解读维度", eyebrow: "Dimensions", title: "一张生命地图，会标记哪些线索", description: "解读不止停在“你是什么样的人”，还会把特质翻译成能够观察、练习和行动的方向。", items: [
        { id: "dimension-1", title: "性格底色", text: "看见你天然更容易投入的表达方式、关系模式和能量来源。" },
        { id: "dimension-2", title: "行动节奏", text: "整理你适合快试快改，还是更适合深度准备后稳定推进。" },
        { id: "dimension-3", title: "成长课题", text: "识别容易反复卡住的模式，给后续复盘和练习一个观察入口。" },
        { id: "dimension-4", title: "副业适配", text: "结合 AI 工具和现实资源，寻找更适合长期建设的项目方向。" }
      ] },
      { key: "navigation", label: "如何看待天赋数字", eyebrow: "The Compass", title: "导航仪不是生命，你才是人生真正的主人", description: "天赋数字提供参考，但不会替你作决定。它的价值不在于给人生下结论，而在于帮助你带着觉察继续前进。", items: [
        { id: "navigation-1", title: "看见，而不是定论", text: "数字呈现的是倾向与观察线索，不是把一个人固定在标签里。" },
        { id: "navigation-2", title: "参考，而不是服从", text: "别人的经验和数字解读都可以参考，但你的现实感受与亲身验证更重要。" },
        { id: "navigation-3", title: "选择，始终属于你", text: "方向、速度和目的地都由你决定；工具服务于生命，而不是生命服从于工具。" }
      ] },
      { key: "faq", label: "常见问题", eyebrow: "FAQ", title: "开始之前，你可能想知道", description: "把它放在合适的位置，才能真正发挥这件工具的价值。", items: [
        { id: "faq-1", title: "天赋数字是在预测命运吗？", text: "不是。它更像一套自我观察语言，帮助你整理性格倾向、优势潜力和反复出现的行为模式，不用于预测具体事件。" },
        { id: "faq-2", title: "谁适合做咨询？", text: "适合职业迷茫、副业选择困难、情绪内耗严重，或者想更了解自己优势的人。" },
        { id: "faq-3", title: "咨询后能得到什么？", text: "你会得到一份关于自身优势、行动卡点、成长方向和副业匹配建议的梳理，以及可以继续验证的小行动。" }
      ] },
      { key: "consultation", label: "天赋数字地图生成器", eyebrow: "Talent Map Generator", title: "生成你的天赋数字地图", description: "选择阳历出生日期，自动完成房屋内外数字计算并绘制个人天赋数字地图。当前为第一版，后续将根据测试结果继续校准。", items: [
        { id: "flow-1", text: "选择你的出生日期" },
        { id: "flow-2", text: "自动计算天赋数字" },
        { id: "flow-3", text: "生成个人数字地图" }
      ] }
    ],
    cta: { title: "地图已经展开，下一步仍由你来走。", description: "如果你想更清楚地看见自己的优势、卡点与行动节奏，可以预约一次天赋数字咨询。", primaryLabel: "预约天赋数字", primaryHref: "/contact", secondaryLabel: "了解萧小遥", secondaryHref: "/about" }
  },
  growth: {
    slug: "growth",
    label: "个人成长",
    path: "/growth",
    seoTitle: "个人成长",
    seoDescription: "萧小遥的 AI 副业、天赋数字、工具实战和个人成长复盘文章。",
    hero: { eyebrow: "Growth Notes", title: "把做过的事写下来，", accent: "成长才有迹可循。", description: "AI 工具笔记、副业实战复盘、天赋数字分享，以及一个普通人如何慢慢建立自己的行动系统。" },
    sections: [
      { key: "articles", label: "文章列表", eyebrow: "Latest Notes", title: "最新文章", description: "持续补充、整理和发布真实的实战记录与成长复盘。", items: [] }
    ]
  },
  cases: {
    slug: "cases",
    label: "案例反馈",
    path: "/cases",
    seoTitle: "案例反馈",
    seoDescription: "查看 AI 工具实战、天赋数字咨询和个人成长复盘带来的变化。",
    hero: { eyebrow: "Cases", title: "案例不是神话，", accent: "是一次次真实的小推进。", description: "这里展示来自 AI 副业、天赋数字咨询和个人成长复盘方向的阶段性反馈。每一次变化，都从一个真实问题开始。" },
    sections: [
      { key: "feedback", label: "案例列表", eyebrow: "Feedback", title: "案例反馈", description: "反馈内容用于呈现服务价值和用户变化，并持续沉淀真实授权案例。", items: [] },
      { key: "metrics", label: "案例指标", eyebrow: "", title: "", description: "", items: [
        { id: "metric-1", label: "适合阶段", value: "0 到 1", text: "" },
        { id: "metric-2", label: "咨询重点", value: "定位与落地", text: "" },
        { id: "metric-3", label: "交付方式", value: "复盘和行动清单", text: "" }
      ] }
    ],
    cta: { title: "下一个案例，也可以从一个小问题开始。", description: "如果你也想完成一次从想法到作品、从迷茫到行动的推进，可以先预约一次咨询。", primaryLabel: "预约咨询", primaryHref: "/contact", secondaryLabel: "看副业项目", secondaryHref: "/ai-side-business" }
  },
  contact: {
    slug: "contact",
    label: "联系我",
    path: "/contact",
    seoTitle: "联系我",
    seoDescription: "联系萧小遥，预约天赋数字咨询、AI 副业方向梳理或个人成长复盘。",
    hero: { eyebrow: "Contact", title: "带着一个真实问题来，", accent: "我们一起把它拆清楚。", description: "如果你想聊 AI 副业、天赋数字、个人成长复盘或合作邀约，可以通过下面的方式联系萧小遥。" },
    sections: [
      { key: "ways", label: "联系与预约", eyebrow: "Ways", title: "联系与预约", description: "你可以通过微信或邮件联系我，预约天赋数字咨询、AI 副业方向梳理或个人成长复盘。", items: [
        { id: "way-1", title: "微信咨询", text: "适合预约天赋数字咨询、AI 副业方向梳理和成长复盘。", value: "" },
        { id: "way-2", title: "邮件联系", text: "适合合作邀约、案例投稿和较完整的咨询背景说明。", value: "" },
        { id: "way-3", title: "咨询前准备", text: "不用准备完美答案，只需要说清当下最想改变的地方。", value: "带着一个真实问题来" }
      ] },
      { key: "preparation", label: "预约准备", eyebrow: "Before Booking", title: "预约前可以想一想", description: "把问题说清楚，咨询就会更有效。你不需要准备完美材料，只要尽量真实。", items: [
        { id: "prepare-1", text: "你现在最想解决的一个问题是什么" },
        { id: "prepare-2", text: "你已经尝试过哪些方法" },
        { id: "prepare-3", text: "你期待这次咨询结束后得到什么结果" }
      ] },
      { key: "wechat", label: "微信二维码", eyebrow: "Wechat", title: "微信二维码", description: "添加我的微信，告诉我你的现状：你正在做什么、想改变什么、卡在哪里。", items: [] }
    ],
    cta: { title: "我们先从一次清晰的对话开始。", description: "添加微信或发送邮件时，可以简单说明你的现状、想解决的问题，以及你期待获得的帮助。", primaryLabel: "邮件预约", primaryHref: "mailto:363811256@qq.com", secondaryLabel: "返回了解我", secondaryHref: "/about" }
  }
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeItem(value: unknown, fallback: ManagedContentItem, index: number): ManagedContentItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const item = value as Record<string, unknown>;
  return {
    id: stringValue(item.id, fallback.id || `item-${index + 1}`),
    title: item.title === undefined ? fallback.title : stringValue(item.title),
    text: stringValue(item.text, fallback.text),
    label: item.label === undefined ? fallback.label : stringValue(item.label),
    value: item.value === undefined ? fallback.value : stringValue(item.value),
    quote: item.quote === undefined ? fallback.quote : stringValue(item.quote),
    href: item.href === undefined ? fallback.href : stringValue(item.href),
    image: item.image === undefined ? fallback.image : stringValue(item.image),
    alt: item.alt === undefined ? fallback.alt : stringValue(item.alt)
  };
}

export function normalizeManagedPageContent(slug: ManagedPageSlug, value: unknown): ManagedPageContent {
  const fallback = managedPageDefaults[slug];
  if (!value || typeof value !== "object" || Array.isArray(value)) return structuredClone(fallback);
  const input = value as Record<string, unknown>;
  const hero = input.hero && typeof input.hero === "object" && !Array.isArray(input.hero)
    ? input.hero as Record<string, unknown>
    : {};
  const inputSections = Array.isArray(input.sections) ? input.sections : [];
  const sections = fallback.sections.map((section) => {
    const match = inputSections.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate) && (candidate as Record<string, unknown>).key === section.key) as Record<string, unknown> | undefined;
    const items = Array.isArray(match?.items)
      ? match.items.map((item, index) => normalizeItem(item, section.items[index] || { id: `${section.key}-${index + 1}`, text: "" }, index))
      : section.items.map((item) => ({ ...item }));
    return {
      ...section,
      eyebrow: match?.eyebrow === undefined ? section.eyebrow : stringValue(match.eyebrow),
      title: stringValue(match?.title, section.title),
      description: match?.description === undefined ? section.description : stringValue(match.description),
      items
    };
  });
  const ctaInput = input.cta && typeof input.cta === "object" && !Array.isArray(input.cta)
    ? input.cta as Record<string, unknown>
    : null;
  return {
    ...fallback,
    seoTitle: stringValue(input.seoTitle, fallback.seoTitle),
    seoDescription: stringValue(input.seoDescription, fallback.seoDescription),
    hero: {
      eyebrow: stringValue(hero.eyebrow, fallback.hero.eyebrow),
      title: stringValue(hero.title, fallback.hero.title),
      accent: hero.accent === undefined ? fallback.hero.accent : stringValue(hero.accent),
      tagline: hero.tagline === undefined ? fallback.hero.tagline : stringValue(hero.tagline),
      description: stringValue(hero.description, fallback.hero.description)
    },
    sections,
    cta: fallback.cta ? {
      title: stringValue(ctaInput?.title, fallback.cta.title),
      description: stringValue(ctaInput?.description, fallback.cta.description),
      primaryLabel: stringValue(ctaInput?.primaryLabel, fallback.cta.primaryLabel),
      primaryHref: stringValue(ctaInput?.primaryHref, fallback.cta.primaryHref),
      secondaryLabel: ctaInput?.secondaryLabel === undefined ? fallback.cta.secondaryLabel : stringValue(ctaInput.secondaryLabel),
      secondaryHref: ctaInput?.secondaryHref === undefined ? fallback.cta.secondaryHref : stringValue(ctaInput.secondaryHref)
    } : undefined
  };
}

export function managedSection(page: ManagedPageContent, key: string) {
  return page.sections.find((section) => section.key === key) || { key, label: key, title: "", description: "", items: [] };
}
