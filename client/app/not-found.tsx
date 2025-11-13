"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      {/* Main Content - Centered */}
      <div className="relative flex-1 flex items-center justify-center px-4 z-10">
        <div className="text-center max-w-2xl space-y-8">
          {/* Oncore Logo */}
          <Link
            href="/"
            className="text-xl font-bold font-header text-white hover:text-primary transition-colors lowercase inline-block"
          >
            oncore
          </Link>

          {/* Large 404 with gradient */}
          <div className="space-y-6">
            <h1 className="text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter bg-gradient-to-b from-white via-white/80 to-white/20 bg-clip-text text-transparent select-none">
              404
            </h1>

            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">
                Lost in the void
              </h2>
              <p className="text-base md:text-lg text-white/60 max-w-md mx-auto">
                This page doesn&apos;t exist. Let&apos;s get you back on track.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="lg"
              className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button
              asChild
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Take Me Home
              </Link>
            </Button>
          </div>

          {/* Contact Info */}
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Think this is an error?{" "}
            <a
              href="mailto:support@oncore.io"
              className="text-white/60 hover:text-primary transition-colors underline underline-offset-2"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
