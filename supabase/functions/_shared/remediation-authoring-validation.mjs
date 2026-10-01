export function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function mergeReferenceMetadata(currentValue, incomingValue) {
  const current = plainObject(currentValue);
  const incoming = plainObject(incomingValue);
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    // Older editor bundles submitted empty modern source fields for governed
    // records that used canonical textbook/programme provenance. Do not invent
    // those empty keys or erase the canonical evidence.
    if (typeof value === "string" && !value.trim() && !(key in current)) continue;
    merged[key] = value;
  }
  return merged;
}

export function referenceMetadataPresentation(value) {
  const source = plainObject(value);
  return {
    sourceTitle: String(source.sourceTitle ?? "").trim(),
    sourceLocator: String(source.sourceLocator ?? source.textbookLocator ?? source.programmeOutcomeLocator ?? "").trim(),
    sourceUrl: String(source.sourceUrl ?? "").trim(),
    notes: String(source.notes ?? "").trim(),
    textbookLocator: String(source.textbookLocator ?? "").trim(),
    textbookSha256: String(source.textbookSha256 ?? "").trim(),
    programmeOutcomeLocator: String(source.programmeOutcomeLocator ?? "").trim(),
  };
}

export function strings(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))]
    : [];
}

export function placeholderKeys(value) {
  const keys = [];
  const invalid = [];
  for (const match of String(value ?? "").matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
    const key = String(match[1] ?? "").trim();
    if (/^[A-Za-z0-9_]+$/.test(key)) keys.push(key);
    else invalid.push(key);
  }
  return { keys: [...new Set(keys)], invalid: [...new Set(invalid)] };
}

export function renderRawTemplate(value, allowedKeys, params) {
  const allowed = new Set(allowedKeys);
  return String(value ?? "").replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, key) => {
    if (!allowed.has(key)) return match;
    const raw = params[key];
    return typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
      ? String(raw)
      : match;
  });
}

function normalizeNumber(value) {
  const normalized = String(value).replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? String(number) : normalized;
}

function numericLiterals(value) {
  return [...String(value ?? "").matchAll(/[+-]?\d+(?:[.,]\d+)?/g)]
    .map((match) => normalizeNumber(match[0]));
}

function normalizedTokens(value) {
  return String(value ?? "")
    .toLocaleLowerCase("hy")
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length >= 3) ?? [];
}

export function tokenSimilarity(left, right) {
  const a = new Set(normalizedTokens(left));
  const b = new Set(normalizedTokens(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function hasObviousAnswerLeakage(value) {
  const text = String(value ?? "");
  const directAnswer = /(ճիշտ\s+պատասխան(?:ը|ն)|պատասխան(?:ը|ն)\s+է|վերջնական\s+պատասխան|correct\s+answer|answer\s+is)/iu;
  const optionAnswer = /(?:ընտրիր|նշիր|ճիշտ(?:ն|ը)?|պատասխան(?:ը|ն)?)[^։.!?\n]{0,32}(?:տարբերակ\s*)?[ԱԲԳԴA-D](?:\b|\s|[։.!?])/iu;
  const numericConclusion = /(?:կստանանք|արդյունք(?:ը|ն)?|պատասխան(?:ը|ն)?|հավասար\s+է|=)\s*[+-]?\d+(?:[.,]\d+)?/iu;
  return directAnswer.test(text) || optionAnswer.test(text) || numericConclusion.test(text);
}

function urlLooksSafe(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateGuideContent(scope, content, referenceMetadata, variant) {
  const errors = [];
  const warnings = [];
  const required = ["titleHy", "strategyHy", "hint1Hy", "hint2Hy", "workedExampleHy"];
  for (const field of required) {
    if (String(content[field] ?? "").trim().length < 3) errors.push(`missing_${field}`);
  }
  if (scope === "skill" && !String(content.misconceptionCode ?? "").trim()) {
    errors.push("misconception_code_required");
  }

  const fields = required.map((field) => String(content[field] ?? ""));
  const parsed = placeholderKeys(fields.join("\n"));
  if (parsed.invalid.length) errors.push("invalid_placeholder_syntax");
  const allowed = strings(content.allowedParameterKeys);
  const allowedSet = new Set(allowed);
  const forbiddenNames = /(^|_)(answer|correct|solution|result|expected|resolved)($|_)/i;

  if (scope === "skill" && parsed.keys.length) errors.push("skill_guide_placeholders_not_allowed");
  if (scope === "template") {
    for (const key of parsed.keys) {
      if (!allowedSet.has(key)) errors.push(`placeholder_not_allowed:${key}`);
      if (forbiddenNames.test(key)) errors.push(`answer_like_placeholder_forbidden:${key}`);
    }
    for (const key of allowed) {
      if (!/^[A-Za-z0-9_]+$/.test(key)) errors.push(`invalid_allowed_parameter:${key}`);
      if (forbiddenNames.test(key)) errors.push(`answer_like_parameter_forbidden:${key}`);
    }
  }

  const params = plainObject(variant?.variant_parameters);
  if (variant) {
    for (const key of parsed.keys) {
      if (!(key in params)) errors.push(`variant_parameter_missing:${key}`);
    }

    const prompt = String(variant.prompt_hy ?? "").trim();
    const workedSource = String(content.workedExampleHy ?? "");
    const renderedWorked = renderRawTemplate(workedSource, allowed, params).trim();
    const workedKeys = new Set(placeholderKeys(workedSource).keys);
    const promptNumbers = new Set(numericLiterals(prompt));
    const workedNumbers = new Set(numericLiterals(renderedWorked));

    for (const key of workedKeys) {
      if (typeof params[key] === "number") errors.push(`worked_example_reuses_live_numeric_value:${key}`);
    }
    for (const [key, raw] of Object.entries(params)) {
      if (typeof raw !== "number") continue;
      const normalized = normalizeNumber(raw);
      if (promptNumbers.has(normalized) && workedNumbers.has(normalized)) {
        errors.push(`worked_example_reuses_live_numeric_value:${key}`);
      }
    }

    const hasNumericVariation = promptNumbers.size > 0
      && workedNumbers.size > 0
      && [...promptNumbers].some((value) => !workedNumbers.has(value));
    if (prompt && renderedWorked && prompt.normalize("NFKC") === renderedWorked.normalize("NFKC")) {
      errors.push("worked_example_duplicates_live_item");
    } else if (prompt && renderedWorked && !hasNumericVariation
      && normalizedTokens(prompt).length >= 6 && tokenSimilarity(prompt, renderedWorked) >= 0.78) {
      errors.push("worked_example_too_similar_to_live_item");
    }
  } else {
    warnings.push("preview_variant_missing");
  }

  if (hasObviousAnswerLeakage(content.hint1Hy)) errors.push("hint_1_obvious_answer_leakage");
  if (hasObviousAnswerLeakage(content.hint2Hy)) errors.push("hint_2_obvious_answer_leakage");

  const references = referenceMetadataPresentation(referenceMetadata);
  const hasGovernedTextbookProvenance = Boolean(references.textbookLocator && references.textbookSha256);
  if (!references.sourceTitle && !hasGovernedTextbookProvenance) warnings.push("source_title_missing");
  if (!references.sourceLocator && !references.textbookLocator && !references.programmeOutcomeLocator) {
    warnings.push("source_locator_missing");
  }
  if (!references.sourceUrl && !references.textbookSha256) warnings.push("source_url_missing");
  else if (references.sourceUrl && !urlLooksSafe(references.sourceUrl)) warnings.push("source_url_invalid");

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    placeholders: parsed.keys,
  };
}
