import { useSyncExternalStore } from "react";

export type Reaction = "rip" | "lol" | "samehere" | "fire";
export type Status = "broken" | "solved";

export interface Comment {
  id: string;
  postId: string;
  body: string;
  author: string;
  createdAt: number;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  tool: string; // which AI made the mess
  language: string;
  author: string; // anon handle
  status: Status;
  createdAt: number;
  reactions: Record<Reaction, number>;
  hidden?: boolean;
}

const POSTS_KEY = "vibefail.posts.v1";
const COMMENTS_KEY = "vibefail.comments.v1";
const REACTED_KEY = "vibefail.reacted.v1"; // local dedupe

const SEED: Post[] = [
  {
    id: "p1",
    title: "Claude rewrote my entire auth flow because I asked it to 'tidy up'",
    body: "I asked for a one-line cleanup. It deleted my JWT middleware, replaced it with localStorage tokens, and confidently told me it was 'more idiomatic'. Shipped to prod. Found out from a customer.",
    tool: "Claude",
    language: "TypeScript",
    author: "anon-0x91",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    reactions: { rip: 142, lol: 88, samehere: 211, fire: 12 },
  },
  {
    id: "p2",
    title: "Cursor deleted my .env then committed it",
    body: "Agent mode. 'Cleaning up unused files.' Force pushed. The .env was the only copy of my Stripe live keys. I am writing this from a bathroom floor.",
    tool: "Cursor",
    language: "Node",
    author: "anon-7e2a",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    reactions: { rip: 904, lol: 312, samehere: 88, fire: 41 },
  },
  {
    id: "p3",
    title: "GPT invented a npm package that doesn't exist and built 400 lines around it",
    body: "react-zen-forms@2.4.1. Doesn't exist. Never existed. The hallucinated docs were better than most real ones.",
    tool: "ChatGPT",
    language: "React",
    author: "anon-1f0b",
    status: "solved",
    createdAt: Date.now() - 1000 * 60 * 60 * 30,
    reactions: { rip: 60, lol: 410, samehere: 130, fire: 22 },
  },
  {
    id: "p4",
    title: "Copilot autocompleted a recursive DELETE on the users table",
    body: "I typed 'DEL' and pressed tab. It wrote the rest. RLS was off. We had backups. We did not have recent backups.",
    tool: "Copilot",
    language: "SQL",
    author: "anon-c4d8",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 50,
    reactions: { rip: 1200, lol: 540, samehere: 90, fire: 77 },
  },
  {
    id: "p5",
    title: "Asked Gemini to add a loading spinner. Got a 6-file refactor and a new state library.",
    body: "It installed Zustand. It migrated my Context to Zustand. It added a spinner. The spinner was inside a Suspense boundary that broke SSR.",
    tool: "Gemini",
    language: "TypeScript",
    author: "anon-22aa",
    status: "solved",
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    reactions: { rip: 80, lol: 220, samehere: 305, fire: 9 },
  },
];

const SEED_COMMENTS: Comment[] = [
  { id: "c1", postId: "p2", body: "the bathroom floor part hits", author: "anon-aa11", createdAt: Date.now() - 1000 * 60 * 30 },
  { id: "c2", postId: "p2", body: "rotate keys. cry later.", author: "anon-bb22", createdAt: Date.now() - 1000 * 60 * 15 },
  { id: "c3", postId: "p4", body: "this is why I have a read-only db user now", author: "anon-cc33", createdAt: Date.now() - 1000 * 60 * 60 },
];

function load<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

let posts: Post[] = [];
let comments: Comment[] = [];
let initialized = false;
const listeners = new Set<() => void>();
let latestSnapshot: { posts: Post[]; comments: Comment[] } = { posts: SEED, comments: SEED_COMMENTS };

function init() {
  if (initialized || typeof window === "undefined") return;
  posts = load(POSTS_KEY, SEED);
  comments = load(COMMENTS_KEY, SEED_COMMENTS);
  initialized = true;
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  latestSnapshot = { posts, comments };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  init();
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  init();
  return latestSnapshot;
}

const serverSnapshot = { posts: SEED, comments: SEED_COMMENTS };

export function useStore() {
  return useSyncExternalStore(subscribe, snapshot, () => serverSnapshot);
}

export function randomHandle() {
  const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `anon-${hex}`;
}

export function createPost(input: Omit<Post, "id" | "createdAt" | "reactions" | "status" | "author"> & { author?: string }) {
  init();
  const post: Post = {
    id: `p${Date.now()}`,
    createdAt: Date.now(),
    reactions: { rip: 0, lol: 0, samehere: 0, fire: 0 },
    status: "broken",
    author: input.author ?? randomHandle(),
    ...input,
  };
  posts = [post, ...posts];
  persist();
  return post;
}

export function addComment(postId: string, body: string) {
  init();
  const c: Comment = {
    id: `c${Date.now()}`,
    postId,
    body,
    author: randomHandle(),
    createdAt: Date.now(),
  };
  comments = [...comments, c];
  persist();
  return c;
}

function reactedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(REACTED_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveReacted(s: Set<string>) {
  localStorage.setItem(REACTED_KEY, JSON.stringify([...s]));
}

export function toggleReaction(postId: string, r: Reaction) {
  init();
  const key = `${postId}:${r}`;
  const s = reactedSet();
  posts = posts.map((p) => {
    if (p.id !== postId) return p;
    const delta = s.has(key) ? -1 : 1;
    return { ...p, reactions: { ...p.reactions, [r]: Math.max(0, p.reactions[r] + delta) } };
  });
  if (s.has(key)) s.delete(key); else s.add(key);
  saveReacted(s);
  persist();
}

export function hasReacted(postId: string, r: Reaction) {
  return reactedSet().has(`${postId}:${r}`);
}

export function setStatus(postId: string, status: Status) {
  init();
  posts = posts.map((p) => (p.id === postId ? { ...p, status } : p));
  persist();
}

export function toggleHidden(postId: string) {
  init();
  posts = posts.map((p) => (p.id === postId ? { ...p, hidden: !p.hidden } : p));
  persist();
}

export function deletePost(postId: string) {
  init();
  posts = posts.filter((p) => p.id !== postId);
  comments = comments.filter((c) => c.postId !== postId);
  persist();
}

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const REACTION_META: Record<Reaction, { label: string; emoji: string }> = {
  rip: { label: "F", emoji: "💀" },
  lol: { label: "LOL", emoji: "😂" },
  samehere: { label: "same", emoji: "🫠" },
  fire: { label: "cursed", emoji: "🔥" },
};

export const TOOLS = ["Claude", "ChatGPT", "Cursor", "Copilot", "Gemini", "v0", "Other"];
