/**
 * Row Level Security: proves that a user can never read or modify another
 * user's data through the public API (anon key + their own session), and that
 * billing/usage tables and quiz answers are server-only.
 */
import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

function readEnv(): Record<string, string> {
  const out: Record<string, string> = { ...(process.env as Record<string, string>) };
  const file = path.join(__dirname, "..", "..", ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !out[m[1]]) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

const env = readEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "rls-test-password-123";

const admin = createClient<Database>(URL, SERVICE, { auth: { persistSession: false } });

async function makeUser(label: string) {
  const email = `rls-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@studyos.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

let alice: { id: string; client: SupabaseClient<Database> };
let bob: { id: string; client: SupabaseClient<Database> };
let subjectId: string;
let topicId: string;
let quizId: string;
const filePath = () => `${alice.id}/rls/secret.txt`;

beforeAll(async () => {
  alice = await makeUser("alice");
  bob = await makeUser("bob");

  const { data: subject, error } = await alice.client
    .from("subjects")
    .insert({ user_id: alice.id, name: "Secret d'Alice" })
    .select("id")
    .single();
  if (error) throw error;
  subjectId = subject.id;

  const { data: topic } = await alice.client
    .from("topics")
    .insert({ user_id: alice.id, subject_id: subjectId, name: "Concept privé" })
    .select("id")
    .single();
  topicId = topic!.id;

  await alice.client.from("chat_messages").insert({ user_id: alice.id, subject_id: subjectId, role: "user", content: "message privé" });

  const { data: quiz } = await alice.client
    .from("quizzes")
    .insert({ user_id: alice.id, subject_id: subjectId, title: "Quiz", difficulty: "easy", question_count: 1 })
    .select("id")
    .single();
  quizId = quiz!.id;
  await admin.from("quiz_questions").insert({
    user_id: alice.id,
    quiz_id: quizId,
    position: 0,
    question: "Q ?",
    choices: ["a", "b"],
    correct_answer: 1,
    explanation: "secret",
  });

  await alice.client.storage.from("documents").upload(filePath(), new Blob(["secret"], { type: "text/plain" }));
});

afterAll(async () => {
  for (const user of [alice, bob]) if (user) await admin.auth.admin.deleteUser(user.id);
});

describe("data isolation between users", () => {
  it("Bob cannot read Alice's rows", async () => {
    for (const table of ["subjects", "topics", "chat_messages", "quizzes", "quiz_questions"] as const) {
      const { data, error } = await bob.client.from(table).select("id");
      expect(error, table).toBeNull();
      expect(data, table).toEqual([]);
    }
    const { data: profiles } = await bob.client.from("profiles").select("id");
    expect(profiles?.map((p) => p.id)).toEqual([bob.id]);
  });

  it("Bob cannot update or delete Alice's rows", async () => {
    const { data: updated } = await bob.client.from("subjects").update({ name: "piraté" }).eq("id", subjectId).select();
    expect(updated).toEqual([]);
    const { data: deleted } = await bob.client.from("topics").delete().eq("id", topicId).select();
    expect(deleted).toEqual([]);
    const { data: still } = await alice.client.from("subjects").select("name").eq("id", subjectId).single();
    expect(still?.name).toBe("Secret d'Alice");
  });

  it("Bob cannot write rows in Alice's name or attach to her subject", async () => {
    const asAlice = await bob.client.from("subjects").insert({ user_id: alice.id, name: "usurpation" });
    expect(asAlice.error).not.toBeNull();
    // Composite foreign keys: own user_id but someone else's subject.
    const crossLink = await bob.client.from("topics").insert({ user_id: bob.id, subject_id: subjectId, name: "intrus" });
    expect(crossLink.error).not.toBeNull();
  });

  it("RAG search functions only return the caller's chunks", async () => {
    const { data } = await bob.client.rpc("search_document_chunks", { query_text: "secret", p_subject_id: subjectId });
    expect(data).toEqual([]);
  });

  it("Bob cannot download Alice's files", async () => {
    const own = await alice.client.storage.from("documents").download(filePath());
    expect(own.error).toBeNull();
    const other = await bob.client.storage.from("documents").download(filePath());
    expect(other.error).not.toBeNull();
    const upload = await bob.client.storage.from("documents").upload(`${alice.id}/rls/evil.txt`, new Blob(["x"]));
    expect(upload.error).not.toBeNull();
  });
});

describe("server-only data", () => {
  it("quiz answers are hidden even from their owner", async () => {
    const { error } = await alice.client.from("quiz_questions").select("correct_answer").eq("quiz_id", quizId);
    expect(error).not.toBeNull();
    const { data } = await alice.client.from("quiz_questions").select("id, question, choices").eq("quiz_id", quizId);
    expect(data).toHaveLength(1);
  });

  it("users cannot grant themselves Pro or erase their AI usage", async () => {
    const sub = await alice.client.from("subscriptions").insert({ user_id: alice.id, status: "active" });
    expect(sub.error).not.toBeNull();
    const usage = await alice.client.from("ai_usage").insert({ user_id: alice.id, action: "chat", credits: -1000 });
    expect(usage.error).not.toBeNull();
    const reserve = await alice.client.rpc("reserve_ai_credits", {
      p_user_id: alice.id,
      p_action: "chat",
      p_credits: 1,
      p_limit: 100,
      p_since: new Date(0).toISOString(),
    });
    expect(reserve.error).not.toBeNull();
  });

  it("anonymous visitors see nothing", async () => {
    const anon = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
    const { data, error } = await anon.from("subjects").select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});
