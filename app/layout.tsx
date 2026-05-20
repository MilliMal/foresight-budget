import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Foresight Budget",
  description: "Budget and income tracking for two partners",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1c1917",
                color: "#fafaf9",
                borderRadius: "10px",
              },
              success: {
                iconTheme: { primary: "#0F766E", secondary: "#fafaf9" },
              },
              error: {
                iconTheme: { primary: "#dc2626", secondary: "#fafaf9" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
