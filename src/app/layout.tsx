import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@/components/ui/clerk-theme";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeSync } from "@/components/theme/ThemeSync";
import { ConvexClientProvider } from "@/components/ui/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chae",
    template: "%s · Chae",
  },
  description: "Job sites, timesheets, invoices, and holidays for your company.",
};

// Holds the page shell while auth state is still resolving.
function ShellFallback() {
  return <main className="shell-fallback" aria-busy="true" />;
}

// Wraps every page with the shared document, fonts, and Convex client.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var p=location.pathname;if(p!=='/'&&p!=='/documentation'&&p!=='/privacy'&&p!=='/terms'){var t=localStorage.getItem('chae-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <ThemeSync />
        </Suspense>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <Suspense fallback={<ShellFallback />}>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </Suspense>
        </ClerkProvider>
      </body>
    </html>
  );
}