import { pipeline, env } from "../lib/transformers.min.js";

env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder = null;
let isLoading = false;
const loadQueue = [];

async function getEmbedder() {
  if (embedder) return embedder;
  if (isLoading) {
    return new Promise((resolve, reject) => {
      loadQueue.push({ resolve, reject });
    });
  }

  isLoading = true;
  try {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "q8",
    });
    isLoading = false;
    for (const q of loadQueue) q.resolve(embedder);
    loadQueue.length = 0;
    return embedder;
  } catch (e) {
    isLoading = false;
    for (const q of loadQueue) q.reject(e);
    loadQueue.length = 0;
    throw e;
  }
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "ML_MATCH_FIELDS_EXEC") return;

  (async () => {
    try {
      const model = await getEmbedder();
      const { queryLabels, profileLabels, threshold = 0.45 } = msg;
      const profileKeys = Object.keys(profileLabels);
      const profileTexts = profileKeys.map((k) => profileLabels[k]);

      const allTexts = queryLabels.concat(profileTexts);
      const output = await model(allTexts, { pooling: "mean", normalize: true });

      const embeddings = [];
      for (let i = 0; i < allTexts.length; i++) {
        embeddings.push(Array.from(output[i].data));
      }

      const qEmb = embeddings.slice(0, queryLabels.length);
      const pEmb = embeddings.slice(queryLabels.length);

      const results = [];
      for (let q = 0; q < qEmb.length; q++) {
        let bestKey = null;
        let bestScore = -1;
        for (let p = 0; p < pEmb.length; p++) {
          const s = cosineSim(qEmb[q], pEmb[p]);
          if (s > bestScore) {
            bestScore = s;
            bestKey = profileKeys[p];
          }
        }
        results.push(bestScore >= threshold ? { matchedKey: bestKey, score: bestScore } : null);
      }

      sendResponse(results);
    } catch (e) {
      console.error("[LinkedOut ML]", e);
      sendResponse([]);
    }
  })();

  return true;
});
