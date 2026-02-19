import { useState } from "react";

type ValidationResult = {
  valid: boolean;
  fileCount?: number;
  topEntries?: string[];
  resolvedPath?: string;
  error?: string;
};

export function useValidatePath() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function validate(cwd: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/agents/validate-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwd }),
      });
      const data: ValidationResult = await res.json();
      setResult(data);
      return data;
    } catch {
      const err: ValidationResult = { valid: false, error: "Request failed" };
      setResult(err);
      return err;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
  }

  return { result, loading, validate, reset };
}
