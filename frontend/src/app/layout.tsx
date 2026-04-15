import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "../../components/AuthProvider";
import ShellWrapper from "../../components/ShellWrapper";
import PWARegister from "../../components/PWARegister";
import ThemeProvider from "../../components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Morph OS",
  description: "The world's first high-fidelity generative operating system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Morph OS",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Anti-flash: apply saved theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('morph_theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();` }} />
      </head>
      <body className="antialiased overflow-hidden h-screen-dvh flex" style={{ background: 'var(--bg-page)', color: 'var(--t1)' }}>
        <AuthProvider>
          <ThemeProvider>
            <ShellWrapper>{children}</ShellWrapper>
          </ThemeProvider>
        </AuthProvider>
        <PWARegister />
      </body>
    </html>
  );
}
