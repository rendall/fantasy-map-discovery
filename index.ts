import { Map } from "./map-types";
import * as fs from 'fs';
import * as yargs from 'yargs';
import * as flat from 'flat';
import * as util from "util";

const alasql = require("alasql");

const display = (x: unknown) => console.log(util.inspect(x, { depth: 6, colors: true, maxArrayLength: null }))


// Read the JSON file and parse it into an object
const readJsonFile = (filePath) => {
  try {
    const jsonString = fs.readFileSync(filePath, 'utf-8');
    const map = JSON.parse(jsonString) as Map

    return map

  } catch (error) {
    console.error(`Error reading the JSON file: ${error}`);
    process.exit(1);
  }
}

const pathQuery = (pathParts: string[], data: Map, properties: string[]):unknown => {
  let result: {}[] | {} = data;

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
  } else if (properties.length) {
    const filteredResult = {};
    for (const prop of properties) {
      if (result.hasOwnProperty(prop)) {
        filteredResult[prop] = result[prop];
      }
    }
    result = filteredResult;
  }

  return result;
}

const termQuery = (argvTerm: string, data: Map) => {
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

const isMatch = (value, query) => {
  if (query instanceof RegExp) {
    return query.test(value);
  }
  return value === query;
}

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

      const data = readJsonFile(argv.file) as Map;
      const pathParts = argv.path?.split('.');
      const properties: string[] = argv.properties?.split(',') ?? [];

      if (argv.sql) {
        const db = new alasql.Database()
        alasql.fn.listTables = () => {
          const tableNames = Object.keys(db.tables);
          return tableNames;
        };

        alasql.fn.pathValue = (path: string) => pathQuery(path.split("."), data, [])
        
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

        const markers = data.cells.markers.map(marker => ({ ...marker, note: data.notes.find(note => note.id === `marker${marker.i}`) }))
        const states = data.cells.states.map( state => ({
          ...state,
          military: state.military?.map( regiment => ({...regiment, note:data.notes.find( note => note.id===`regiment${state.i}-${regiment.i}`)}))
        }))


        const dataObj:{[key:string]:any[]} = {
          ...data.cells,
          biomes,
          markers,
          notes:data.notes,
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
  .demandCommand(1, '')
  .help()
  .parse();

