import { useSyncExternalStore } from "react";

export type AITool = 'cursor' | 'chatgpt' | 'claude' | 'copilot' | 'gemini' | 'other';

export type Vibe =
  | '4am_energy' | 'vibe_coding' | 'deadline_panic'
  | 'agentic_rogue' | 'just_woke_up' | 'worked_5min_ago'
  | 'drunk_coded' | 'trust_the_process' | 'prod_on_fire';

export type Verdict = 'still_broken' | 'nuked' | 'solved' | 'cope_mode' | 'rebuilt';

export type Plea = 'innocent' | 'deserve_it' | 'cooked';

export type Reaction =
  | 'cooked'
  | 'relatable'
  | 'segfault'
  | 'skill_issue'
  | 'rip_repo'
  | 'cursed'
  | 'samehere'
  | string; // allows secret reactions

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
  tool: AITool;
  vibe?: Vibe;
  verdict: Verdict;
  plea?: Plea;
  aiDefense?: string;
  memeUrl?: string;
  crimeSceneImage?: string;
  aiDefenseImage?: string;
  language?: string;
  author: string;
  status: Status;
  createdAt: number;
  reactions: Record<string, number>;
  court: { ai_wrong: number; skill_issue: number };
  hidden?: boolean;
}

const POSTS_KEY = "vibefail.posts.v1";
const COMMENTS_KEY = "vibefail.comments.v1";
const REACTED_KEY = "vibefail.reacted.v1"; // local dedupe
const MIGRATED_KEY = "vibefail.migrated.v2"; // migration marker
const VOTED_COURT_KEY = "vibefail.voted_court.v1";

