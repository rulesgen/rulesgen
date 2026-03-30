import chalk from 'chalk';

export interface LoggerOptions {
  quiet?: boolean;
  color?: boolean;
}

export interface Logger {
  info(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export function createLogger(options: LoggerOptions): Logger {
  const { quiet = false, color = true } = options;

  // When color is disabled, just use identity functions
  const identity = (s: string) => s;
  const colorFn = color
    ? { green: chalk.green, yellow: chalk.yellow, red: chalk.red, gray: chalk.gray }
    : { green: identity, yellow: identity, red: identity, gray: identity };

  return {
    info(msg: string) {
      if (!quiet) console.log(msg);
    },
    success(msg: string) {
      if (!quiet) console.log(colorFn.green(msg));
    },
    warn(msg: string) {
      console.warn(colorFn.yellow(msg));
    },
    error(msg: string) {
      console.error(colorFn.red(msg));
    },
    debug(msg: string) {
      if (process.env.DEBUG) console.log(colorFn.gray(msg));
    },
  };
}
