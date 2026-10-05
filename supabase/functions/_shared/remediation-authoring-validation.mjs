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
  const firstNonBlank = (...values) => {
    for (const entry of values) {
      const text = String(entry ?? "").trim();
      if (text) return text;
    }
    return "";
  };
  return {
    sourceTitle: firstNonBlank(source.sourceTitle),
    sourceLocator: firstNonBlank(source.sourceLocator, source.textbookLocator, source.programmeOutcomeLocator),
    sourceUrl: firstNonBlank(source.sourceUrl),
    notes: firstNonBlank(source.notes),
    textbookLocator: firstNonBlank(source.textbookLocator),
    textbookSha256: firstNonBlank(source.textbookSha256),
    programmeOutcomeLocator: firstNonBlank(source.programmeOutcomeLocator),
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

function normalizeText(value) {
  // Unicode default casing is deterministic and does not select a content
  // language or inherit the runtime locale. Labels are opaque governed data;
  // locale-specific equivalences require an explicit normalization contract.
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase();
}

function normalizedTokens(value) {
  return normalizeText(value)
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

function numberOccurrences(value) {
  const text = String(value ?? "");
  return [...text.matchAll(/[+-]?\d+(?:[.,]\d+)?/g)].map((match) => {
    const literal = /^[+-]/.test(match[0]) && /\d/.test(text[match.index - 1] ?? "")
      ? match[0].slice(1) : match[0];
    const marker = text.slice(match.index + match[0].length).match(/^\s*([\p{L}%°]+)/u)?.[1] ?? "";
    return { number: normalizeNumber(literal), marker: normalizeText(marker) };
  });
}

function reusesLiveInputs(value, variant) {
  if (!variant) return false;
  const prompt = numberOccurrences(variant.prompt_hy);
  const example = numberOccurrences(value);
  const rawNumbers = Object.values(plainObject(variant.variant_parameters))
    .filter((entry) => typeof entry === "number").map(normalizeNumber);
  const contextLabels = new Set(Object.values(plainObject(variant.variant_parameters))
    .filter((entry) => typeof entry === "string").map(normalizeText));
  const inputs = rawNumbers.length ? prompt.filter((entry) => rawNumbers.includes(entry.number))
    .map((entry) => ({ ...entry, marker: contextLabels.has(entry.marker) ? entry.marker : "" })) : prompt;
  if (!inputs.length) return false;
  // A shared operand or constant is not a copied task. All input values must
  // recur; adjacent quantity labels also distinguish, for example, hours from
  // minutes. No answer key, arithmetic evaluator or subject-specific units.
  return inputs.every((input) => {
    const matches = example.filter((entry) => entry.number === input.number);
    if (!matches.length) return false;
    const labelled = matches.filter((entry) => entry.marker);
    return !input.marker || !labelled.length || labelled.some((entry) => input.marker === entry.marker);
  });
}

function hasObviousAnswerLeakage(value, variant) {
  const text = String(value ?? "");
  const directAnswer = /(?<![\p{L}\p{N}_])(?:ճիշտ\s+պատասխան(?:ը|ն)|պատասխան(?:ը|ն)\s+է|վերջնական\s+պատասխան|correct\s+answer|answer\s+is)(?![\p{L}\p{N}_])/iu;
  const optionAnswer = /(?<![\p{L}\p{N}_])(?:ընտրիր|ընտրի՛ր|նշիր|նշի՛ր|ճիշտ(?:ն|ը)?|պատասխան(?:ը|ն)?)(?![\p{L}\p{N}_])[^։.!?\n]{0,32}(?<![\p{L}\p{N}_])[ԱԲԳԴA-D](?![\p{L}\p{N}_])/iu;
  const numericConclusion = /(?<![\p{L}\p{N}_])(?:կստանանք|արդյունք(?:ը|ն)?|պատասխան(?:ը|ն)?)(?![\p{L}\p{N}_])\s*(?:կլինի|է)?\s*[:՝—]?\s*[+-]?\d+(?:[.,]\d+)?/iu;
  if (directAnswer.test(text) || optionAnswer.test(text) || numericConclusion.test(text)) return true;
  // Bare numeric conclusions still fail. A quantity-to-quantity relationship
  // is allowed unless it supplies the active task's own input and result.
  for (const match of text.matchAll(/(?:=|հավասար\s+է)\s*[+-]?\d+(?:[.,]\d+)?/gu)) {
    const left = text.slice(0, match.index).match(/[+-]?\d+(?:[.,]\d+)?\s*[\p{L}%°]+\s*$/u);
    const right = text.slice(match.index + match[0].length).match(/^\s*[\p{L}%°]+/u);
    const calculation = text.slice(0, match.index).match(/[+-]?\d+(?:[.,]\d+)?(?:\s*[\p{L}%°]*\s*[×*÷/+−-]\s*[+-]?\d+(?:[.,]\d+)?)+\s*$/u);
    if ((!left || !right) && !calculation) return true;
    if (calculation && !variant) return true;
    const sentenceBoundary = /[։!?\n]|(?<!\d)\.|\.(?!\d)/;
    const clause = text.slice(0, match.index).split(sentenceBoundary).at(-1)
      + text.slice(match.index).split(sentenceBoundary)[0];
    if (reusesLiveInputs(clause, variant)) return true;
  }
  return false;
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
    if (reusesLiveInputs(renderedWorked, variant)) errors.push("worked_example_reuses_live_task");

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

  if (hasObviousAnswerLeakage(renderRawTemplate(content.hint1Hy, allowed, params), variant)) errors.push("hint_1_obvious_answer_leakage");
  if (hasObviousAnswerLeakage(renderRawTemplate(content.hint2Hy, allowed, params), variant)) errors.push("hint_2_obvious_answer_leakage");

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

export function validateGuideVariants(scope, content, referenceMetadata, variants) {
  const results = variants.length
    ? variants.map((variant) => ({ variant, validation: validateGuideContent(scope, content, referenceMetadata, variant) }))
    : [{ variant: null, validation: validateGuideContent(scope, content, referenceMetadata, null) }];
  return {
    errors: [...new Set(results.flatMap(({ validation }) => validation.errors))],
    warnings: [...new Set(results.flatMap(({ validation }) => validation.warnings))],
    placeholders: results[0].validation.placeholders,
    checkedVariantCount: variants.length,
    variantFailures: results.filter(({ variant, validation }) => variant && validation.errors.length)
      .map(({ variant, validation }) => ({ variantId: variant.id, itemCode: variant.code, errors: validation.errors })),
  };
}
