import { notFound } from "next/navigation";
import { DevPreview } from "./dev-preview";

// Dev-only playground for the decision UI (wheel, tournament, result)
// with fake data — lets you polish animations without a Supabase setup.
export default function DevPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevPreview />;
}
