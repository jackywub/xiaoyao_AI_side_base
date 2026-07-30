"use client";

import { Send } from "lucide-react";
import { useId, useState } from "react";

import { siteConfig } from "@/lib/site";

type FormValues = {
  name: string;
  contact: string;
  topic: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  name: "",
  contact: "",
  topic: "",
  message: ""
};

const topics = [
  "AI 工具实战",
  "AI 副业方向梳理",
  "天赋数字咨询",
  "个人成长复盘"
];

function validateForm(values: FormValues) {
  const errors: FormErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = "请填写至少 2 个字的称呼。";
  }

  if (values.contact.trim().length < 5) {
    errors.contact = "请填写微信号、手机号或邮箱，方便后续联系。";
  }

  if (!values.topic) {
    errors.topic = "请选择想咨询的方向。";
  }

  if (values.message.trim().length < 10) {
    errors.message = "请简单描述你的现状或问题，至少 10 个字。";
  }

  return errors;
}

export function AppointmentForm() {
  const formId = useId();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "failed";
    message: string;
  }>({ type: "idle", message: "" });

  function updateValue(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const nextErrors = validateForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({
        type: "failed",
        message: "提交失败：请先修正表单中的提示。"
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "预约提交失败。");
      setStatus({
        type: "success",
        message: `预约信息已保存。也可以添加微信 ${siteConfig.wechat}，我会继续和你确认时间。`
      });
      setValues(initialValues);
      setErrors({});
    } catch (error) {
      setStatus({
        type: "failed",
        message: error instanceof Error ? error.message : "提交失败，请稍后再试或直接添加微信联系。"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "focus-ring min-h-11 w-full rounded-lg border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70";

  return (
    <form className="soft-card p-6 sm:p-8" noValidate onSubmit={handleSubmit}>
      <div>
        <p className="font-display text-2xl font-semibold">预约咨询</p>
        <p className="mt-3 leading-7 text-muted-foreground">
          先把你的问题简单写下来，提交后会保存到咨询记录中，我会通过你留下的方式联系。
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold" htmlFor={`${formId}-name`}>
            称呼
          </label>
          <input
            className={inputClass}
            disabled={isSubmitting}
            id={`${formId}-name`}
            name="name"
            placeholder="例如：小林"
            value={values.name}
            onChange={(event) => updateValue("name", event.target.value)}
          />
          {errors.name ? (
            <p className="mt-2 text-sm text-accent">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold" htmlFor={`${formId}-contact`}>
            联系方式
          </label>
          <input
            className={inputClass}
            disabled={isSubmitting}
            id={`${formId}-contact`}
            name="contact"
            placeholder="微信 / 手机 / 邮箱"
            value={values.contact}
            onChange={(event) => updateValue("contact", event.target.value)}
          />
          {errors.contact ? (
            <p className="mt-2 text-sm text-accent">{errors.contact}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold" htmlFor={`${formId}-topic`}>
          咨询方向
        </label>
        <select
          className={inputClass}
          disabled={isSubmitting}
          id={`${formId}-topic`}
          name="topic"
          value={values.topic}
          onChange={(event) => updateValue("topic", event.target.value)}
        >
          <option value="">请选择一个方向</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        {errors.topic ? (
          <p className="mt-2 text-sm text-accent">{errors.topic}</p>
        ) : null}
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold" htmlFor={`${formId}-message`}>
          你的问题
        </label>
        <textarea
          className={`${inputClass} min-h-32 resize-y`}
          disabled={isSubmitting}
          id={`${formId}-message`}
          name="message"
          placeholder="简单说说你目前的状态、想解决的问题，或想预约的咨询方向。"
          value={values.message}
          onChange={(event) => updateValue("message", event.target.value)}
        />
        {errors.message ? (
          <p className="mt-2 text-sm text-accent">{errors.message}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-line transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
          disabled={isSubmitting}
          type="submit"
        >
          <Send size={16} />
          {isSubmitting ? "提交中..." : "提交预约"}
        </button>
        <p className="text-sm text-muted-foreground">也可以直接加微信：{siteConfig.wechat}</p>
      </div>

      {status.type !== "idle" ? (
        <p
          aria-live="polite"
          className={`mt-5 rounded-lg border px-4 py-3 text-sm leading-6 ${
            status.type === "success"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
