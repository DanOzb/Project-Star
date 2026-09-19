// Validates templates/vite-spa by scaffolding it exactly the way the product
// will, then installing, typechecking and building it in isolation.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(REPO_ROOT, "templates", "vite-spa");

const NEVER_COPY = new Set(["node_modules", "dist", "dist-ssr", "pnpm-lock.yaml", ".DS_Store"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html", ".md"]);

// ---------------------------------------------------------------- scaffolding

/**
 * Copy the template to `target` and substitute placeholders.
 * Deliberately dependency-free so it can move into packages/scaffold as-is.
 */
export function scaffoldTemplate({ templateDir, target, slug, name }) {
  cpSync(templateDir, target, {
    recursive: true,
    filter: (src) => !NEVER_COPY.has(relative(templateDir, src).split(/[\\/]/)[0] || ""),
  });

  const substitutions = { __PROJECT_SLUG__: slug, __PROJECT_NAME__: name };

  for (const file of walk(target)) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    const before = readFileSync(file, "utf8");
    let after = before;
    for (const [token, value] of Object.entries(substitutions)) {
      after = after.split(token).join(value);
    }
    if (after !== before) writeFileSync(file, after);
  }

  return target;
}

function extname(p) {
  const i = p.lastIndexOf(".");
  return i === -1 ? "" : p.slice(i);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (NEVER_COPY.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}


const CONVENTION_CHECKS = [
  { id: "R1.4", why: "style prop is banned", files: /\.tsx$/, bad: /\bstyle=\{\{/ },
  { id: "R1.5", why: "arbitrary value; add a token instead", files: /\.tsx$/, bad: /-\[(#|\d)/ },
  { id: "R3.5", why: "react-router-dom no longer exists in v8", files: /\.tsx?$/, bad: /from "react-router-dom"/ },
  { id: "R4.1", why: "array index used as key", files: /\.tsx$/, bad: /key=\{(i|idx|index)\}/ },
  { id: "R6.1", why: "data-ps-* is toolchain-owned", files: /\.tsx$/, bad: /data-ps-/ },
];

function checkConventions(projectDir) {
  const problems = [];
  const srcDir = join(projectDir, "src");

  for (const file of walk(srcDir)) {
    const rel = relative(projectDir, file);
    const source = readFileSync(file, "utf8");

    if (file.endsWith(".tsx")) {
      problems.push(...checkClassNameCalls(source, rel));
    }

    for (const check of CONVENTION_CHECKS) {
      if (!check.files.test(file)) continue;
      source.split("\n").forEach((line, i) => {
        if (line.trimStart().startsWith("//")) return;
        if (check.bad.test(line)) {
          problems.push(`${check.id}  ${rel}:${i + 1}  ${check.why}`);
        }
      });
    }
  }

  function checkClassNameCalls(source, rel) {
  const problems = [];
  const needle = "className=";
  let at = source.indexOf(needle);

  while (at !== -1) {
    const line = source.slice(0, at).split("\n").length;
    const flat = source
      .slice(at + needle.length, at + needle.length + 240)
      .replace(/\s+/g, " ");

    if (/^\{ *\(/.test(flat)) {
      problems.push(`R2.6  ${rel}:${line}  function-form className; wrap it in a component`);
    } else if (!flat.startsWith("{cn(")) {
      problems.push(`R1.1  ${rel}:${line}  className must be cn(...), found ${flat.slice(0, 24)}`);
    } else if (!/^\{cn\( *["']/.test(flat)) {
      problems.push(`R1.2  ${rel}:${line}  first cn() argument must be a string literal`);
    }

    at = source.indexOf(needle, at + 1);
  }

  return problems;
}

  const routesDir = join(srcDir, "routes");
  const routeFiles = readdirSync(routesDir).filter((f) => f.endsWith(".tsx"));
  for (const file of routeFiles) {
    const source = readFileSync(join(routesDir, file), "utf8");
    if (!/export default function [A-Z]\w*\s*\(/.test(source)) {
      problems.push(`R3.1  src/routes/${file}  needs "export default function Name()"`);
    }
  }

  // R3.2 — every route file is registered, and nothing else is.
  const registry = readFileSync(join(srcDir, "routes.tsx"), "utf8");
  for (const file of routeFiles) {
    const componentName = file.replace(/\.tsx$/, "");
    if (!registry.includes(`@/routes/${componentName}`)) {
      problems.push(`R3.2  src/routes/${file}  not imported in routes.tsx`);
    }
  }

  return problems;
}

function checkNoPlaceholders(projectDir) {
  const problems = [];
  for (const file of walk(projectDir)) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    const source = readFileSync(file, "utf8");
    const found = source.match(/__[A-Z_]+__/g);
    if (found) {
      problems.push(`placeholder  ${relative(projectDir, file)}  ${[...new Set(found)].join(", ")}`);
    }
  }
  return problems;
}

// ----------------------------------------------------------------- the runner

function run(command, args, cwd) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (result.error && result.error.code === "ENOENT") {
    fail(`${command} is not on PATH`);
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} exited ${result.status} after ${seconds}s`);
  }
  console.log(`  ok  ${command} ${args.join(" ")}  (${seconds}s)`);
}

let tempDir = null;
const keep = process.argv.includes("--keep");

function fail(message) {
  console.error(`\nFAIL  ${message}`);
  if (tempDir) {
    console.error(keep ? `      kept at ${tempDir}` : `      re-run with --keep to inspect the scaffolded copy`);
    if (!keep) rmSync(tempDir, { recursive: true, force: true });
  }
  process.exit(1);
}

function main() {
  if (!existsSync(TEMPLATE_DIR)) fail(`no template at ${TEMPLATE_DIR}`);

  tempDir = mkdtempSync(join(tmpdir(), "od-template-"));
  const projectDir = join(tempDir, "validation-project");

  console.log(`\nscaffolding  ${relative(REPO_ROOT, TEMPLATE_DIR)} -> ${projectDir}`);
  scaffoldTemplate({
    templateDir: TEMPLATE_DIR,
    target: projectDir,
    slug: "validation-project",
    name: "Validation Project",
  });

  const placeholders = checkNoPlaceholders(projectDir);
  if (placeholders.length) {
    console.error("\nunsubstituted placeholders:");
    for (const p of placeholders) console.error(`  ${p}`);
    fail(`${placeholders.length} placeholder(s) survived scaffolding`);
  }
  console.log("  ok  no placeholders remain");

  const problems = checkConventions(projectDir);
  if (problems.length) {
    console.error("\nconvention violations:");
    for (const p of problems) console.error(`  ${p}`);
    fail(`${problems.length} convention violation(s)`);
  }
  console.log("  ok  conventions");

  if (!process.argv.includes("--skip-install")) {
    run("pnpm", ["install", "--prefer-offline"], projectDir);
    run("pnpm", ["typecheck"], projectDir);
    run("pnpm", ["build"], projectDir);

    const dist = join(projectDir, "dist");
    if (!existsSync(join(dist, "index.html"))) fail("build produced no dist/index.html");

    const assets = existsSync(join(dist, "assets")) ? readdirSync(join(dist, "assets")) : [];
    if (!assets.some((f) => f.endsWith(".css"))) fail("build produced no CSS — Tailwind is not wired");
    if (!assets.some((f) => f.endsWith(".js"))) fail("build produced no JS bundle");
    console.log("  ok  dist contains html, css and js");
  }

  if (keep) {
    console.log(`\nPASS  kept at ${projectDir}\n`);
  } else {
    rmSync(tempDir, { recursive: true, force: true });
    console.log("\nPASS\n");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
