import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.1834 0.585787C16.8083 0.210715 16.2996 0 15.7692 0H8.23084C7.70041 0 7.19171 0.210713 6.81663 0.585785L0.585787 6.81662C0.210714 7.19169 0 7.7004 0 8.23083V15.7692C0 16.2996 0.210714 16.8083 0.585786 17.1834L6.81663 23.4142C7.19171 23.7893 7.70041 24 8.23085 24H15.7692C16.2996 24 16.8083 23.7893 17.1834 23.4142L23.4142 17.1834C23.7893 16.8083 24 16.2996 24 15.7692V8.23083C24 7.7004 23.7893 7.19169 23.4142 6.81662L17.1834 0.585787ZM8.6747 16.7132L5.34675 13.3853C4.5657 12.6042 4.5657 11.3379 5.34675 10.5569L8.6747 7.22892C10.4675 5.43614 13.4169 5.43614 15.2096 7.22892L18.5376 10.5569C19.3186 11.3379 19.3186 12.6042 18.5376 13.3853L15.2096 16.7132C13.4169 18.506 10.5253 18.506 8.6747 16.7132Z"
                fill="black"
              />
            </svg>
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
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-x-6">
              <Link
                href="https://www.figma.com/community/plugin/1574365494469384127/fragmento"
                target="_blank"
                rel="noreferrer"
              >
                <Button size="lg" className="h-[54px] px-8 text-base">
                  Try Plugin
                </Button>
              </Link>
              <a
                href="https://www.producthunt.com/products/fragmento?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-fragmento"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[54px] items-center"
              >
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041427&theme=light&t=1765024078862"
                  alt="Fragmento - Sync design tokens to shadcn with version control | Product Hunt"
                  width={250}
                  height={54}
                  style={{ width: 250, height: 54 }}
                />
              </a>
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
                  <h3 className="mt-4 text-lg font-semibold">Shadcn-ready exports</h3>
                  <p className="mt-2 text-muted-foreground">
                    Generate CSS variables already formatted for shadcn/ui themes, so your tokens drop straight into production UIs.
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
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17.1834 0.585787C16.8083 0.210715 16.2996 0 15.7692 0H8.23084C7.70041 0 7.19171 0.210713 6.81663 0.585785L0.585787 6.81662C0.210714 7.19169 0 7.7004 0 8.23083V15.7692C0 16.2996 0.210714 16.8083 0.585786 17.1834L6.81663 23.4142C7.19171 23.7893 7.70041 24 8.23085 24H15.7692C16.2996 24 16.8083 23.7893 17.1834 23.4142L23.4142 17.1834C23.7893 16.8083 24 16.2996 24 15.7692V8.23083C24 7.7004 23.7893 7.19169 23.4142 6.81662L17.1834 0.585787ZM8.6747 16.7132L5.34675 13.3853C4.5657 12.6042 4.5657 11.3379 5.34675 10.5569L8.6747 7.22892C10.4675 5.43614 13.4169 5.43614 15.2096 7.22892L18.5376 10.5569C19.3186 11.3379 19.3186 12.6042 18.5376 13.3853L15.2096 16.7132C13.4169 18.506 10.5253 18.506 8.6747 16.7132Z"
                  fill="black"
                />
              </svg>
              <span className="font-semibold">Fragmento</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Fragmento. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
