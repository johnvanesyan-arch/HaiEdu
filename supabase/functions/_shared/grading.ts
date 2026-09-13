import type { AnswerKey, GradeResult, StudentResponse } from "./types.ts";

type UnitDef = { dimension: string; toCanonical: number };

const UNIT_REGISTRY: Record<string, UnitDef> = {
  m: { dimension: "length", toCanonical: 1 },
  km: { dimension: "length", toCanonical: 1000 },
  cm: { dimension: "length", toCanonical: 0.01 },
  mm: { dimension: "length", toCanonical: 0.001 },
  s: { dimension: "time", toCanonical: 1 },
  min: { dimension: "time", toCanonical: 60 },
  h: { dimension: "time", toCanonical: 3600 },
  kg: { dimension: "mass", toCanonical: 1 },
  g: { dimension: "mass", toCanonical: 0.001 },
  "m/s": { dimension: "speed", toCanonical: 1 },
  "km/h": { dimension: "speed", toCanonical: 1000 / 3600 },
  "cm/s": { dimension: "speed", toCanonical: 0.01 },
  N: { dimension: "force", toCanonical: 1 }
};

function normalizeString(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (normalized === "") return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function withinTolerance(actual: number, expected: number, tolerance = 1e-9): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function convertUnit(value: number, from: string, to: string): number | null {
  const fromDef = UNIT_REGISTRY[from];
  const toDef = UNIT_REGISTRY[to];
  if (!fromDef || !toDef || fromDef.dimension !== toDef.dimension) return null;
  const canonicalValue = value * fromDef.toCanonical;
  return canonicalValue / toDef.toCanonical;
}

export function gradeAnswer(key: AnswerKey, response: StudentResponse): GradeResult {
  switch (key.type) {
    case "single_choice": {
      const correct = normalizeString(response.value) === normalizeString(key.answer);
      return { correct, score: correct ? 1 : 0, errorCode: correct ? null : "incorrect_choice" };
    }
    case "true_false": {
      const expectedRaw = typeof key.answer === "boolean" ? String(key.answer) : normalizeString(key.answer);
      const actualRaw = typeof response.value === "boolean" ? String(response.value) : normalizeString(response.value);
      if (!["true", "false"].includes(expectedRaw)) throw new Error("Invalid true/false answer key");
      if (!["true", "false"].includes(actualRaw)) return { correct: false, score: 0, errorCode: "invalid_boolean" };
      const correct = actualRaw === expectedRaw;
      return { correct, score: correct ? 1 : 0, errorCode: correct ? null : "incorrect_boolean" };
    }
    case "numeric": {
      const actual = numeric(response.value);
      const expected = numeric(key.answer);
      if (actual === null) return { correct: false, score: 0, errorCode: "invalid_number" };
      if (expected === null) throw new Error("Invalid numeric answer key");
      const correct = withinTolerance(actual, expected, key.tolerance ?? 1e-9);
      return { correct, score: correct ? 1 : 0, errorCode: correct ? null : "incorrect_value", normalizedResponse: actual };
    }
    case "quantity": {
      const actual = numeric(response.value);
      const expected = numeric(key.answer);
      const unit = response.unit?.trim();
      const canonicalUnit = key.canonicalUnit?.trim();
      if (actual === null) return { correct: false, score: 0, errorCode: "invalid_number" };
      if (expected === null || !canonicalUnit) throw new Error("Invalid quantity answer key");
      if (!unit) return { correct: false, score: 0, errorCode: "missing_unit" };
      const acceptedUnits = new Set([canonicalUnit, ...(key.acceptedUnits ?? [])]);
      if (!acceptedUnits.has(unit)) return { correct: false, score: 0, errorCode: "unsupported_unit" };
      const converted = convertUnit(actual, unit, canonicalUnit);
      if (converted === null) return { correct: false, score: 0, errorCode: "incompatible_unit" };
      const correct = withinTolerance(converted, expected, key.tolerance ?? 1e-9);
      return {
        correct,
        score: correct ? 1 : 0,
        errorCode: correct ? null : "incorrect_value",
        normalizedResponse: { value: converted, unit: canonicalUnit }
      };
    }
    default: {
      const neverType: never = key.type;
      throw new Error(`Unsupported item type: ${neverType}`);
    }
  }
}
