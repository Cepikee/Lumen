export function appendOperationalLog(filename: string, line: string, options?: { directory?: string; console?: Pick<Console, "error"> }): { console: true; file: boolean };
