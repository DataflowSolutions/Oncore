import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Providers } from "@/app/providers";
import { Special_Gothic_Expanded_One } from "next/font/google";

export const specialGothic = Special_Gothic_Expanded_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-header",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: false,
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={specialGothic.variable} // ← this line is important!
    >
      <body>
        <div className="px-1 md:px-8 lg:px-16 xl:px-20 mx-auto">
          <ThemeProvider>
            <Providers>
              {children}
              <Toaster richColors position="top-right" />
            </Providers>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
