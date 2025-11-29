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
        <ThemeProvider>
          <Providers>
            {/* Children render without padding - allows full-width elements */}
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    "flex items-center gap-3 w-full p-4 rounded-xl border shadow-lg backdrop-blur-sm bg-card/95 border-card-border text-foreground",
                  title: "font-medium text-sm",
                  description: "text-xs text-muted-foreground",
                  success:
                    "flex items-center gap-3 w-full p-4 rounded-xl border shadow-lg backdrop-blur-sm bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                  error:
                    "flex items-center gap-3 w-full p-4 rounded-xl border shadow-lg backdrop-blur-sm bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
                  warning:
                    "flex items-center gap-3 w-full p-4 rounded-xl border shadow-lg backdrop-blur-sm bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
                  info: "flex items-center gap-3 w-full p-4 rounded-xl border shadow-lg backdrop-blur-sm bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
                  icon: "shrink-0",
                },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
