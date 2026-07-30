"use client";

import { useState } from "react";

const stages = [
  {
    title: "阶段 01：从焦虑到行动",
    summary: "不再只收藏教程，而是先跑通一个最小项目。",
    detail: "重点记录：副业踩坑、AI 工具学习、公众号起号、内容输出和项目复盘。"
  },
  {
    title: "阶段 02：从项目到系统",
    summary: "把偶然赚到的钱，沉淀成可复制的方法。",
    detail: "重点记录：AI 工作流、内容 SOP、私域承接、个人品牌网站和产品化服务。"
  },
  {
    title: "阶段 03：从收入到长期成长",
    summary: "副业不是终点，它是重新认识自己的入口。",
    detail: "重点记录：天赋数字、长期主义、读书思考、能量管理和个人 IP 迭代。"
  }
];

export function GrowthTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="grid gap-4">
      {stages.map((stage, index) => {
        const isActive = activeIndex === index;

        return (
          <button
            aria-expanded={isActive}
            className="paper-panel p-5 text-left transition hover:translate-x-1"
            key={stage.title}
            type="button"
            onClick={() => setActiveIndex(index)}
          >
            <strong className="block font-display text-lg text-primary">
              {stage.title}
            </strong>
            <span className="mt-2 block leading-7 text-muted-foreground">
              {stage.summary}
            </span>
            <span
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isActive ? "1fr" : "0fr" }}
            >
              <span className="overflow-hidden">
                <span className="mt-3 block border-l-2 border-accent/60 pl-4 text-sm leading-7 text-muted-foreground">
                  {stage.detail}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
