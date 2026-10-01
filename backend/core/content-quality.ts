export type DifficultyBand = "foundation" | "core" | "challenge";
export type ReviewStatus = "unreviewed" | "needs_review" | "in_review" | "changes_requested" | "approved";

export function difficultyBand(difficulty: number): DifficultyBand {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw new Error("difficulty must be an integer from 1 to 5");
  }
  if (difficulty <= 1) return "foundation";
  if (difficulty <= 3) return "core";
  return "challenge";
}

export type QaInput = {
  itemType: "single_choice" | "true_false" | "numeric" | "quantity";
  prompt: string;
  difficulty: number;
  difficultyBand: string;
  optionKeys?: string[];
  answer: unknown;
  tolerance?: number | null;
  canonicalUnit?: string | null;
  acceptedUnits?: string[];
  sourceReference?: string | null;
  itemFamily?: string | null;
  reviewStatus?: ReviewStatus;
  validationState?: string;
  misconceptionCount?: number;
};

export function evaluateTechnicalQa(input: QaInput) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.prompt.trim()) errors.push("empty_prompt");
  if (!Number.isInteger(input.difficulty) || input.difficulty < 1 || input.difficulty > 5) errors.push("invalid_difficulty");
  else if (input.difficultyBand !== difficultyBand(input.difficulty)) errors.push("difficulty_band_mismatch");

  if (input.itemType === "single_choice") {
    const keys = input.optionKeys ?? [];
    if (keys.length < 2) errors.push("insufficient_options");
    if (typeof input.answer !== "string" || !keys.includes(input.answer)) errors.push("answer_not_in_options");
  } else if (input.itemType === "true_false") {
    if (typeof input.answer !== "boolean") errors.push("true_false_answer_not_boolean");
  } else if (input.itemType === "numeric") {
    if (typeof input.answer !== "number") errors.push("numeric_answer_not_number");
    if (input.tolerance === null || input.tolerance === undefined) errors.push("numeric_tolerance_missing");
  } else if (input.itemType === "quantity") {
    if (typeof input.answer !== "number") errors.push("numeric_answer_not_number");
    if (input.tolerance === null || input.tolerance === undefined) errors.push("numeric_tolerance_missing");
    if (!input.canonicalUnit || !(input.acceptedUnits?.length)) errors.push("quantity_unit_metadata_missing");
    else if (!input.acceptedUnits.includes(input.canonicalUnit)) warnings.push("canonical_unit_not_in_accepted_units");
  }

  if (!input.sourceReference) warnings.push("source_reference_missing");
  if (!input.itemFamily || input.itemFamily === "unspecified") warnings.push("item_family_unspecified");
  if (!input.misconceptionCount) warnings.push("misconception_mapping_missing");

  return { passed: errors.length === 0, errors, warnings };
}

export function canApproveItem(latestQaPassed: boolean, retired: boolean) {
  return latestQaPassed && !retired;
}

export function retirementReplacementIsValid(input: {
  itemId: string;
  itemSkillId: string;
  replacementId?: string | null;
  replacementSkillId?: string | null;
  replacementPublished?: boolean;
  replacementRetired?: boolean;
  replacementQaPassed?: boolean;
}) {
  if (!input.replacementId) return true;
  if (input.replacementId === input.itemId) return false;
  return input.replacementSkillId === input.itemSkillId
    && input.replacementPublished === true
    && input.replacementRetired !== true
    && input.replacementQaPassed === true;
}
