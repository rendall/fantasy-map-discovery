import { PackCell, Pack, FantasyMap } from "./lib/map-types";
import * as fs from 'fs';
import * as yargs from 'yargs';
import * as flat from 'flat';
import * as util from "util";
import { findRouteAStar } from "./lib/astar";

const VERSION = '1.95.00';

const alasql = require("alasql");

const display = (x: unknown) => console.log(util.inspect(x, { depth: 6, colors: true, maxArrayLength: null }))

const getCellFromName = (locationName: string, { burgs, cells }: Pack) => {
  const normalize = (s: string = "") => s.toLowerCase().replace(/[\s\W]/g, "")
  const namedBurgs = burgs.filter(burg => normalize(burg.name) === normalize(locationName))
  if (namedBurgs.length > 1) console.warn(`Location ${locationName} found at cells ${namedBurgs.map(burg => burg.cell).join(', ')}`)
  if (namedBurgs.length > 0) return cells.find(cell => cell.i === namedBurgs[0].cell)
  if (!namedBurgs.length) console.error(`Location ${locationName} not found. (normalized to ${normalize(locationName)})`)
}


// Read the JSON file and parse it into an object
const readJsonFile = (filePath: string) => {
  try {
    const jsonString = fs.readFileSync(filePath, 'utf-8');
    const map = JSON.parse(jsonString) as FantasyMap

    if (map.info.version !== VERSION) {
      console.warn(`Version mismatch: expected ${VERSION} but got ${map.info.version}. This may cause errors.`);
    }

    return map

  } catch (error) {
    console.error(`Error reading the JSON file: ${error}`);
    process.exit(1);
  }
}

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
    handler(argv) {
      const data = readJsonFile(argv.file) as FantasyMap;
      const cells = data.pack.cells;
      const locations = argv.locations.split(',').map((location: string) => location.trim());

      const locationIds = locations.map((location:string) => {
        const locationId = parseInt(location, 10);
        if (isNaN(locationId)) {
          const cell = getCellFromName(location, data.pack);
          if (cell) {
            return cell.i;
          } else {
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
        const route = findRouteAStar(startCell, endCell, cells, data.biomesData.cost, heightExponent);
        if (route) {
          routes.push(route.slice(0, -1)); // Remove the last element to avoid duplicating the intermediate locations
        } else {
          console.log(`No route found between locations ${locations[i]} and ${locations[i + 1]}.`);
          process.exit(1);
        }
      }

      const showBurg = (burgId:number) => burgId === 0? "" : `burg: ${data.pack.burgs[burgId].name},`
      // Add the last location to the final route
      const finalRoute = routes.flat().concat(cells.find((cell) => cell.i === locationIds[locationIds.length - 1])!);

      const cellDistance = (a: PackCell, b: PackCell) => Math.sqrt((a.p[0] - b.p[0]) ** 2 + (a.p[1] - b.p[1]) ** 2)
      let distance = 0

      const addDistance = (i:number, route:PackCell[]) => {
        if (i===0) return 0
        distance = distance + cellDistance(route[i], route[i - 1])
        const scaledDistance = distance * parseFloat(data.settings.distanceScale)
        return parseFloat(scaledDistance.toFixed(1))
      }

      // Display the final route
      if (finalRoute.length > 0) {
        console.log('Route:');
        finalRoute.forEach((cell, i, route) => console.log(`Cell i: ${cell.i}, distance: ${addDistance(i, route)} ${data.settings.distanceUnit}, ${showBurg(cell.burg)} biome: ${data.biomesData.name[cell.biome]}, position: (${cell.p[0]}, ${cell.p[1]})`));
      } else {
        console.log('No route found between the provided locations.');
      }
    },
  })
  .demandCommand(1, '')
  .help()
  .parse();
