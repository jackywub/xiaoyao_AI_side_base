require("dotenv/config");

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for seeding.");

const url = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  allowPublicKeyRetrieval: true,
  connectionLimit: 2
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash,
      displayName: "萧小遥",
      email: "hello@xiaoyao-ai.com",
      bio: "AI 副业探索者、天赋数字咨询师、普通人成长陪跑者，创办萧遥AI副业基地。"
    },
    create: {
      username: adminUsername,
      passwordHash,
      displayName: "萧小遥",
      email: "hello@xiaoyao-ai.com",
      bio: "AI 副业探索者、天赋数字咨询师、普通人成长陪跑者，创办萧遥AI副业基地。",
      role: "ADMIN"
    }
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "ai-tools-practice" },
      update: {
        name: "AI 工具实战",
        description: "把 AI 工具用在真实工作、内容和副业场景里的方法。",
        sortOrder: 1
      },
      create: {
        name: "AI 工具实战",
        slug: "ai-tools-practice",
        description: "把 AI 工具用在真实工作、内容和副业场景里的方法。",
        sortOrder: 1
      }
    }),
    prisma.category.upsert({
      where: { slug: "ai-side-business" },
      update: {
        name: "AI 副业项目",
        description: "普通人可上手、可验证、可积累的 AI 副业项目。",
        sortOrder: 2
      },
      create: {
        name: "AI 副业项目",
        slug: "ai-side-business",
        description: "普通人可上手、可验证、可积累的 AI 副业项目。",
        sortOrder: 2
      }
    }),
    prisma.category.upsert({
      where: { slug: "talent-number" },
      update: {
        name: "天赋数字咨询",
        description: "围绕天赋数字、自我理解、行动节奏和副业适配的内容。",
        sortOrder: 3
      },
      create: {
        name: "天赋数字咨询",
        slug: "talent-number",
        description: "围绕天赋数字、自我理解、行动节奏和副业适配的内容。",
        sortOrder: 3
      }
    }),
    prisma.category.upsert({
      where: { slug: "personal-growth" },
      update: {
        name: "个人成长复盘",
        description: "记录普通人成长、副业探索和长期行动里的阶段复盘。",
        sortOrder: 4
      },
      create: {
        name: "个人成长复盘",
        slug: "personal-growth",
        description: "记录普通人成长、副业探索和长期行动里的阶段复盘。",
        sortOrder: 4
      }
    })
  ]);

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: "ai-tools" },
      update: { name: "AI 工具实战" },
      create: { name: "AI 工具实战", slug: "ai-tools" }
    }),
    prisma.tag.upsert({
      where: { slug: "side-business" },
      update: { name: "AI 副业项目" },
      create: { name: "AI 副业项目", slug: "side-business" }
    }),
    prisma.tag.upsert({
      where: { slug: "review" },
      update: { name: "个人成长复盘" },
      create: { name: "个人成长复盘", slug: "review" }
    }),
    prisma.tag.upsert({
      where: { slug: "talent-number" },
      update: { name: "天赋数字咨询" },
      create: { name: "天赋数字咨询", slug: "talent-number" }
    })
  ]);

  const articleSeeds = [
    {
      title: "AI 工具实战：先把效率提升落到日常流程",
      slug: "ai-tools-practice-for-daily-workflow",
      excerpt: "普通人学习 AI，不必一开始追复杂系统，先把一个真实流程跑顺。",
      content:
        "你好，我是萧小遥。我更建议普通人从一个真实场景开始使用 AI：整理资料、生成初稿、拆解任务、复盘输出。工具先帮你节省时间，副业才有机会慢慢长出来。",
      category: categories[0],
      tagSlugs: ["ai-tools", "review"]
    },
    {
      title: "AI 副业项目：普通人先跑通一个小作品",
      slug: "start-ai-side-business-with-small-project",
      excerpt: "不从宏大的商业计划开始，而是先完成一个可以被验证的小作品。",
      content:
        "AI 副业的起点不是追逐所有热点，而是找到一个足够小、足够真实、足够容易获得反馈的场景。先做出一个页面、一个模板、一次服务说明，再用反馈调整方向。",
      category: categories[1],
      tagSlugs: ["ai-tools", "side-business"]
    },
    {
      title: "天赋数字咨询：不是标签，而是一张行动地图",
      slug: "talent-number-as-action-map",
      excerpt: "用数字线索整理优势、卡点和适合自己的行动节奏。",
      content:
        "天赋数字更适合作为自我观察和复盘工具。它帮助你看见自己的优势、容易卡住的模式，以及更适合长期投入的副业和成长路径。",
      category: categories[2],
      tagSlugs: ["talent-number", "review"]
    },
    {
      title: "个人成长复盘：把复盘写得小一点",
      slug: "make-review-small-enough",
      excerpt: "每天只回答三个问题，让成长变成可持续的日常动作。",
      content:
        "复盘不需要写成长篇报告。真正有效的复盘，是能帮你保留有效动作、减少无谓消耗，让每一次小尝试都成为下一步的线索。",
      category: categories[3],
      tagSlugs: ["review"]
    }
  ];

  for (const seed of articleSeeds) {
    const article = await prisma.article.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        excerpt: seed.excerpt,
        content: seed.content,
        authorId: admin.id,
        categoryId: seed.category.id,
        isFeatured: true,
        status: "PUBLISHED",
        publishedAt: new Date()
      },
      create: {
        title: seed.title,
        slug: seed.slug,
        excerpt: seed.excerpt,
        content: seed.content,
        status: "PUBLISHED",
        isFeatured: true,
        publishedAt: new Date(),
        authorId: admin.id,
        categoryId: seed.category.id
      }
    });

    for (const tagSlug of seed.tagSlugs) {
      const tag = tags.find((item) => item.slug === tagSlug);
      if (!tag) continue;

      await prisma.articleTag.upsert({
        where: {
          articleId_tagId: {
            articleId: article.id,
            tagId: tag.id
          }
        },
        update: {},
        create: {
          articleId: article.id,
          tagId: tag.id
        }
      });
    }
  }

  await Promise.all([
    prisma.project.upsert({
      where: { slug: "ai-daily-briefing" },
      update: {
        title: "AI 工具变现",
        type: "SERVICE",
        description: "提供公众号爆文智能体、小红书贴图智能体、AI 工具六合一账号以及ChatGPT、Gemini、claude 等主流 AI 工具代充值等业务。",
        detail:
          "适合想通过做公众号流量主，但是不知道写什么，不会找选题，不会写内容的人群，通过公众号爆文智能体、小红书贴图智能体可以一键生成爆款标题、文章，直接发布公众号。\n适合平时需要用到 ChatGPT、Gemini、claude 等主流 AI 工具的人群，提供稳定的镜像账号或者代充值服务。",
        targetAudience: "想做公众号流量主的人，想使用主流 Ai 工具的人群",
        costLevel: "低成本",
        difficulty: "新手友好",
        monetization: "效率提升、内容输出、服务交付前的基础能力",
        coverImage: "/assets/cards/project-ai-tool-monetization.png",
        meta: { tags: ["AI 工具实战", "效率提升", "新手友好"] },
        status: "PUBLISHED",
        isFeatured: true,
        sortOrder: 1,
        publishedAt: new Date()
      },
      create: {
        title: "AI 工具变现",
        slug: "ai-daily-briefing",
        type: "SERVICE",
        description: "提供公众号爆文智能体、小红书贴图智能体、AI 工具六合一账号以及ChatGPT、Gemini、claude 等主流 AI 工具代充值等业务。",
        detail:
          "适合想通过做公众号流量主，但是不知道写什么，不会找选题，不会写内容的人群，通过公众号爆文智能体、小红书贴图智能体可以一键生成爆款标题、文章，直接发布公众号。\n适合平时需要用到 ChatGPT、Gemini、claude 等主流 AI 工具的人群，提供稳定的镜像账号或者代充值服务。",
        targetAudience: "想做公众号流量主的人，想使用主流 Ai 工具的人群",
        costLevel: "低成本",
        difficulty: "新手友好",
        monetization: "效率提升、内容输出、服务交付前的基础能力",
        coverImage: "/assets/cards/project-ai-tool-monetization.png",
        meta: { tags: ["AI 工具实战", "效率提升", "新手友好"] },
        status: "PUBLISHED",
        isFeatured: true,
        sortOrder: 1,
        publishedAt: new Date()
      }
    }),
    prisma.project.upsert({
      where: { slug: "ai-visual-assets-service" },
      update: {
        title: "闲鱼虚拟资料+网盘拉新",
        type: "SERVICE",
        description: "在闲鱼平台发布售卖虚拟资料的商品链接，获得商品的利润以及网盘拉新的推广费用",
        detail: "一部分是通过在闲鱼平台发布商品进行售卖，做电商。另一部分是通过发送网盘链接，对方转存资料获得拉新和转存的收益。",
        targetAudience: "新手小白，想通过互联网赚到第一桶金的人",
        costLevel: "低成本",
        difficulty: "适合新手",
        monetization: "闲鱼电商、网盘拉新收益",
        coverImage: "/assets/cards/project-xianyu-digital-assets.png",
        meta: { tags: ["AI 副业项目、闲鱼电商"] },
        status: "PUBLISHED",
        isFeatured: true,
        sortOrder: 2,
        publishedAt: new Date()
      },
      create: {
        title: "闲鱼虚拟资料+网盘拉新",
        slug: "ai-visual-assets-service",
        type: "SERVICE",
        description: "在闲鱼平台发布售卖虚拟资料的商品链接，获得商品的利润以及网盘拉新的推广费用",
        detail: "一部分是通过在闲鱼平台发布商品进行售卖，做电商。另一部分是通过发送网盘链接，对方转存资料获得拉新和转存的收益。",
        targetAudience: "新手小白，想通过互联网赚到第一桶金的人",
        costLevel: "低成本",
        difficulty: "适合新手",
        monetization: "闲鱼电商、网盘拉新收益",
        coverImage: "/assets/cards/project-xianyu-digital-assets.png",
        meta: { tags: ["AI 副业项目、闲鱼电商"] },
        status: "PUBLISHED",
        isFeatured: true,
        sortOrder: 2,
        publishedAt: new Date()
      }
    }),
    prisma.project.upsert({
      where: { slug: "wechat-traffic-monetization" },
      update: {
        title: "公众号流量主",
        type: "CONTENT",
        description: "公众号流量主项目介绍",
        detail: null,
        targetAudience: null,
        costLevel: null,
        difficulty: null,
        monetization: null,
        coverImage: "/assets/cards/project-wechat-traffic-owner.png",
        meta: { tools: [], metrics: [], sourceCategory: "ai-writing" },
        status: "PUBLISHED",
        isFeatured: false,
        sortOrder: 0,
        publishedAt: new Date()
      },
      create: {
        title: "公众号流量主",
        slug: "wechat-traffic-monetization",
        type: "CONTENT",
        description: "公众号流量主项目介绍",
        detail: null,
        targetAudience: null,
        costLevel: null,
        difficulty: null,
        monetization: null,
        coverImage: "/assets/cards/project-wechat-traffic-owner.png",
        meta: { tools: [], metrics: [], sourceCategory: "ai-writing" },
        status: "PUBLISHED",
        isFeatured: false,
        sortOrder: 0,
        publishedAt: new Date()
      }
    }),
    prisma.project.upsert({
      where: { slug: "ai-workflow-automation" },
      update: {
        title: "AI 副业方向陪跑",
        type: "CONSULTING",
        description: "结合 AI 工具、个人资源和天赋数字，拆出一个更适合自己的副业验证路径。",
        detail: "适合已经想开始 AI 副业，但卡在方向、定位、行动节奏和自我怀疑里的人。",
        targetAudience: "想做 AI 副业、需要方向梳理和行动拆解的人",
        costLevel: "中等",
        difficulty: "需要持续复盘",
        monetization: "咨询服务、内容产品、模板工具和长期陪跑",
        coverImage: "/assets/cards/project-ai-side-business-coaching.png",
        meta: { tags: ["方向梳理", "天赋数字", "成长陪跑"] },
        status: "PUBLISHED",
        sortOrder: 3,
        publishedAt: new Date()
      },
      create: {
        title: "AI 副业方向陪跑",
        slug: "ai-workflow-automation",
        type: "CONSULTING",
        description: "结合 AI 工具、个人资源和天赋数字，拆出一个更适合自己的副业验证路径。",
        detail: "适合已经想开始 AI 副业，但卡在方向、定位、行动节奏和自我怀疑里的人。",
        targetAudience: "想做 AI 副业、需要方向梳理和行动拆解的人",
        costLevel: "中等",
        difficulty: "需要持续复盘",
        monetization: "咨询服务、内容产品、模板工具和长期陪跑",
        coverImage: "/assets/cards/project-ai-side-business-coaching.png",
        meta: { tags: ["方向梳理", "天赋数字", "成长陪跑"] },
        status: "PUBLISHED",
        sortOrder: 3,
        publishedAt: new Date()
      }
    })
  ]);

  await Promise.all([
    prisma.talentService.upsert({
      where: { slug: "talent-number-basic" },
      update: {
        title: "天赋数字咨询",
        subtitle: "看见优势、卡点和行动节奏",
        description: "适合第一次了解天赋数字，希望整理自己当前状态和行动方向的人。",
        content: "一次围绕天赋数字、性格底色、行动卡点和近期选择的温和咨询。",
        price: "199.00",
        durationMinutes: 60,
        suitableFor: "职业迷茫、副业选择困难、想更了解自己优势的人。",
        deliverables: ["天赋数字解读", "优势与卡点梳理", "7 天行动建议"],
        process: ["收集基础信息", "完成数字解读", "给出行动建议"],
        isFeatured: true,
        sortOrder: 1
      },
      create: {
        title: "天赋数字咨询",
        slug: "talent-number-basic",
        subtitle: "看见优势、卡点和行动节奏",
        description: "适合第一次了解天赋数字，希望整理自己当前状态和行动方向的人。",
        content: "一次围绕天赋数字、性格底色、行动卡点和近期选择的温和咨询。",
        price: "199.00",
        durationMinutes: 60,
        suitableFor: "职业迷茫、副业选择困难、想更了解自己优势的人。",
        deliverables: ["天赋数字解读", "优势与卡点梳理", "7 天行动建议"],
        process: ["收集基础信息", "完成数字解读", "给出行动建议"],
        isFeatured: true,
        sortOrder: 1
      }
    }),
    prisma.talentService.upsert({
      where: { slug: "talent-number-ai-side-business" },
      update: {
        title: "天赋数字 + AI 副业方向梳理",
        subtitle: "把自我理解落到副业选择",
        description: "结合你的天赋特质、当前状态和资源基础，判断更适合的 AI 副业方向。",
        content: "适合想做 AI 副业，但不确定工具实战、内容型、服务型或陪跑型哪条路更匹配的人。",
        price: "399.00",
        durationMinutes: 90,
        suitableFor: "想做 AI 副业、需要定位和行动路线的人。",
        deliverables: ["天赋优势梳理", "副业方向建议", "首轮验证任务"],
        process: ["问题收集", "方向匹配", "行动拆解", "复盘提醒"],
        isFeatured: true,
        sortOrder: 2
      },
      create: {
        title: "天赋数字 + AI 副业方向梳理",
        slug: "talent-number-ai-side-business",
        subtitle: "把自我理解落到副业选择",
        description: "结合你的天赋特质、当前状态和资源基础，判断更适合的 AI 副业方向。",
        content: "适合想做 AI 副业，但不确定工具实战、内容型、服务型或陪跑型哪条路更匹配的人。",
        price: "399.00",
        durationMinutes: 90,
        suitableFor: "想做 AI 副业、需要定位和行动路线的人。",
        deliverables: ["天赋优势梳理", "副业方向建议", "首轮验证任务"],
        process: ["问题收集", "方向匹配", "行动拆解", "复盘提醒"],
        isFeatured: true,
        sortOrder: 2
      }
    })
  ]);

  await Promise.all([
    prisma.case.upsert({
      where: { slug: "content-creator-ai-workflow" },
      update: {
        title: "AI 工具实战复盘反馈",
        clientName: "AI 工具实战学员",
        serviceType: "AI 工具实战",
        summary: "围绕内容选题、资料整理和初稿生成，搭建了一套更顺手的 AI 使用流程。",
        result: "形成个人常用提示词、内容流程和每周复盘清单。",
        quote: "以前只是零散试工具，现在终于知道怎么把 AI 用到自己的真实工作里。",
        rating: 5,
        status: "PUBLISHED",
        isFeatured: true,
        sortOrder: 1,
        publishedAt: new Date(),
        authorId: admin.id
      },
      create: {
        title: "AI 工具实战复盘反馈",
        slug: "content-creator-ai-workflow",
        clientName: "AI 工具实战学员",
        serviceType: "AI 工具实战",
        summary: "围绕内容选题、资料整理和初稿生成，搭建了一套更顺手的 AI 使用流程。",
        result: "形成个人常用提示词、内容流程和每周复盘清单。",
        quote: "以前只是零散试工具，现在终于知道怎么把 AI 用到自己的真实工作里。",
        rating: 5,
        status: "PUBLISHED",
        isFeatured: true,
        sortOrder: 1,
        publishedAt: new Date(),
        authorId: admin.id
      }
    }),
    prisma.case.upsert({
      where: { slug: "career-transition-talent-number" },
      update: {
        title: "天赋数字咨询复盘反馈",
        clientName: "天赋数字咨询来访者",
        serviceType: "天赋数字咨询",
        summary: "通过天赋数字梳理优势、卡点和当前行动节奏，重新看见适合自己的成长方向。",
        result: "明确近期要验证的 AI 副业方向和一周行动任务。",
        quote: "我终于把自己的优势和卡点放在同一张地图上看清楚了。",
        rating: 5,
        status: "PUBLISHED",
        sortOrder: 2,
        publishedAt: new Date(),
        authorId: admin.id
      },
      create: {
        title: "天赋数字咨询复盘反馈",
        slug: "career-transition-talent-number",
        clientName: "天赋数字咨询来访者",
        serviceType: "天赋数字咨询",
        summary: "通过天赋数字梳理优势、卡点和当前行动节奏，重新看见适合自己的成长方向。",
        result: "明确近期要验证的 AI 副业方向和一周行动任务。",
        quote: "我终于把自己的优势和卡点放在同一张地图上看清楚了。",
        rating: 5,
        status: "PUBLISHED",
        sortOrder: 2,
        publishedAt: new Date(),
        authorId: admin.id
      }
    })
  ]);

  const settings = [
    ["site.name", "萧遥AI副业基地", "STRING", "网站名称"],
    ["site.owner", "萧小遥", "STRING", "个人 IP 名称"],
    ["site.description", "萧小遥的个人品牌官网，分享 AI 工具实战、AI 副业项目、天赋数字咨询和个人成长复盘。", "TEXT", "网站描述"],
    ["site.tagline", "帮普通人借助 AI 提升效率、增加收入，找到适合自己的成长路径。", "TEXT", "网站主文案"],
    ["site.position", "AI 副业探索者、天赋数字咨询师、普通人成长陪跑者", "STRING", "个人定位"],
    ["contact.email", "hello@xiaoyao-ai.com", "STRING", "联系邮箱"],
    ["contact.wechat", "yao899030", "STRING", "微信号"],
    ["content.directions", JSON.stringify(["AI工具实战", "AI副业项目", "天赋数字咨询", "个人成长复盘"]), "JSON", "内容方向"],
    ["home.hero.tags", JSON.stringify(["AI 副业探索者", "天赋数字咨询师", "普通人成长陪跑者"]), "JSON", "首页标签"]
  ];

  for (const [settingKey, settingValue, settingType, label] of settings) {
    await prisma.siteSetting.upsert({
      where: { settingKey },
      update: { settingValue, settingType, label },
      create: {
        settingKey,
        settingValue,
        settingType,
        label,
        group: settingKey.split(".")[0],
        isPublic: true
      }
    });
  }

  console.log("Seed data initialized.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
