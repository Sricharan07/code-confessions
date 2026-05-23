import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/post/$id")({
  component: PostPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="display text-5xl mb-3">404 / lost the receipt</p>
      <Link to="/" className="brutal-btn mt-4">Back to the wall</Link>
    </main>
  ),
});

function PostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/feed", search: { post: id } as any });
  }, [id, navigate]);

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-paper">
      <div className="animate-spin h-6 w-6 border-2 border-ink border-t-transparent rounded-full" />
    </div>
  );
}
