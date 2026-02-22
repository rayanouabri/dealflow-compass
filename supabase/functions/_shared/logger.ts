// Logger structuré JSON avec niveaux et contexte pipeline
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  pipelineId?: string;
  step?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info:  (message: string, context?: LogContext) => log("info",  message, context),
  warn:  (message: string, context?: LogContext) => log("warn",  message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
