"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="fallback-page"><h1>Something interrupted the workspace.</h1><p>Please retry. Guest work remains saved in this browser session when storage is available.</p><Button onClick={reset}>Try again</Button></main>;
}
