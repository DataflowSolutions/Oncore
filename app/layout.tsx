import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="en">
      <body className="px-1 md:px-8 lg:px-16 xl:px-24 max-w-[1440px] mx-auto">
        {children}
      </body>
    </html>
  );
}
