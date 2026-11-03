"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="fallback-page"><h1>Something interrupted the workspace.</h1><p>Please retry. Unsaved sample changes may be lost.</p><Button onClick={reset}>Try again</Button></main>;
}
