import type { Metadata } from "next";
import Script from "next/script";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { siteConfig } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  keywords: [
    "萧遥AI副业基地",
    "萧小遥",
    "AI工具实战",
    "AI副业项目",
    "天赋数字咨询",
    "个人成长复盘"
  ],
  authors: [{ name: siteConfig.owner }],
  alternates: {
    canonical: siteConfig.url
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/xiaoyao-avatar-optimized.jpg", sizes: "900x900", type: "image/jpeg" }
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/xiaoyao-avatar-optimized.jpg", sizes: "900x900", type: "image/jpeg" }
    ]
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/xiaoyao-avatar-optimized.jpg",
        width: 900,
        height: 900,
        alt: "萧小遥个人头像"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/xiaoyao-avatar-optimized.jpg"]
  }
};

const themeScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : prefersDark ? "dark" : "light";
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    } catch (error) {}
  })();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN" suppressHydrationWarning>
      <head>
        <Script dangerouslySetInnerHTML={{ __html: themeScript }} id="theme-initializer" strategy="beforeInteractive" />
      </head>
      <body className="font-sans antialiased">
        <Header />
        <main className="min-h-screen pt-[4.5rem]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
