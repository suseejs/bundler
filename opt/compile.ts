import ts from "typescript";
import utils from "@suseejs/utils";
import TsConfig from "@suseejs/tsconfig";
export type OutPutHook = (code: string, file?: string) => string;
// biome-ignore lint/suspicious/noExplicitAny: call hooks
export type OutPutHookFunc = (...args: any[]) => OutPutHook;

/**
 * Compile the source code to CommonJS format.
 *
 * This function takes in the source code to be compiled, the output directory,
 * the file name of the source code, and an optional array of output hooks.
 * The output hooks are functions that take in the compiled code and the file name
 * and return the modified code.
 *
 * The function returns a Promise that resolves when the compilation is complete.
 *
 * @param {string} sourceCode - The source code to be compiled.
 * @param {string} fileName - The file name of the source code.
 * @param {OutPutHook[]} [hooks] - An optional array of output hooks.
 */
const commonjsCompiler = async (
  sourceCode: string,
  fileName: string,
  hooks?: OutPutHook[],
) => {
  console.time("Compiled Commonjs");
  const config = new TsConfig();
  config.removeCompilerOption("rootDir");
  config.editCompilerOptions({ module: ts.ModuleKind.CommonJS });
  const compilerOptions: ts.CompilerOptions = config.getCompilerOptions();
  const createdFiles: Record<string, string> = {};
  const host: ts.CompilerHost = {
    getSourceFile: (file, languageVersion) => {
      if (file === fileName) {
        return ts.createSourceFile(file, sourceCode, languageVersion);
      }
      return undefined;
    },
    writeFile: (fileName, contents) => {
      createdFiles[fileName] = contents;
    },
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (file) => file === fileName,
    readFile: (file) => (file === fileName ? sourceCode : undefined),
    getCanonicalFileName: (file) => file,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  // ===
  const program = ts.createProgram([fileName], compilerOptions, host);
  program.emit();
  Object.entries(createdFiles).map(async ([outName, content]) => {
    const ext = utils.extname(outName);
    if (ext === ".js") {
      content = content.replace(
        "exports.default = bundle;",
        "module.exports = bundle;",
      );
    }
    if (ext === ".ts") {
      content = content.replace("export default bundle;", "export = bundle;");
    }
    //content = `${licenseText}\n${content}`;
    if (hooks?.length) {
      for (const hook of hooks) {
        content = hook(content, outName);
      }
    }
    outName = outName.replace(/.js/g, ".cjs");
    outName = outName.replace(/.map.js/g, ".map.cjs");
    outName = outName.replace(/.d.ts/g, ".d.cts");
    await utils.wait(500);
    //host.writeFile(outName, content, false);
    utils.writeFile(outName, content);
  });
  console.timeEnd("Compiled Commonjs");
};

/**
 * Compile the given source code to ESM format.
 *
 * @param {string} sourceCode The source code to compile.
 * @param {string} fileName The name of the source file.
 * @param {OutPutHook[]} [hooks] An array of functions to run on the output code.
 * @returns {Promise<void>}
 */
const esmCompiler = async (
  sourceCode: string,
  fileName: string,
  hooks?: OutPutHook[],
): Promise<void> => {
  console.time("Compiled ESM");
  const config = new TsConfig();
  config.removeCompilerOption("rootDir");
  config.editCompilerOptions({ module: ts.ModuleKind.ES2022 });
  const compilerOptions: ts.CompilerOptions = config.getCompilerOptions();
  const createdFiles: Record<string, string> = {};
  const host: ts.CompilerHost = {
    getSourceFile: (file, languageVersion) => {
      if (file === fileName) {
        return ts.createSourceFile(file, sourceCode, languageVersion);
      }
      return undefined;
    },
    writeFile: (fileName, contents) => {
      createdFiles[fileName] = contents;
    },
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (file) => file === fileName,
    readFile: (file) => (file === fileName ? sourceCode : undefined),
    getCanonicalFileName: (file) => file,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  // ===
  const program = ts.createProgram([fileName], compilerOptions, host);
  program.emit();
  Object.entries(createdFiles).map(async ([outName, content]) => {
    if (hooks?.length) {
      for (const hook of hooks) {
        content = hook(content, outName);
      }
    }
    outName = outName.replace(/.js/g, ".mjs");
    outName = outName.replace(/.map.js/g, ".map.mjs");
    outName = outName.replace(/.d.ts/g, ".d.mts");
    await utils.wait(500);
    utils.writeFile(outName, content);
  });
  console.timeEnd("Compiled ESM");
};

export { commonjsCompiler, esmCompiler };
