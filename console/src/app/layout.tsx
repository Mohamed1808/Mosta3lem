import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";

import { AppProvider } from "@/lib/app";
import "./globals.css";

const latin = Inter({ variable: "--font-latin", subsets: ["latin"] });
const arabic = Noto_Sans_Arabic({ variable: "--font-arabic", subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "Mosta3lem Console",
  description: "Internal console for the Mosta3lem team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${latin.variable} ${arabic.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
