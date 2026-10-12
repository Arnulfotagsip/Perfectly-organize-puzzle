import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-extrabold">This spot is empty</h1>
      <p className="text-muted">We couldn&apos;t find that page — maybe it got tidied away.</p>
      <ButtonLink href="/levels" variant="primary" icon="grid">
        Choose a level
      </ButtonLink>
    </main>
  );
}
