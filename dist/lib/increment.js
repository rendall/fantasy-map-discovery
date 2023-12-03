import { display, readJsonFile, readRulesFile, writeJsonFile } from "../utils.js";
export const incrementHandler = async (argv) => {
    const { inputRules, inputWorld, outputWorld } = argv;
    const world = readJsonFile(inputWorld);
    const rules = await readRulesFile(inputRules);
    const incrementedWorld = rules.reduce((world, rule) => rule(world), world);
    writeJsonFile(outputWorld, incrementedWorld);
    display(rules);
};
