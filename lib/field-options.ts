import { FieldType } from "@prisma/client";

export const DEFAULT_LIKERT_SCALE = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
];

export function parseFieldOptions(fieldType: FieldType, formData: FormData) {
  if (fieldType === "LIKERT") {
    const scaleRaw = (formData.get("options") as string ?? "").trim();
    const rowsRaw = (formData.get("rows") as string ?? "").trim();
    const scale = scaleRaw
      ? scaleRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_LIKERT_SCALE;
    const rows = rowsRaw
      ? rowsRaw.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
    return { scale, rows };
  }
  if (
    fieldType === "SELECT" ||
    fieldType === "RADIO" ||
    fieldType === "MULTISELECT"
  ) {
    const raw = (formData.get("options") as string | null)?.trim();
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : null;
  }
  return null;
}
