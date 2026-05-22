import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const PostInputSchema = z.object({
  title: z.string(),
  body: z.string(),
  tool: z.string(),
  vibe: z.string().optional(),
  verdict: z.string().optional(),
  plea: z.string().optional(),
  aiDefense: z.string().optional(),
  memeUrl: z.string().optional(),
  crimeSceneImage: z.string().optional(),
  aiDefenseImage: z.string().optional(),
});

const ReactionInputSchema = z.object({
  postId: z.string(),
  reactionKey: z.string(),
});

const VoteInputSchema = z.object({
  postId: z.string(),
  verdict: z.enum(["ai_wrong", "skill_issue"]),
});

const CommentInputSchema = z.object({
  postId: z.string(),
  body: z.string(),
});

async function authenticateServerClient() {
  let request;
  try {
    request = getRequest();
  } catch {
    return;
  }
  if (!request) return;
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c: string) => {
      const parts = c.trim().split("=");
      return [parts[0], parts.slice(1).join("=")];
    })
  );
  const accessToken = cookies["sb-access-token"];
  const refreshToken = cookies["sb-refresh-token"];

  if (accessToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || "",
    });
  }
}

// Weekly Secret Reaction Helper
const SECRET_REACTIONS = [
  { emoji: "🥲", key: "humbled" },
  { emoji: "🫨", key: "shaken" },
  { emoji: "🤖", key: "betrayed" },
  { emoji: "🧂", key: "salty" },
  { emoji: "🪞", key: "mirrored" },
  { emoji: "🚬", key: "cigarette_break" },
];

function getActiveSecretReaction() {
  const MS_PER_WEEK = 604800000;
  const TUESDAY_OFFSET = 5 * 24 * 60 * 60 * 1000; // Jan 6, 1970 was a Tuesday
  const now = Date.now();
  const shiftedTime = now - TUESDAY_OFFSET;
  const weekBucket = Math.floor(shiftedTime / MS_PER_WEEK);
  const index = ((weekBucket % SECRET_REACTIONS.length) + SECRET_REACTIONS.length) % SECRET_REACTIONS.length;
  return SECRET_REACTIONS[index];
}

function mapPostFromDb(p: any) {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    tool: p.tool,
    vibe: p.vibe || undefined,
    verdict: p.verdict,
    plea: p.plea || undefined,
    aiDefense: p.ai_defense || undefined,
    memeUrl: p.meme_url || undefined,
    crimeSceneImage: p.crime_scene_image || undefined,
    aiDefenseImage: p.ai_defense_image || undefined,
    author: p.author,
    authorSessionId: p.author_session_id || undefined,
    reactions: p.reactions || {},
    court: p.court || { ai_wrong: 0, skill_issue: 0 },
    hidden: p.hidden || false,
    createdAt: new Date(p.created_at).getTime(),
    status: p.verdict === "solved" ? "solved" : "broken",
  };
}

function mapCommentFromDb(c: any) {
  return {
    id: c.id,
    postId: c.post_id,
    body: c.body,
    author: c.author,
    createdAt: new Date(c.created_at).getTime(),
  };
}

