"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const yargs = __importStar(require("yargs"));
const flat = __importStar(require("flat"));
const util = __importStar(require("util"));
const astar_1 = require("./lib/astar");
const alasql = require("alasql");
const display = (x) => console.log(util.inspect(x, { depth: 6, colors: true, maxArrayLength: null }));
const getCellFromName = (locationName, { burgs, cells }) => {
    const normalize = (s = "") => s.toLowerCase().replace(/[\s\W]/g, "");
    const burg = burgs.find(burg => normalize(burg.name) === normalize(locationName));
    if (burg)
        return cells.find(cell => cell.i === burg.cell);
    console.error(`Location ${locationName} not found. (normalized to ${normalize(locationName)})`);
};
// Read the JSON file and parse it into an object
const readJsonFile = (filePath) => {
    try {
        const jsonString = fs.readFileSync(filePath, 'utf-8');
        const map = JSON.parse(jsonString);
        return map;
    }
    catch (error) {
        console.error(`Error reading the JSON file: ${error}`);
        process.exit(1);
    }
};
const pathQuery = (pathParts, data, properties) => {
    let result = data;
    for (const part of pathParts) {
        if (result[part] === undefined) {
            console.error(`Path '${pathParts.join(".")}' does not exist in the JSON object.`);
            process.exit(1);
        }
        result = result[part];
    }
    if (Array.isArray(result)) {
        if (properties.length > 0) {
            result = result.map(item => {
                const filteredItem = {};
                for (const prop of properties) {
                    if (item.hasOwnProperty(prop)) {
                        filteredItem[prop] = item[prop];
                    }
                }
                return filteredItem;
            });
        }
    }
    else if (properties.length) {
        const filteredResult = {};
        for (const prop of properties) {
            if (result.hasOwnProperty(prop)) {
                filteredResult[prop] = result[prop];
            }
        }
        result = filteredResult;
    }
    return result;
};
const termQuery = (argvTerm, data) => {
    const isRegex = argvTerm.startsWith('/') && argvTerm.endsWith('/');
    const term = isRegex ? new RegExp(argvTerm.slice(1, -1)) : argvTerm;
    const matches = searchKeysAndValues(data, term);
    if (Object.keys(matches).length === 0) {
        display('No matches found.');
    }
    else {
        for (const [path, value] of Object.entries(matches)) {
            console.log(`${path}: ${value}`);
        }
    }
};
const isMatch = (value, query) => {
    if (query instanceof RegExp && typeof value === "string") {
        return query.test(value);
    }
    return value === query;
};
// Find all paths with keys or values that match the query
const searchKeysAndValues = (data, query) => {
    const flattened = flat.flatten(data);
    const matches = {};
    for (const [path, value] of Object.entries(flattened)) {
        if (isMatch(value, query)) {
            matches[path] = value;
        }
        else if (isMatch(path, query)) {
            matches[path] = value;
        }
    }
    return matches;
};
const generateCreateTableStatement = (tableName, dataArray) => {
    dataArray = dataArray.filter(elem => typeof elem !== "number" && Object.keys(elem).length);
    if (!dataArray || dataArray.length === 0) {
        throw new Error('Array is empty or not provided');
    }
    const reservedWords = ["group"];
    tableName = reservedWords.includes(tableName) ? `\`${tableName}\`` : tableName;
    const firstObject = dataArray[1];
    const columns = Object.keys(firstObject)
        .map((key) => {
        const value = firstObject[key];
        const columName = reservedWords.includes(key) ? `\`${key}\`` : key;
        const columnType = typeof value === 'number'
            ? Number.isInteger(value) ? 'INT' : 'FLOAT'
            : typeof value === 'string'
                ? 'STRING'
                : typeof value === 'boolean'
                    ? 'BOOLEAN'
                    : 'JSON';
        return `${columName} ${columnType}`;
    })
        .join(', ');
    return `CREATE TABLE ${tableName} (${columns})`;
};
// Define the CLI commands and options
yargs
    .command({
    command: 'search',
    describe: 'Query specific information from the JSON file',
    builder: {
        file: {
            describe: 'Path to the JSON file',
            demandOption: true,
            type: 'string',
        },
        path: {
            describe: 'Path to the property in the JSON object (use dot notation)',
            demandOption: false,
            type: 'string',
        },
        term: {
            describe: 'Query string or regex pattern',
            demandOption: false,
            type: 'string',
        },
        properties: {
            describe: 'Comma-separated list of properties to display (ignores non-existent properties)',
            demandOption: false,
            type: 'string',
        },
        sql: {
            describe: 'SQL query string to perform on JSON data',
            demandOption: false,
            type: 'string',
        },
    },
    handler(argv) {
        var _a, _b, _c;
        if (!argv.path && !argv.term && !argv.sql) {
            console.error('You must provide at least one of the following options: --path, --term, or --sql.');
            process.exit(1);
        }
        const data = readJsonFile(argv.file);
        const pathParts = (_a = argv.path) === null || _a === void 0 ? void 0 : _a.split('.');
        const properties = (_c = (_b = argv.properties) === null || _b === void 0 ? void 0 : _b.split(',')) !== null && _c !== void 0 ? _c : [];
        if (argv.sql) {
            const db = new alasql.Database();
            alasql.fn.listTables = () => {
                const tableNames = Object.keys(db.tables);
                return tableNames;
            };
            alasql.fn.pathValue = (path) => pathQuery(path.split("."), data, []);
            const biomes = data.biomes.i.map((i) => {
                return {
                    i,
                    name: data.biomes.name[i],
                    color: data.biomes.color[i],
                    // biomesMatrix: data.biomes.biomesMartix[i],
                    habitability: data.biomes.habitability[i],
                    icons: data.biomes.icons[i],
                    cost: data.biomes.cost[i],
                };
            });
            const markers = data.cells.markers.map(marker => (Object.assign(Object.assign({}, marker), { note: data.notes.find(note => note.id === `marker${marker.i}`) })));
            const states = data.cells.states.map(state => {
                var _a;
                return (Object.assign(Object.assign({}, state), { military: (_a = state.military) === null || _a === void 0 ? void 0 : _a.map(regiment => (Object.assign(Object.assign({}, regiment), { note: data.notes.find(note => note.id === `regiment${state.i}-${regiment.i}`) }))) }));
            });
            const dataObj = Object.assign(Object.assign({}, data.cells), { biomes,
                markers, notes: data.notes, states });
            Object.entries(dataObj).forEach(([key, value]) => {
                const createTable = generateCreateTableStatement(key, value.filter(o => typeof o !== "number"));
                db.exec(createTable);
                value = value.filter(elem => typeof elem !== "number" && Object.keys(elem).length);
                db.tables[key].data = value;
            });
            const result = db.exec(argv.sql);
            display(result);
        }
        else if (pathParts && pathParts.length) {
            const query = pathQuery(pathParts, data, properties);
            display(query);
        }
        else {
            termQuery(argv.term, data);
        }
    }
})
    .command({
    command: 'route',
    describe: 'Find the shortest route between locations in the map',
    builder: {
        file: {
            describe: 'Path to the JSON file',
            demandOption: true,
            type: 'string',
        },
        locations: {
            describe: 'Comma-separated list of cell indices or location names (start, intermediate1, intermediate2, ..., end)',
            demandOption: true,
            type: 'string',
        },
    },
    handler(argv) {
        const data = readJsonFile(argv.file);
        const cells = data.cells.cells;
        const locations = argv.locations.split(',').map((location) => location.trim());
        const locationIds = locations.map((location) => {
            const locationId = parseInt(location, 10);
            if (isNaN(locationId)) {
                const cell = getCellFromName(location, data.cells);
                if (cell) {
                    return cell.i;
                }
                else {
                    console.error(`Location ${location} not found.`);
                    process.exit(1);
                }
            }
            return locationId;
        });
        const routes = [];
        for (let i = 0; i < locationIds.length - 1; i++) {
            const startCell = cells.find((cell) => cell.i === locationIds[i]);
            const endCell = cells.find((cell) => cell.i === locationIds[i + 1]);
            if (!startCell || !endCell) {
                console.error('One or both of the provided cell indices are not found in the map data.');
                process.exit(1);
            }
            const heightExponent = parseInt(data.settings.heightExponent);
            const route = (0, astar_1.findRouteAStar)(startCell, endCell, cells, data.biomes.cost, heightExponent);
            if (route) {
                routes.push(route.slice(0, -1)); // Remove the last element to avoid duplicating the intermediate locations
            }
            else {
                console.log(`No route found between locations ${locations[i]} and ${locations[i + 1]}.`);
                process.exit(1);
            }
        }
        const showBurg = (burgId) => burgId === 0 ? "" : `burg: ${data.cells.burgs[burgId].name},`;
        // Add the last location to the final route
        const finalRoute = routes.flat().concat(cells.find((cell) => cell.i === locationIds[locationIds.length - 1]));
        // Display the final route
        if (finalRoute.length > 0) {
            console.log('Route:');
            finalRoute.forEach((cell) => console.log(`Cell i: ${cell.i}, ${showBurg(cell.burg)} biome: ${data.biomes.name[cell.biome]}, position: (${cell.p[0]}, ${cell.p[1]})`));
        }
        else {
            console.log('No route found between the provided locations.');
        }
    },
})
    .demandCommand(1, '')
    .help()
    .parse();
