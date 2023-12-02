import { PackCell, FantasyMap } from "./lib/map-types";
import * as yargs from 'yargs';
import * as flat from 'flat';
import * as util from "util";
import { findRouteAStar } from "./lib/astar";
import { VERSION, getCellFromName, readJsonFile } from "./utils";
import { routeHandler } from "./lib/route";


const alasql = require("alasql");

const display = (x: unknown) => console.log(util.inspect(x, { depth: 6, colors: true, maxArrayLength: null }))

interface QueryResult {
  [key: string]: any;
}

interface QueryData {
  [key: string]: any;
}

const pathQuery = (
  pathParts: string[],
  data: FantasyMap,
  properties: string[]
): QueryResult | QueryResult[] => {
  let result: QueryResult | QueryResult[] = data;

  for (const part of pathParts) {
    if ((result as QueryData)[part] === undefined) {
      console.error(`Path '${pathParts.join(".")}' does not exist in the JSON object.`);
      process.exit(1);
    }
    result = (result as QueryData)[part];
  }

  if (Array.isArray(result)) {
    if (properties.length > 0) {
      result = result.map(item => {
        const filteredItem: QueryResult = {};
        for (const prop of properties) {
          if (item.hasOwnProperty(prop)) {
            filteredItem[prop] = item[prop];
          }
        }
        return filteredItem;
      });
    }
  } else if (properties.length) {
    const filteredResult: QueryResult = {};
    for (const prop of properties) {
      if ((result as QueryResult).hasOwnProperty(prop)) {
        filteredResult[prop] = (result as QueryResult)[prop];
      }
    }
    result = filteredResult;
  }

  return result;
};


const termQuery = (argvTerm: string, data: FantasyMap) => {
  const isRegex = argvTerm.startsWith('/') && argvTerm.endsWith('/')
  const term = isRegex ? new RegExp(argvTerm.slice(1, -1)) : argvTerm;
  const matches = searchKeysAndValues(data, term);

  if (Object.keys(matches).length === 0) {
    display('No matches found.');
  } else {
    for (const [path, value] of Object.entries(matches)) {
      console.log(`${path}: ${value}`);
    }
  }

}

const isMatch = (value: unknown, query: string | RegExp) => {
  if (query instanceof RegExp && typeof value === "string") {
    return query.test(value);
  }
  return value === query;
}

// Find all paths with keys or values that match the query
const searchKeysAndValues = (data: FantasyMap, query: string | RegExp) => {
  const flattened: { [key: string]: unknown } = flat.flatten(data);
  const matches: { [key: string]: unknown } = {};

  for (const [path, value] of Object.entries(flattened)) {
    if (isMatch(value, query)) {
      matches[path] = value;
    }
    else if (isMatch(path, query)) {
      matches[path] = value;
    }
  }

  return matches;

}
const generateCreateTableStatement = (tableName: string, dataArray: any[]): string => {
  dataArray = dataArray.filter(elem => typeof elem !== "number" && Object.keys(elem).length)
  if (!dataArray || dataArray.length === 0) {
    throw new Error('Array is empty or not provided');
  }

  const reservedWords = ["group"]

  tableName = reservedWords.includes(tableName) ? `\`${tableName}\`` : tableName

  const firstObject = dataArray[1];
  const columns = Object.keys(firstObject)
    .map((key) => {
      const value = firstObject[key];
      const columName = reservedWords.includes(key) ? `\`${key}\`` : key
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
      if (!argv.path && !argv.term && !argv.sql) {
        console.error('You must provide at least one of the following options: --path, --term, or --sql.');
        process.exit(1);
      }

      const data = readJsonFile(argv.file) as FantasyMap;
      const pathParts = argv.path?.split('.');
      const properties: string[] = argv.properties?.split(',') ?? [];

      if (argv.sql) {
        const db = new alasql.Database()
        alasql.fn.listTables = () => {
          const tableNames = Object.keys(db.tables);
          return tableNames;
        };

        alasql.fn.pathValue = (path: string) => pathQuery(path.split("."), data, [])

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

        const markers = data.pack.markers.map(marker => ({ ...marker, note: data.notes.find(note => note.id === `marker${marker.i}`) }))
        const states = data.pack.states.map(state => ({
          ...state,
          military: state.military?.map(regiment => ({ ...regiment, note: data.notes.find(note => note.id === `regiment${state.i}-${regiment.i}`) }))
        }))


        const dataObj: { [key: string]: any[] } = {
          ...data.pack,
          biomes,
          markers,
          notes: data.notes,
          states
        }

        Object.entries(dataObj).forEach(([key, value]) => {
          const createTable = generateCreateTableStatement(key, value.filter(o => typeof o !== "number"))
          db.exec(createTable);
          value = value.filter(elem => typeof elem !== "number" && Object.keys(elem).length)
          db.tables[key].data = value
        })
        const result = db.exec(argv.sql);
        display(result);
      } else if (pathParts && pathParts.length) {
        const query = pathQuery(pathParts, data, properties);
        display(query)
      } else {
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
    handler:routeHandler
  })
  .command({
    command: 'version',
    describe: 'Display the version number',
    handler() {
      console.log(VERSION);
    },
  })
  .demandCommand(1, '')
  .help()
  .parse();
