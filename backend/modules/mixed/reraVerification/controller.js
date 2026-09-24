const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// ── Gemini response schema ──────────────────────────────────────────────────
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    verified: {
      type: SchemaType.BOOLEAN,
      description: "Whether the RERA ID was found and is valid",
    },
    reason: {
      type: SchemaType.STRING,
      description: "Short explanation of validity or why it could not be verified",
    },
    project_details: {
      type: SchemaType.OBJECT,
      properties: {
        project_name: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Full project name",
        },
        developer_name: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Developer or promoter name",
        },
        locality_or_city: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Locality, area or city of the project",
        },
        state: {
          type: SchemaType.STRING,
          nullable: true,
          description: "State name",
        },
        project_type: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Type of project e.g. Residential, Commercial, Mixed",
        },
        completion_date: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Expected or actual completion date",
        },
        total_units: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Total number of units in the project",
        },
        status: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Project status e.g. Under Construction, Completed, Lapsed",
        },
        confidence: {
          type: SchemaType.STRING,
          enum: ["high", "low", "unknown"],
          description: "Confidence level of extracted details",
        },
      },
      required: [
        "project_name", "developer_name", "locality_or_city", "state",
        "project_type", "completion_date", "total_units", "status", "confidence",
      ],
    },
  },
  required: ["verified", "reason", "project_details"],
};

// ── Serper.dev search ───────────────────────────────────────────────────────
async function searchRera(reraId) {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: `"${reraId}"`,
      num: 5,
      gl: "in",
      hl: "en",
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data.organic || []).slice(0, 5);
}

// ── Fetch and extract plain text from a URL ─────────────────────────────────
async function fetchPageText(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RERAVerifier/1.0)",
        "Accept": "text/html",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Strip HTML tags, collapse whitespace, trim to 4000 chars
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    return text;
  } catch {
    return null;
  }
}

// ── runReraVerification — reusable internal function ────────────────────────
// Returns: { verified, reason, projectDetails, sources }
// Throws on unrecoverable errors (caller should handle).
async function runReraVerification(reraId) {
  const cleanId = reraId.trim();

  // Step 1 — Search for the exact RERA ID
  const organic = await searchRera(cleanId);

  if (organic.length === 0) {
    return {
      verified: false,
      reason: "No search results found for this RERA ID",
      projectDetails: null,
      sources: [],
    };
  }

  // Step 2 — Fetch full page content from top results (up to 3)
  const pageContents = await Promise.all(
    organic.slice(0, 3).map(async (r) => {
      const text = await fetchPageText(r.link);
      return {
        title:    r.title,
        snippet:  r.snippet,
        url:      r.link,
        pageText: text,
      };
    })
  );

  // Step 3 — Build context for Gemini
  const context = pageContents
    .map((r, i) => {
      const content = r.pageText
        ? `Page Content:\n${r.pageText}`
        : `Snippet: ${r.snippet}`;
      return `[Source ${i + 1}]\nTitle: ${r.title}\nURL: ${r.url}\n${content}`;
    })
    .join("\n\n---\n\n");

  // Step 4 — Ask Gemini to extract structured details
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const prompt = `You are a Real Estate Regulatory Authority (RERA) verification assistant for India.

=== RERA ID TO VERIFY ===
${cleanId}
========================

=== WEB PAGE CONTENT ===
${context}
========================

Extract all available details about the project registered under this exact RERA ID from the content above.
- Only extract information that is explicitly present in the content.
- If a field is not found, return null.
- Set verified to true only if the content clearly confirms this RERA ID belongs to a registered project.
- Set confidence to "high" if multiple sources confirm the same project, "low" if only one source partially matches, "unknown" if nothing reliable was found.`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());

  return {
    verified: parsed.verified,
    reason:   parsed.reason ?? "",
    projectDetails: {
      projectName:    parsed.project_details?.project_name    ?? null,
      developerName:  parsed.project_details?.developer_name  ?? null,
      localityOrCity: parsed.project_details?.locality_or_city ?? null,
      state:          parsed.project_details?.state           ?? null,
      projectType:    parsed.project_details?.project_type    ?? null,
      completionDate: parsed.project_details?.completion_date ?? null,
      totalUnits:     parsed.project_details?.total_units     ?? null,
      status:         parsed.project_details?.status          ?? null,
      confidence:     parsed.project_details?.confidence      ?? "unknown",
    },
    sources: pageContents.map((r) => r.url),
  };
}

// ── POST /api/mixed/rera/verify — Express route handler (thin wrapper) ──────
const verifyReraId = async (req, res) => {
  try {
    const { reraId } = req.body;

    if (!reraId || typeof reraId !== "string" || !reraId.trim()) {
      return res.status(400).json({ success: false, message: "reraId is required" });
    }

    const result = await runReraVerification(reraId);

    return res.json({
      success: true,
      reraId:  reraId.trim(),
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { verifyReraId, runReraVerification };
