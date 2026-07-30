import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Bot,
  Compass,
  LayoutDashboard,
  HeartHandshake,
  MessageCircle,
  Sparkles
} from "lucide-react";

export const siteConfig = {
  name: "萧遥AI副业基地",
  owner: "萧小遥",
  url: "https://xiaoyao-ai.com",
  description:
    "萧小遥的个人品牌官网，分享 AI 工具实战、AI 副业项目、天赋数字咨询和个人成长复盘。",
  tagline:
    "帮普通人借助 AI 提升效率、增加收入，找到适合自己的成长路径。",
  position: "AI 副业探索者、天赋数字咨询师、普通人成长陪跑者",
  email: "363811256@qq.com",
  wechat: "yao899030"
};

export const navItems: Array<{
  label: string;
  href: string;
  icon?: LucideIcon;
}> = [
  { label: "首页", href: "/" },
  { label: "个人简介", href: "/about" },
  { label: "副业项目", href: "/ai-side-business" },
  { label: "AI 工具栏", href: "/ai-tools" },
  { label: "天赋数字", href: "/talent-number" },
  { label: "个人成长", href: "/growth" },
  { label: "案例反馈", href: "/cases" },
  { label: "联系我", href: "/contact" },
  { label: "成长工作台", href: "/workspace", icon: LayoutDashboard }
];

export type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
};

export const focusAreas: FeatureCard[] = [
  {
    title: "AI 工具实战",
    description: "把常用 AI 工具拆成真实场景里的流程、提示词和可复用小模板。",
    icon: Bot,
    href: "/ai-tools"
  },
  {
    title: "AI 副业项目",
    description: "从内容、服务到工作流自动化，找到普通人可验证、可积累的副业入口。",
    icon: Bot,
    href: "/ai-side-business"
  },
  {
    title: "天赋数字咨询",
    description: "用数字线索整理性格优势、行动节奏和更适合长期投入的方向。",
    icon: Sparkles,
    href: "/talent-number"
  },
  {
    title: "个人成长复盘",
    description: "记录普通人在副业探索、情绪整理和长期行动里的阶段复盘。",
    icon: BookOpenText,
    href: "/growth"
  }
];

export const valueTags = [
  "AI 副业探索者",
  "天赋数字咨询师",
  "普通人成长陪跑者",
  "工具实战",
  "复盘落地"
];

export const contactOptions = [
  {
    title: "微信咨询",
    value: siteConfig.wechat,
    description: "适合预约天赋数字咨询、AI 副业方向梳理和成长复盘。",
    icon: MessageCircle
  },
  {
    title: "邮件联系",
    value: siteConfig.email,
    description: "适合合作邀约、案例投稿和较完整的咨询背景说明。",
    icon: HeartHandshake
  },
  {
    title: "咨询前准备",
    value: "带着一个真实问题来",
    description: "不用准备完美答案，只需要说清当下最想改变的地方。",
    icon: Compass
  }
];
