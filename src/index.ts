import resolves from "@phothinmaung/resolves";
import anonymous from "@suseejs/anonymous";
import check from "@suseejs/check";
import duplicateHandlers from "@suseejs/duplicates";
import tsconfig from "@suseejs/tsconfig";
import type SuSee from "@suseejs/types";
import utils from "@suseejs/utils";
import dependency from "./dependency.js";
import removeExportExpressionHandler from "./remove/exports.js";
import removeImportExpressionHandler from "./remove/imports.js";
import mergeImports from "./remove/mergeImports.js";

interface BundleOptions {
	tsconfigPath?: string;
	renameDuplicates?: boolean;
}

async function bundle(
	entry: string,
	options?: BundleOptions,
): Promise<{
	content: string;
	isJsx: boolean;
}> {
	console.time("Bundle Time");
	const reName = options?.renameDuplicates ?? true;
	// construct maps
	const namesMap: SuSee.DuplicatesNameMap = new Map();
	const callNameMap: SuSee.NamesSets = [];
	const importNameMap: SuSee.NamesSets = [];
	const exportNameMap: SuSee.NamesSets = [];
	const exportDefaultExportNameMap: SuSee.NamesSets = [];
	const exportDefaultImportNameMap: SuSee.NamesSets = [];
	let removedStatements: string[] = [];
	// 1. Generate dependencies
	const dependencies = await dependency(entry);
	let deps = dependencies.depFiles;
	await utils.wait(1000);
	// 2. Generate ts compiler options.
	const compilerOptions = tsconfig(options?.tsconfigPath).options;
	// 3. Types and module format check
	const checks = resolves([
		[check.fileExtensionAndFormat, deps],
		[check.checkTypes, deps, compilerOptions],
	]);
	await checks.series();
	await utils.wait(500);
	// 4. Check its jsx or not
	const isJsx = check.checkJSX(deps);
	await utils.wait(500);
	// 5. Handle duplicates
	if (reName) {
		deps = await duplicateHandlers.renamed(
			deps,
			namesMap,
			callNameMap,
			importNameMap,
			exportNameMap,
			compilerOptions,
		);
	} else {
		deps = await duplicateHandlers.notRenamed(deps, namesMap, compilerOptions);
	}
	await utils.wait(1000);
	// 6. Handling anonymous imports and exports
	deps = await anonymous(
		deps,
		exportDefaultExportNameMap,
		exportDefaultImportNameMap,
		compilerOptions,
	);
	await utils.wait(1000);
	// 7. Remove Imports
	const removeImports = resolves([
		[removeImportExpressionHandler, removedStatements, compilerOptions],
	]);
	const removeImport = await removeImports.concurrent();
	deps = deps.map(removeImport[0]);
	await utils.wait(1000);
	// 8. Remove Exports from dependencies only
	const removeExports = resolves([
		[removeExportExpressionHandler, compilerOptions],
	]);
	const removeExport = await removeExports.concurrent();
	// not remove exports from entry file
	const depsFiles = deps.slice(0, -1).map(removeExport[0]);
	const mainFile = deps.slice(-1);
	// 9. Handle imported statements
	// filter removed statements , that not from local like `./` or `../`
	const regexp = /["']((?!\.\/|\.\.\/)[^"']+)["']/;
	removedStatements = removedStatements.filter((i) => regexp.test(i));
	removedStatements = mergeImports(removedStatements);
	// 10. Create final content
	// make sure all imports are at the top of file
	let content = removedStatements.join("\n").trim();
	content = `${content}\n${depsFiles
		.map((i) => i.content)
		.join("\n")}\n${mainFile.map((i) => i.content).join("\n")}`.trim();
	await utils.wait(1000);
	console.timeEnd("Bundle Time");
	return { content, isJsx };
}

export default bundle;
