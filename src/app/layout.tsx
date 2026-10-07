import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import ThemeProvider from "@/components/theme/ThemeProvider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CodeSight",
  description: "Project management for developers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `try{var t=localStorage.getItem('codesight_visualization_theme');t=t==='light'?'light':'dark';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.classList.add('dark');document.documentElement.dataset.theme='dark'}`;

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased dark`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="flex min-h-full flex-col font-(family-name:--font-poppins)">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
