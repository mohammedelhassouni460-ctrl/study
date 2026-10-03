/**
 * Local stand-in for the Anthropic Messages API and the Voyage embeddings API,
 * used by E2E tests so the full AI flows run without real API keys.
 *   ANTHROPIC_BASE_URL=http://127.0.0.1:4010  VOYAGE_BASE_URL=http://127.0.0.1:4010/voyage
 * It inspects the requested JSON schema to decide what to return.
 */
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.AI_MOCK_PORT ?? 4010);

const TOPICS = ["Élasticité-prix de la demande", "Élasticité-revenu", "Élasticité croisée", "Les externalités"];

function summary() {
  return {
    title: "L'élasticité et les externalités",
    overview: "L'élasticité mesure la sensibilité de la demande au prix, au revenu ou au prix d'autres biens. Les externalités sont des effets non compensés par le marché.",
    keyConcepts: [
      { name: "Élasticité-prix", explanation: "Variation relative de la quantité demandée suite à une variation relative du prix." },
      { name: "Externalité négative", explanation: "Coût imposé à un tiers sans compensation, comme la pollution." },
    ],
    definitions: [{ term: "Bien inférieur", definition: "Bien dont la demande baisse quand le revenu augmente." }],
    formulas: [
      {
        name: "Élasticité-prix de la demande",
        formula: "Ep = (% variation quantité) / (% variation prix)",
        interpretation: "|Ep| > 1 → demande élastique\n|Ep| < 1 → demande inélastique",
      },
    ],
    importantPoints: ["Une taxe pigouvienne corrige une externalité négative.", "Théorème de Coase : négociation privée efficace si coûts de transaction faibles."],
    examples: [{ title: "Calcul", content: "Prix +10 %, quantité -20 % → Ep = -2 : demande élastique." }],
  };
}

function countFrom(prompt, fallback) {
  const match = prompt.match(/exactement (\d+)/);
  return match ? Number(match[1]) : fallback;
}

function flashcards(prompt) {
  const n = countFrom(prompt, 10);
  return {
    flashcards: Array.from({ length: n }, (_, i) => ({
      question: i === 0 ? "Qu'est-ce que l'élasticité-prix de la demande ?" : `Question de révision n°${i + 1} sur ${TOPICS[i % TOPICS.length]} ?`,
      answer: i === 0 ? "La variation relative de la demande résultant d'une variation relative du prix." : `Réponse n°${i + 1}.`,
      difficulty: ["easy", "medium", "hard"][i % 3],
      topic: TOPICS[i % TOPICS.length],
    })),
  };
}

function quiz(prompt) {
  const n = countFrom(prompt, 5);
  return {
    title: "QCM — Élasticité et externalités",
    questions: Array.from({ length: n }, (_, i) =>
      i === 0
        ? {
            question: "Si le prix d'un bien augmente de 10 % et que la demande baisse de 20 %, quelle est son élasticité ?",
            choices: ["-0,5", "-1", "-2", "2"],
            correctAnswer: 2,
            explanation: "Ep = -20 / 10 = -2. La demande est donc élastique.",
            topic: TOPICS[0],
          }
        : {
            question: `Question ${i + 1} : quelle proposition est correcte ?`,
            choices: ["Proposition A", "Proposition B", "Proposition C", "Proposition D"],
            correctAnswer: i % 4,
            explanation: `La bonne réponse est la proposition ${"ABCD"[i % 4]}.`,
            topic: TOPICS[i % TOPICS.length],
          },
    ),
  };
}

function structuredOutput(schema, prompt) {
  const keys = Object.keys(schema?.properties ?? {});
  if (keys.includes("topics")) return { topics: TOPICS.map((name) => ({ name, description: `Notion : ${name}.`, difficulty: "medium" })) };
  if (keys.includes("flashcards")) return flashcards(prompt);
  if (keys.includes("questions")) return quiz(prompt);
  return summary();
}

function chatAnswer(body) {
  const system = Array.isArray(body.system) ? body.system.map((b) => b.text).join("\n") : String(body.system ?? "");
  const last = body.messages.at(-1);
  const content = typeof last.content === "string" ? last.content : last.content.map((b) => b.text ?? "").join("\n");
  if (content.includes("<source")) {
    return "D'après ton cours, l'élasticité-prix de la demande mesure la variation relative de la quantité demandée suite à une variation du prix [1]. Si |Ep| > 1, la demande est élastique [1].";
  }
  return system.includes("Aucun extrait")
    ? "Je n'ai trouvé aucun passage pertinent dans tes documents. De manière générale…"
    : "Réponse générale.";
}

function sse(res, events) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  res.end();
}

function messageEvents(body, text) {
  const id = `msg_mock_${Date.now()}`;
  const pieces = text.match(/[\s\S]{1,40}/g) ?? [""];
  return [
    ["message_start", { type: "message_start", message: { id, type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
    ...pieces.map((p) => ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: p } }]),
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: Math.ceil(text.length / 4) } }],
    ["message_stop", { type: "message_stop" }],
  ];
}

function fakeEmbedding(text) {
  // Deterministic 1024-d vector from word hashes: texts sharing words are close.
  const v = new Array(1024).fill(0);
  for (const word of text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{4,}/g) ?? []) {
    const h = createHash("md5").update(word.slice(0, 7)).digest();
    v[h.readUInt16BE(0) % 1024] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Emails "sent" through the fake Resend API, inspectable by tests. */
const sentEmails = [];

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : {};
    if (req.url === "/health") {
      res.writeHead(200).end("ok");
      return;
    }
    if (req.url === "/resend/emails" && req.method === "POST") {
      sentEmails.push(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: `email_mock_${sentEmails.length}` }));
      return;
    }
    if (req.url?.startsWith("/resend/_sent")) {
      const to = new URL(req.url, "http://x").searchParams.get("to");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(sentEmails.filter((e) => !to || [].concat(e.to).includes(to))));
      return;
    }
    if (req.url?.startsWith("/voyage/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: body.input.map((t, index) => ({ embedding: fakeEmbedding(t), index })), usage: { total_tokens: 10 } }));
      return;
    }
    if (req.url?.startsWith("/v1/messages")) {
      const prompt = typeof body.messages?.[0]?.content === "string" ? body.messages[0].content : "";
      const schema = body.output_config?.format?.schema;
      const text = schema ? JSON.stringify(structuredOutput(schema, prompt)) : chatAnswer(body);
      if (body.stream) return sse(res, messageEvents(body, text));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "msg_mock", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 1200, output_tokens: 300 } }));
      return;
    }
    res.writeHead(404).end();
  });
}).listen(PORT, "127.0.0.1", () => console.log(`AI mock listening on ${PORT}`));
