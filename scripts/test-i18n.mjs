import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const output = mkdtempSync(join(tmpdir(), "dida-i18n-test-"));
try {
  const compile = spawnSync(
    process.execPath,
    [
      require.resolve("typescript/bin/tsc"),
      "--outDir",
      output,
      "--module",
      "commonjs",
      "--target",
      "es2022",
      "--types",
      "node",
      "--skipLibCheck",
      "--strict",
      "src/i18n/translate.test.ts",
    ],
    { stdio: "inherit" },
  );
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else
    process.exitCode =
      spawnSync(process.execPath, ["--test", join(output, "translate.test.js")], {
        stdio: "inherit",
      }).status ?? 1;
} finally {
  rmSync(output, { recursive: true, force: true });
}
