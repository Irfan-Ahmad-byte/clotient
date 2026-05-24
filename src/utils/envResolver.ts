import { Environment } from "../types";

/**
 * Replaces occurrences of `{{key}}` with their corresponding environment variable value.
 */
export function resolveVariables(
  text: string | undefined,
  activeEnv: Environment | null,
  globals: Record<string, string> = {}
): string {
  if (!text) return "";

  const envMap: Record<string, string> = {};

  // 1. Add active environment variables if enabled
  if (activeEnv && activeEnv.variables) {
    activeEnv.variables.forEach((v) => {
      if (v.enabled && v.key) {
        envMap[v.key] = v.value;
      }
    });
  }

  // 2. Add globals (globals take precedence or act as fallback depending on design; here, we overlay them)
  Object.keys(globals).forEach((key) => {
    envMap[key] = globals[key];
  });

  // 3. Regex replace all instances of {{variable_name}}
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return envMap[trimmedKey] !== undefined ? envMap[trimmedKey] : match;
  });
}
