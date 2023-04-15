import { Map } from "./map-types";
import * as fs from 'fs';
import * as yargs from 'yargs';
import * as flat from 'flat';

// Read the JSON file and parse it into an object
const readJsonFile = (filePath) => {
  try {
    const jsonString = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(`Error reading the JSON file: ${error}`);
    process.exit(1);
  }
}

const pathQuery = (pathParts: string[], data: Map, properties: string[]) => {
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

  console.log(result);
}

const termQuery = (argvTerm: string, data: Map) => {
  const isRegex = argvTerm.startsWith('/') && argvTerm.endsWith('/')
  const term = isRegex ? new RegExp(argvTerm.slice(1, -1)) : argvTerm;
  const matches = searchKeysAndValues(data, term);

  if (Object.keys(matches).length === 0) {
    console.log('No matches found.');
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
// Find all paths with values that match the query
const search = (data, query) => {
  const flattened = flat.flatten(data);
  const matches = {};

  for (const [path, value] of Object.entries(flattened)) {
    if (isMatch(value, query)) {
      matches[path] = value;
    }
  }

  return matches;
}
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
    },
    handler(argv) {
      if (!argv.path && !argv.term) {
        console.error('You must provide either the --path or --term option.');
        process.exit(1);
      }

      const data = readJsonFile(argv.file) as Map;
      const pathParts = argv.path?.split('.');
      const properties: string[] = argv.properties?.split(',') ?? [];

      if (pathParts && pathParts.length) pathQuery(pathParts, data, properties)
      else termQuery(argv.term, data)
    }
  })
  .demandCommand(1, '')
  .help()
  .parse();
