import dependencies from "@suseejs/dependencies";
import type SuSee from "@suseejs/types";
import utils from "@suseejs/utils";

/**
 * Resolves dependencies for a given entry.
 * @param {string} entry - The entry point to resolve dependencies for.
 * @returns {Promise<{sorted: string[], messages: string[]}>} - A promise that resolves with an object containing the sorted dependencies and warning messages.
 */
async function getDependencies(
	entry: string,
): Promise<{ sorted: string[]; messages: string[] }> {
	const deps = await dependencies(entry);
	const sorted = deps.sort();
	const messages: string[] = [];

	const circular = deps
		.mutual()
		.map((i) => `${i[0]} -> ${i[1]} \n ${i[1]} -> ${i[0]} \n`);
	const unknown = deps.warn().map((i) => `${i}\n`);

	if (circular.length) messages.push(circular.join(""));
	if (unknown.length) messages.push(unknown.join(""));

	return {
		sorted,
		messages,
	};
}

/**
 * Resolves dependencies for a given entry and returns an object containing the resolved dependencies and warning messages.
 * @param {string} entry - The entry point to resolve dependencies for.
 * @returns {Promise<{depFiles: SuSee.DepsFile[], messages: string[]}>} - A promise that resolves with an object containing the resolved dependencies and warning messages.
 */
async function dependency(
	entry: string,
): Promise<{ depFiles: SuSee.DepsFile[]; messages: string[] }> {
	const deps = await getDependencies(entry);
	const depFiles: SuSee.DepsFile[] = [];
	for (const dep of deps.sorted) {
		const file = utils.resolvePath(dep);
		const content = utils.readFile(file);
		depFiles.push({ file, content });
	}
	return {
		depFiles,
		messages: deps.messages,
	};
}
export default dependency;
