import { createFileRoute } from "@tanstack/react-router";
import { SidebarV2 } from "@/components/v2/SidebarV2";
import { FeedV2 } from "@/components/v2/FeedV2";

export const Route = createFileRoute("/v2")({
  component: V2Layout,
  head: () => ({
    meta: [{ title: "VibeFail V2" }],
  }),
});

function V2Layout() {
  return (
    <div className="h-full bg-paper text-ink selection:bg-volt font-sans flex flex-col md:flex-row justify-center">
      {/* Left Sidebar - Desktop */}
      <aside className="w-full md:w-[275px] h-full md:flex flex-col bg-paper z-20">
        <SidebarV2 />
      </aside>

      {/* Main Feed Column */}
      <main className="flex-1 w-full max-w-[600px] border-x border-ink/10 h-full overflow-y-auto pb-20 md:pb-0">
        <FeedV2 />
      </main>
      
      {/* Right Column for large screens (Trending, etc.) */}
      <aside className="hidden lg:block w-[350px] h-full overflow-y-auto p-4 pl-8">
        <div className="bg-ink/5 rounded-2xl p-4">
          <p className="font-bold text-xl mb-4">Trends for you</p>
          <div className="space-y-4 text-sm">
            <div className="cursor-pointer hover:bg-ink/5 -mx-4 px-4 py-1">
              <span className="text-muted-foreground text-xs">1 · AI Tool</span><br/>
              <span className="font-bold text-base">#CursorFail</span><br/>
              <span className="text-muted-foreground text-xs">4,592 posts</span>
            </div>
            <div className="cursor-pointer hover:bg-ink/5 -mx-4 px-4 py-1">
              <span className="text-muted-foreground text-xs">2 · Drama</span><br/>
              <span className="font-bold text-base">Production Down</span><br/>
              <span className="text-muted-foreground text-xs">2,103 posts</span>
            </div>
            <div className="cursor-pointer hover:bg-ink/5 -mx-4 px-4 py-1">
              <span className="text-muted-foreground text-xs">3 · Feature</span><br/>
              <span className="font-bold text-base">Recursive Delete</span><br/>
              <span className="text-muted-foreground text-xs">1,894 posts</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