const SEED: Post[] = [
  {
    id: "p1",
    title: "Claude rewrote my entire auth flow because I asked it to 'tidy up'",
    body: "I asked for a one-line cleanup. It deleted my JWT middleware, replaced it with localStorage tokens, and confidently told me it was 'more idiomatic'. Shipped to prod. Found out from a customer.",
    tool: "claude",
    vibe: "vibe_coding",
    verdict: "still_broken",
    plea: "cooked",
    language: "TypeScript",
    author: "anon-0x91",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    reactions: { cooked: 142, relatable: 88, samehere: 211, cursed: 12, segfault: 0, skill_issue: 0, rip_repo: 0 },
    court: { ai_wrong: 0, skill_issue: 0 },
  },
  {
    id: "p2",
    title: "Cursor deleted my .env then committed it",
    body: "Agent mode. 'Cleaning up unused files.' Force pushed. The .env was the only copy of my Stripe live keys. I am writing this from a bathroom floor.",
    tool: "cursor",
    vibe: "deadline_panic",
    verdict: "still_broken",
    plea: "deserve_it",
    language: "Node",
    author: "anon-7e2a",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    reactions: { cooked: 904, relatable: 312, samehere: 88, cursed: 41, segfault: 0, skill_issue: 0, rip_repo: 0 },
    court: { ai_wrong: 0, skill_issue: 0 },
  },
  {
    id: "p3",
    title: "GPT invented a npm package that doesn't exist and built 400 lines around it",
    body: "react-zen-forms@2.4.1. Doesn't exist. Never existed. The hallucinated docs were better than most real ones.",
    tool: "chatgpt",
    vibe: "trust_the_process",
    verdict: "solved",
    plea: "innocent",
    language: "React",
    author: "anon-1f0b",
    status: "solved",
    createdAt: Date.now() - 1000 * 60 * 60 * 30,
    reactions: { cooked: 60, relatable: 410, samehere: 130, cursed: 22, segfault: 0, skill_issue: 0, rip_repo: 0 },
    court: { ai_wrong: 0, skill_issue: 0 },
  },
  {
    id: "p4",
    title: "Copilot autocompleted a recursive DELETE on the users table",
    body: "I typed 'DEL' and pressed tab. It wrote the rest. RLS was off. We had backups. We did not have recent backups.",
    tool: "copilot",
    vibe: "prod_on_fire",
    verdict: "still_broken",
    plea: "cooked",
    language: "SQL",
    author: "anon-c4d8",
    status: "broken",
    createdAt: Date.now() - 1000 * 60 * 60 * 50,
    reactions: { cooked: 1200, relatable: 540, samehere: 90, cursed: 77, segfault: 0, skill_issue: 0, rip_repo: 0 },
    court: { ai_wrong: 0, skill_issue: 0 },
  },
  {
    id: "p5",
    title: "Asked Gemini to add a loading spinner. Got a 6-file refactor and a new state library.",
    body: "It installed Zustand. It migrated my Context to Zustand. It added a spinner. The spinner was inside a Suspense boundary that broke SSR.",
    tool: "gemini",
    vibe: "4am_energy",
    verdict: "solved",
    plea: "deserve_it",
    language: "TypeScript",
    author: "anon-22aa",
    status: "solved",
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    reactions: { cooked: 80, relatable: 220, samehere: 305, cursed: 9, segfault: 0, skill_issue: 0, rip_repo: 0 },
    court: { ai_wrong: 0, skill_issue: 0 },
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

function migrateData() {
  if (typeof window === "undefined") return;
  const migrated = localStorage.getItem(MIGRATED_KEY);
  if (migrated === "true") return;

  posts = posts.map((p) => {
    // Map tool names to lowercase for consistency
    let tool = (p.tool || "other").toLowerCase();
    if (tool === "v0") tool = "other";
    if (!["cursor", "chatgpt", "claude", "copilot", "gemini", "other"].includes(tool)) {
      tool = "other";
    }

    // Reaction mappings
    const rx = p.reactions || {};
    const newRx: Record<string, number> = {
      cooked: (rx.cooked || 0) + (rx.rip || 0) + (rx.F || 0),
      relatable: (rx.relatable || 0) + (rx.lol || 0) + (rx.LOL || 0),
      cursed: (rx.cursed || 0) + (rx.fire || 0),
      samehere: rx.samehere || rx.same || 0,
      segfault: rx.segfault || 0,
      skill_issue: rx.skill_issue || 0,
      rip_repo: rx.rip_repo || 0,
    };

    // Clean up old reaction keys
    for (const key in rx) {
      if (!["rip", "lol", "fire", "samehere", "cooked", "relatable", "cursed", "segfault", "skill_issue", "rip_repo"].includes(key)) {
        newRx[key] = rx[key] || 0;
      }
    }

    // Ensure court is initialized
    const court = p.court || { ai_wrong: 0, skill_issue: 0 };

    // Default verdict based on status
    const verdict = p.verdict || (p.status === "solved" ? "solved" : "still_broken");

    return {
      ...p,
      tool: tool as AITool,
      reactions: newRx,
      court,
      verdict,
      status: verdict === "solved" ? "solved" : "broken",
    };
  });

  localStorage.setItem(MIGRATED_KEY, "true");
  persist();
}

function init() {
  if (initialized || typeof window === "undefined") return;
  posts = load(POSTS_KEY, SEED);
  comments = load(COMMENTS_KEY, SEED_COMMENTS);
  initialized = true;
  migrateData();
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

export function createPost(input: Omit<Post, "id" | "createdAt" | "reactions" | "status" | "author" | "court"> & { author?: string }) {
  init();
  const verdict = input.verdict || 'still_broken';
  const post: Post = {
    id: `p${Date.now()}`,
    createdAt: Date.now(),
    reactions: {
      cooked: 0,
      relatable: 0,
      segfault: 0,
      skill_issue: 0,
      rip_repo: 0,
      cursed: 0,
      samehere: 0,
    },
    status: verdict === 'solved' ? 'solved' : 'broken',
    court: { ai_wrong: 0, skill_issue: 0 },
    author: input.author ?? randomHandle(),
    hidden: false,
    ...input,
    verdict,
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
    return { ...p, reactions: { ...p.reactions, [r]: Math.max(0, (p.reactions[r] || 0) + delta) } };
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
  posts = posts.map((p) => (p.id === postId ? { ...p, status, verdict: status === "solved" ? "solved" : "still_broken" } : p));
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

export interface SecretReaction {
  emoji: string;
  key: string;
  expiresAt: number;
}

export function getActiveSecretReaction(): SecretReaction {
  const pool = [
    { emoji: "🥲", key: "humbled" },
    { emoji: "🫨", key: "shaken" },
    { emoji: "🤖", key: "betrayed" },
    { emoji: "🧂", key: "salty" },
    { emoji: "🪞", key: "mirrored" },
    { emoji: "🚬", key: "cigarette_break" },
  ];

  const MS_PER_WEEK = 604800000;
  const TUESDAY_OFFSET = 5 * 24 * 60 * 60 * 1000; // Jan 6, 1970 was a Tuesday

  const now = Date.now();
  const shiftedTime = now - TUESDAY_OFFSET;
  const weekIndex = Math.floor(shiftedTime / MS_PER_WEEK);
  
  const activeIndex = ((weekIndex % pool.length) + pool.length) % pool.length;
  const secret = pool[activeIndex];
  const expiresAt = (weekIndex + 1) * MS_PER_WEEK + TUESDAY_OFFSET;

  return {
    emoji: secret.emoji,
    key: secret.key,
    expiresAt,
  };
}

function getVotedCourtSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_COURT_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveVotedCourtSet(s: Set<string>) {
  localStorage.setItem(VOTED_COURT_KEY, JSON.stringify([...s]));
}

export function voteCourt(postId: string, verdict: 'ai_wrong' | 'skill_issue') {
  init();
  const voted = getVotedCourtSet();
  if (voted.has(postId)) return;

  posts = posts.map((p) => {
    if (p.id !== postId) return p;
    const court = p.court || { ai_wrong: 0, skill_issue: 0 };
    return {
      ...p,
      court: {
        ...court,
        [verdict]: (court[verdict] || 0) + 1,
      },
    };
  });

  voted.add(postId);
  saveVotedCourtSet(voted);
  persist();
}

export function getCourtRatio(postId: string) {
  init();
  const post = posts.find((p) => p.id === postId);
  const court = post?.court || { ai_wrong: 0, skill_issue: 0 };
  const total = (court.ai_wrong || 0) + (court.skill_issue || 0);
  if (total === 0) {
    return { aiWrongPct: 0, skillIssuePct: 0, total: 0 };
  }
  const aiWrongPct = Math.round((court.ai_wrong / total) * 100);
  const skillIssuePct = 100 - aiWrongPct;
  return { aiWrongPct, skillIssuePct, total };
}

export const REACTION_META: Record<string, { label: string; emoji: string }> = {
  cooked: { label: "cooked", emoji: "💀" },
  relatable: { label: "relatable", emoji: "😭" },
  segfault: { label: "segfault", emoji: "🫥" },
  skill_issue: { label: "skill issue", emoji: "🤡" },
  rip_repo: { label: "rip repo", emoji: "🪦" },
  cursed: { label: "cursed", emoji: "🔥" },
  samehere: { label: "same here", emoji: "🫠" },
};

// AI Court UI lives in post.$id.tsx and index.tsx feed cards — owned by [other dev]

export const TOOLS = ["cursor", "chatgpt", "claude", "copilot", "gemini", "other"];
