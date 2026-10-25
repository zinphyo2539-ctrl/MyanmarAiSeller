export function getErrorChain(error: any, depth = 0): any {
  if (!error || depth > 3) return null;
  return {
    name: error.name,
    message: error.message,
    code: error.code || (error as any).cause?.code,
    errno: (error as any).errno,
    syscall: (error as any).syscall,
    hostname: (error as any).hostname,
    status: error.status || (error as any).statusCode,
    cause: getErrorChain(error.cause || (error as any).originalError, depth + 1),
  };
}
