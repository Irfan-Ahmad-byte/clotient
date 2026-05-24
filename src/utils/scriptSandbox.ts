export interface SandboxVariables {
  get: (key: string) => string;
  set: (key: string, value: string) => void;
}

export interface SandboxContext {
  env: SandboxVariables;
  request: {
    headers: {
      add: (k: string, v: string) => void;
      remove: (k: string) => void;
    };
  };
  response?: {
    status: number;
    json: () => any;
    text: () => string;
  };
}

export interface ScriptExecutionResult {
  logs: string[];
  assertions: { passed: boolean; message: string }[];
}

/**
 * Executes user-provided JS scripts safely in a functional evaluation context.
 * Exposes a global `cs` object inside the scope of the script.
 */
export function executeScript(
  scriptContent: string | undefined,
  context: SandboxContext
): ScriptExecutionResult {
  const logs: string[] = [];
  const assertions: { passed: boolean; message: string }[] = [];

  if (!scriptContent || scriptContent.trim() === "") {
    return { logs, assertions };
  }

  // 1. Build the Clotient Script ('cs') API object
  const cs = {
    env: {
      get: (key: string) => context.env.get(key),
      set: (key: string, value: string) => context.env.set(key, value),
    },
    request: {
      headers: {
        add: (k: string, v: string) => context.request.headers.add(k, v),
        remove: (k: string) => context.request.headers.remove(k),
      },
    },
    response: context.response
      ? {
          status: context.response.status,
          json: () => {
            try {
              return context.response?.json();
            } catch (err: any) {
              return { error: `Failed to parse JSON: ${err.message}` };
            }
          },
          text: () => context.response?.text() || "",
        }
      : undefined,
    log: (...args: any[]) => {
      logs.push(
        args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ")
      );
    },
    assert: (condition: any, message: string) => {
      assertions.push({
        passed: !!condition,
        message: message || "Assertion Passed",
      });
    },
  };

  try {
    // 2. Wrap script inside a function execution context and run
    const runner = new Function("cs", scriptContent);
    runner(cs);
  } catch (error: any) {
    logs.push(`Script Runtime Error: ${error.message}`);
  }

  return { logs, assertions };
}
