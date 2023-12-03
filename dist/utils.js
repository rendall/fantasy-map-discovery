import * as fs from 'fs';
import * as util from "util";
export const VERSION = '1.95.00';
export const writeJsonFile = (filePath, data) => {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf-8');
        console.log(`JSON file written successfully to ${filePath}`);
    }
    catch (error) {
        console.error(`Error writing the JSON file: ${error}`);
        process.exit(1);
    }
};
export const readJsonFile = (filePath) => {
    try {
        const jsonString = fs.readFileSync(filePath, 'utf-8');
        const map = JSON.parse(jsonString);
        if (map.info.version !== VERSION) {
            console.warn(`Version mismatch: expected ${VERSION} but got ${map.info.version}. This may cause errors.`);
        }
        return map;
    }
    catch (error) {
        console.error(`Error reading the JSON file: ${error}`);
        process.exit(1);
    }
};
export const getCellFromName = (locationName, { burgs, cells }) => {
    const normalize = (s = "") => s.toLowerCase().replace(/[\s\W]/g, "");
    const namedBurgs = burgs.filter(burg => normalize(burg.name) === normalize(locationName));
    if (namedBurgs.length > 1)
        console.warn(`Location ${locationName} found at cells ${namedBurgs.map(burg => burg.cell).join(', ')}`);
    if (namedBurgs.length > 0)
        return cells.find(cell => cell.i === namedBurgs[0]?.cell);
    else
        throw `Location ${locationName} not found. (normalized to ${normalize(locationName)})`;
};
export const readRulesFile = async (filePath) => {
    try {
        // Require the JavaScript file, which should export an array of functions
        const ruleImport = await import(filePath);
        const rules = ruleImport.default;
        return rules;
    }
    catch (error) {
        console.error(`Error reading the rules file: ${error}`);
        process.exit(1);
    }
};
/** Output to console a deep inspection of object 'x' */
export const display = (x) => console.log(util.inspect(x, { depth: 6, colors: true, maxArrayLength: null }));