export const createPostFn = createServerFn({ method: "POST" })
  .inputValidator(PostInputSchema)
  .handler(async ({ data: input }) => {
    try {
      await authenticateServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("no session found. something went wrong.");
      }
      const sessionId = session.user.id;

      // server-side validation
      const { title, body, tool, aiDefense, crimeSceneImage, aiDefenseImage } = input;
      if (!title || title.trim().length === 0 || title.length > 140) {
        throw new Error("ur input is cooked. fix it.");
      }
      if (!body || body.trim().length === 0 || body.length > 500) {
        throw new Error("ur input is cooked. fix it.");
      }
      const tools = ["cursor", "chatgpt", "claude", "copilot", "gemini", "other"];
      if (!tool || !tools.includes(tool)) {
        throw new Error("ur input is cooked. fix it.");
      }
      if (aiDefense && aiDefense.length > 280) {
        throw new Error("ur input is cooked. fix it.");
      }
      const trimmedBody = body.trim();
      if (/^(.)\1+$/.test(trimmedBody)) {
        throw new Error("ur input is cooked. fix it.");
      }
      const httpCount = (body.match(/http/gi) || []).length;
      if (httpCount > 3) {
        throw new Error("ur input is cooked. fix it.");
      }

      // rate limit check
      await checkRateLimit(sessionId, "post", 5);

      const anonHandle = "anon-" + sessionId.slice(0, 4);
      const id = crypto.randomUUID();

      const { error } = await supabase.from("posts").insert({
        id,
        title: title.trim(),
        body: body.trim(),
        tool: tool,
        vibe: input.vibe ?? null,
        verdict: input.verdict ?? "still_broken",
        plea: input.plea ?? null,
        ai_defense: aiDefense ?? null,
        meme_url: input.memeUrl ?? null,
        crime_scene_image: crimeSceneImage ?? null,
        ai_defense_image: aiDefenseImage ?? null,
        author: anonHandle,
        author_session_id: sessionId,
        reactions: { cooked: 0, relatable: 0, segfault: 0, skill_issue: 0, rip_repo: 0, cursed: 0, samehere: 0 },
        court: { ai_wrong: 0, skill_issue: 0 },
        hidden: false,
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: created, error: selectError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (selectError || !created) {
        throw new Error("server error");
      }

      return mapPostFromDb(created);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("slow down") || msg.includes("posting too fast")) {
        return { error: "slow down. ur posting too fast. take a walk." };
      }
      if (msg.includes("cooked") || msg.includes("validation") || msg.includes("trim")) {
        return { error: "ur input is cooked. fix it." };
      }
      if (msg.includes("no session found") || msg.includes("something went wrong")) {
        return { error: "no session found. something went wrong." };
      }
      return { error: "the server is going through it. try again." };
    }
  });

export const toggleReactionFn = createServerFn({ method: "POST" })
  .inputValidator(ReactionInputSchema)
  .handler(async ({ data: { postId, reactionKey } }) => {
    try {
      await authenticateServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("no session found. something went wrong.");
      }
      const sessionId = session.user.id;

      // rate limit check
      await checkRateLimit(sessionId, "react", 150);

      const secretKey = getActiveSecretReaction().key;
      const allowedReactions = ["cooked", "relatable", "segfault", "skill_issue", "rip_repo", "cursed", "samehere", secretKey];
      if (!allowedReactions.includes(reactionKey)) {
        throw new Error("ur input is cooked. fix it.");
      }

      const { data: existingReaction } = await supabase
        .from("reaction_logs")
        .select("*")
        .eq("post_id", postId)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existingReaction) {
        const prevKey = existingReaction.reaction_key;

        // Delete the existing reaction from logs
        await supabase
          .from("reaction_logs")
          .delete()
          .eq("id", existingReaction.id);

        const { data: post } = await supabase
          .from("posts")
          .select("reactions")
          .eq("id", postId)
          .single();

        if (!post) {
          throw new Error("this confession got nuked.");
        }

        const reactions = { ...(post.reactions || {}) };
        reactions[prevKey] = Math.max(0, (reactions[prevKey] || 0) - 1);

        if (prevKey === reactionKey) {
          // Toggled OFF same reaction
          await supabase
            .from("posts")
            .update({ reactions })
            .eq("id", postId);

          return { reactionKey, newCount: reactions[reactionKey], active: false };
        } else {
          // Switch to new reaction
          await supabase
            .from("reaction_logs")
            .insert({
              post_id: postId,
              session_id: sessionId,
              reaction_key: reactionKey,
            });

          reactions[reactionKey] = (reactions[reactionKey] || 0) + 1;

          await supabase
            .from("posts")
            .update({ reactions })
            .eq("id", postId);

          return { reactionKey, newCount: reactions[reactionKey], active: true };
        }
      } else {
        // Toggle ON first reaction
        await supabase
          .from("reaction_logs")
          .insert({
            post_id: postId,
            session_id: sessionId,
            reaction_key: reactionKey,
          });

        const { data: post } = await supabase
          .from("posts")
          .select("reactions")
          .eq("id", postId)
          .single();

        if (!post) {
          throw new Error("this confession got nuked.");
        }

        const reactions = { ...(post.reactions || {}) };
        reactions[reactionKey] = (reactions[reactionKey] || 0) + 1;

        await supabase
          .from("posts")
          .update({ reactions })
          .eq("id", postId);

        return { reactionKey, newCount: reactions[reactionKey], active: true };
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("slow down") || msg.includes("posting too fast")) {
        return { error: "slow down. ur posting too fast. take a walk." };
      }
      if (msg.includes("cooked") || msg.includes("validation")) {
        return { error: "ur input is cooked. fix it." };
      }
      if (msg.includes("nuked") || msg.includes("not found")) {
        return { error: "this confession got nuked." };
      }
      if (msg.includes("not ur post") || msg.includes("wrong session")) {
        return { error: "not ur post bestie." };
      }
      return { error: "the server is going through it. try again." };
    }
  });

