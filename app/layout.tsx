import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Oncore",
  description: "Oncore, the best application for touring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="px-1 md:px-8 lg:px-16 xl:px-20 mx-auto">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
