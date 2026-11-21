import Link from "next/link";
import { LanguageToggle } from "@/components/domain/language-toggle";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <p className="text-sm font-semibold text-primary">৪০৪</p>
      <h1 className="text-2xl font-bold tracking-tight">পেজটি পাওয়া যায়নি</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        আপনি যে ঠিকানাটি খুঁজছেন তা নেই বা সরানো হয়েছে। হোম পেজ থেকে আবার
        শুরু করুন।
      </p>
      <Button asChild className="press h-11 rounded-input">
        <Link href="/">হোমে ফিরে যান</Link>
      </Button>
    </main>
  );
}