export const voteCourtFn = createServerFn({ method: "POST" })
  .inputValidator(VoteInputSchema)
  .handler(async ({ data: { postId, verdict } }) => {
    try {
      await authenticateServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("no session found. something went wrong.");
      }
      const sessionId = session.user.id;

      // rate limit check
      await checkRateLimit(sessionId, "vote", 50);

      await supabase.from("court_votes").upsert(
        {
          post_id: postId,
          session_id: sessionId,
          verdict,
        },
        { onConflict: "post_id,session_id" }
      );

      const { data: votes } = await supabase
        .from("court_votes")
        .select("verdict")
        .eq("post_id", postId);

      const votesList = votes || [];
      const aiWrong = votesList.filter((v: any) => v.verdict === "ai_wrong").length;
      const skillIssue = votesList.filter((v: any) => v.verdict === "skill_issue").length;
      const total = aiWrong + skillIssue;

      await supabase
        .from("posts")
        .update({
          court: { ai_wrong: aiWrong, skill_issue: skillIssue },
        })
        .eq("id", postId);

      return {
        aiWrongPct: total > 0 ? Math.round((aiWrong / total) * 100) : 0,
        skillIssuePct: total > 0 ? Math.round((skillIssue / total) * 100) : 0,
        total,
        userVote: verdict,
      };
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("slow down") || msg.includes("posting too fast")) {
        return { error: "slow down. ur posting too fast. take a walk." };
      }
      if (msg.includes("cooked") || msg.includes("validation")) {
        return { error: "ur input is cooked. fix it." };
      }
      if (msg.includes("nuked") || msg.includes("not found")) {
        return { error: "this confession got nuked." };
      }
      if (msg.includes("not ur post") || msg.includes("wrong session")) {
        return { error: "not ur post bestie." };
      }
      return { error: "the server is going through it. try again." };
    }
  });

export const createCommentFn = createServerFn({ method: "POST" })
  .inputValidator(CommentInputSchema)
  .handler(async ({ data: { postId, body } }) => {
    try {
      await authenticateServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("no session found. something went wrong.");
      }
      const sessionId = session.user.id;

      // rate limit check
      await checkRateLimit(sessionId, "comment", 50);

      // validation
      if (!body || body.length < 1 || body.length > 500 || body.trim().length === 0) {
        throw new Error("ur input is cooked. fix it.");
      }

      const anonHandle = "anon-" + sessionId.slice(0, 4);
      const commentId = crypto.randomUUID();

      const { error } = await supabase.from("comments").insert({
        id: commentId,
        post_id: postId,
        body: body.trim(),
        author: anonHandle,
        author_session_id: sessionId,
        hidden: false,
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: created, error: selectError } = await supabase
        .from("comments")
        .select("*")
        .eq("id", commentId)
        .single();

      if (selectError || !created) {
        throw new Error("server error");
      }

      return mapCommentFromDb(created);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("slow down") || msg.includes("posting too fast")) {
        return { error: "slow down. ur posting too fast. take a walk." };
      }
      if (msg.includes("cooked") || msg.includes("validation") || msg.includes("trim")) {
        return { error: "ur input is cooked. fix it." };
      }
      if (msg.includes("nuked") || msg.includes("not found")) {
        return { error: "this confession got nuked." };
      }
      if (msg.includes("not ur post") || msg.includes("wrong session")) {
        return { error: "not ur post bestie." };
      }
      return { error: "the server is going through it. try again." };
    }
  });
