import type { ManagedPageContent } from "@/lib/site-content";

export type AdminProject = {
  id: string;
  title: string;
  slug: string;
  type: "CONTENT" | "SERVICE" | "TOOL" | "CONSULTING";
  description: string;
  detail: string;
  coverImage: string;
  targetAudience: string;
  costLevel: string;
  difficulty: string;
  monetization: string;
  tags: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  isFeatured: boolean;
};

export type AdminArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
};

export type AdminAiTool = {
  id: string;
  name: string;
  slug: string;
  description: string;
  detail: string;
  category: string;
  toolUrl: string;
  embedUrl: string;
  iconImage: string;
  screenshot: string;
  tags: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  isFeatured: boolean;
};

export type AdminTalentService = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  content: string;
  price: string;
  durationMinutes: number | null;
  suitableFor: string;
  deliverables: string[];
  process: string[];
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
  isFeatured: boolean;
};

export type AdminCase = {
  id: string;
  title: string;
  slug: string;
  clientName: string;
  serviceType: string;
  summary: string;
  content: string;
  result: string;
  quote: string;
  rating: number | null;
  coverImage: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: number;
  isFeatured: boolean;
};

export type AdminCategory = { id: string; name: string };

export type ContentAdminData = {
  pages: ManagedPageContent[];
  projects: AdminProject[];
  articles: AdminArticle[];
  aiTools: AdminAiTool[];
  talentServices: AdminTalentService[];
  cases: AdminCase[];
  categories: AdminCategory[];
};
