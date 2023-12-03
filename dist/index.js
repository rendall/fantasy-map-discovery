#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { flatten } from "flat";
import { VERSION, display, readJsonFile } from "./utils.js";
import { routeHandler } from "./lib/route.js";
import { incrementHandler } from "./lib/increment.js";
import alasql from "alasql";
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
            result = result.map((item) => {
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
    const isRegex = argvTerm.startsWith("/") && argvTerm.endsWith("/");
    const term = isRegex ? new RegExp(argvTerm.slice(1, -1)) : argvTerm;
    const matches = searchKeysAndValues(data, term);
    if (Object.keys(matches).length === 0) {
        display("No matches found.");
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
    const flattened = flatten(data);
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
    dataArray = dataArray.filter((elem) => typeof elem !== "number" && Object.keys(elem).length);
    if (!dataArray || dataArray.length === 0) {
        throw new Error("Array is empty or not provided");
    }
    const reservedWords = ["group"];
    tableName = reservedWords.includes(tableName)
        ? `\`${tableName}\``
        : tableName;
    const firstObject = dataArray[1];
    const columns = Object.keys(firstObject)
        .map((key) => {
        const value = firstObject[key];
        const columName = reservedWords.includes(key) ? `\`${key}\`` : key;
        const columnType = typeof value === "number"
            ? Number.isInteger(value)
                ? "INT"
                : "FLOAT"
            : typeof value === "string"
                ? "STRING"
                : typeof value === "boolean"
                    ? "BOOLEAN"
                    : "JSON";
        return `${columName} ${columnType}`;
    })
        .join(", ");
    return `CREATE TABLE ${tableName} (${columns})`;
};
// Define the CLI commands and options
yargs(hideBin(process.argv))
    .command({
    command: "search",
    describe: "Query specific information from the JSON file",
    builder: {
        file: {
            describe: "Path to the JSON file",
            demandOption: true,
            type: "string",
        },
        path: {
            describe: "Path to the property in the JSON object (use dot notation)",
            demandOption: false,
            type: "string",
        },
        term: {
            describe: "Query string or regex pattern",
            demandOption: false,
            type: "string",
        },
        properties: {
            describe: "Comma-separated list of properties to display (ignores non-existent properties)",
            demandOption: false,
            type: "string",
        },
        sql: {
            describe: "SQL query string to perform on JSON data",
            demandOption: false,
            type: "string",
        },
    },
    handler(argv) {
        const { path, term, sql, file, properties } = argv;
        if (!path && !term && !sql) {
            console.error("You must provide at least one of the following options: --path, --term, or --sql.");
            process.exit(1);
        }
        const data = readJsonFile(file);
        const pathParts = path?.split(".");
        const propertiesArray = properties?.split(",") ?? [];
        if (sql) {
            const db = new alasql.Database();
            alasql.fn.listTables = () => {
                const tableNames = Object.keys(db.tables);
                return tableNames;
            };
            alasql.fn.pathValue = (path) => pathQuery(path.split("."), data, []);
            /** Map a query to each id of an array in turn, returning an array */
            alasql.fn.mapIdsToQuery = (idArgs, query) => {
                const ids = typeof idArgs === "string" ? JSON.parse(idArgs) : idArgs;
                return ids
                    .map((id) => {
                    // Replace 'id' placeholder in query with the actual ID
                    const modifiedQuery = query.replace(/\$id/g, `${id}`);
                    // Execute the query and return the result
                    return db.exec(modifiedQuery);
                })
                    .flat(); // Flatten the array if each query returns an array
            };
            const biomes = data.biomesData.i.map((i) => {
                return {
                    i,
                    name: data.biomesData.name[i],
                    color: data.biomesData.color[i],
                    habitability: data.biomesData.habitability[i],
                    icons: data.biomesData.icons[i],
                    cost: data.biomesData.cost[i],
                };
            });
            /*
    
    SELECT states.fullName AS state, burgs.name AS capital, cultures.name AS culture, (SELECT VALUE mapIdsToQuery(states.neighbors, "SELECT fullName FROM states WHERE i = $id")) AS neighborNames FROM states JOIN burgs ON states.capital = burgs.i JOIN cultures ON states.culture = cultures.i
    
        */
            const markers = data.pack.markers.map((marker) => ({
                ...marker,
                note: data.notes.find((note) => note.id === `marker${marker.i}`),
            }));
            const states = data.pack.states.map((state) => ({
                ...state,
                military: state.military?.map((regiment) => ({
                    ...regiment,
                    note: data.notes.find((note) => note.id === `regiment${state.i}-${regiment.i}`),
                })),
            }));
            const dataObj = {
                ...data.pack,
                biomes,
                markers,
                notes: data.notes,
                states,
            };
            Object.entries(dataObj).forEach(([key, value]) => {
                const createTable = generateCreateTableStatement(key, value.filter((o) => typeof o !== "number"));
                db.exec(createTable);
                value = value.filter((elem) => typeof elem !== "number" && Object.keys(elem).length);
                db.tables[key].data = value;
            });
            const result = db.exec(sql);
            display(result);
        }
        else if (pathParts && pathParts.length) {
            const query = pathQuery(pathParts, data, propertiesArray);
            display(query);
        }
        else {
            termQuery(term, data);
        }
    },
})
    .command({
    command: "route",
    describe: "Find the shortest route between locations in the map",
    builder: {
        file: {
            describe: "Path to the JSON file",
            demandOption: true,
            type: "string",
        },
        locations: {
            describe: "Comma-separated list of cell indices or location names (start, intermediate1, intermediate2, ..., end)",
            demandOption: true,
            type: "string",
        },
    },
    handler: routeHandler,
})
    .command({
    command: "increment",
    describe: "Advance the history of the world and output a new JSON file",
    builder: {
        inputWorld: {
            describe: "Path to the JSON file describing the world",
            demandOption: true,
            type: "string",
        },
        outputWorld: {
            describe: "Path to the output JSON file",
            demandOption: true,
            type: "string",
        },
        inputEvents: {
            describe: "Path to the JSON file describing world events",
            demandOption: true,
            type: "string",
        },
        inputRules: {
            describe: "Path to the JSON file describing world rules",
            demandOption: true,
            type: "string",
        },
    },
    handler: incrementHandler,
})
    .command({
    command: "version",
    describe: "Display the version number",
    handler() {
        console.log(VERSION);
    },
})
    .demandCommand(1, "")
    .help()
    .parse();
