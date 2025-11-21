import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="text-primary-foreground">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
              </svg>
            </div>
            <span className="text-xl font-bold">Fragmento</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Design tokens that scale with your{" "}
              <span className="text-primary">team</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Bridge the gap between design and development with a comprehensive design token management platform. 
              Sync from Figma, version with confidence, and deploy to any platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg" className="text-base">
                  Start for free
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="text-base">
                  Learn more
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need for design tokens
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From design to deployment, manage your design system with confidence.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Figma Integration</h3>
                  <p className="mt-2 text-muted-foreground">
                    Sync variables directly from Figma with our native plugin. Keep design and code in perfect harmony.
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Version Control</h3>
                  <p className="mt-2 text-muted-foreground">
                    Track changes, create releases, and manage your design system evolution with semantic versioning.
                  </p>
                </div>
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">Multi-Platform Export</h3>
                  <p className="mt-2 text-muted-foreground">
                    Export to CSS, SCSS, JavaScript, iOS, Android, and more. One source of truth for all platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to streamline your design system?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join teams who trust Fragmento to manage their design tokens.
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="text-base">
                  Get started for free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="text-primary-foreground">
                  <rect width="32" height="32" rx="8" fill="currentColor"/>
                  <path d="M8 12h16v2H8v-2zm0 4h12v2H8v-2zm0 4h8v2H8v-2z" fill="white"/>
                </svg>
              </div>
              <span className="font-semibold">Fragmento</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Fragmento. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
