import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@/components/ui/clerk-theme";
import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ui/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chae",
  description: "Simple role-based access control for your entire team.",
};

// Wraps every page with the shared document, fonts, and Convex client.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}