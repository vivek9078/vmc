import { NewQueryHub } from "./new-query-hub";

export default function NewQueryPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold tracking-tight mb-1">New Inquiry</h1>
      <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
        Create a new travel inquiry manually, or start from a screenshot, PDF, or pasted message —
        every automated method still goes through a human review step before it's saved.
      </p>
      <NewQueryHub />
    </div>
  );
}
