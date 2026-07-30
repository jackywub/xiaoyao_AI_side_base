"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

const defaultFaqs = [
  {
    question: "天赋数字能解决什么问题？",
    answer:
      "帮助你看见自己的优势、能量模式、沟通方式、行动卡点，以及更适合长期发展的方向。"
  },
  {
    question: "谁适合做咨询？",
    answer:
      "适合职业迷茫、副业选择困难、情绪内耗严重，或者想更了解自己优势的人。"
  },
  {
    question: "咨询后能得到什么？",
    answer:
      "你会得到一份关于自身优势、卡点、成长方向和副业匹配建议的梳理，不是标准答案，而是一张更清晰的行动地图。"
  }
];

export function TalentAccordion({ faqs = defaultFaqs }: { faqs?: Array<{ question: string; answer: string }> }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="grid gap-3">
      {faqs.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            className="overflow-hidden rounded-lg border border-border/50 bg-surface/85 shadow-line"
            key={item.question}
          >
            <button
              aria-expanded={isOpen}
              className="focus-ring flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-lg font-semibold text-foreground"
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
            >
              <span>{item.question}</span>
              <Plus
                className="shrink-0 text-accent transition"
                data-open={isOpen}
                size={20}
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              />
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 leading-8 text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
