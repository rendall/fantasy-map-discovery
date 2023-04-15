"use strict";
exports.__esModule = true;
var fs = require("fs");
var yargs = require("yargs");
var flat = require("flat");
// Read the JSON file and parse it into an object
var readJsonFile = function (filePath) {
    try {
        var jsonString = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(jsonString);
    }
    catch (error) {
        console.error("Error reading the JSON file: ".concat(error));
        process.exit(1);
    }
};
var pathQuery = function (pathParts, data, properties) {
    var result = data;
    for (var _i = 0, pathParts_1 = pathParts; _i < pathParts_1.length; _i++) {
        var part = pathParts_1[_i];
        if (result[part] === undefined) {
            console.error("Path '".concat(pathParts.join("."), "' does not exist in the JSON object."));
            process.exit(1);
        }
        result = result[part];
    }
    if (Array.isArray(result)) {
        if (properties.length > 0) {
            result = result.map(function (item) {
                var filteredItem = {};
                for (var _i = 0, properties_2 = properties; _i < properties_2.length; _i++) {
                    var prop = properties_2[_i];
                    if (item.hasOwnProperty(prop)) {
                        filteredItem[prop] = item[prop];
                    }
                }
                return filteredItem;
            });
        }
    }
    else if (properties.length) {
        var filteredResult = {};
        for (var _a = 0, properties_1 = properties; _a < properties_1.length; _a++) {
            var prop = properties_1[_a];
            if (result.hasOwnProperty(prop)) {
                filteredResult[prop] = result[prop];
            }
        }
        result = filteredResult;
    }
    console.log(result);
};
var termQuery = function (argvTerm, data) {
    var isRegex = argvTerm.startsWith('/') && argvTerm.endsWith('/');
    var term = isRegex ? new RegExp(argvTerm.slice(1, -1)) : argvTerm;
    var matches = searchKeysAndValues(data, term);
    if (Object.keys(matches).length === 0) {
        console.log('No matches found.');
    }
    else {
        for (var _i = 0, _a = Object.entries(matches); _i < _a.length; _i++) {
            var _b = _a[_i], path = _b[0], value = _b[1];
            console.log("".concat(path, ": ").concat(value));
        }
    }
};
var isMatch = function (value, query) {
    if (query instanceof RegExp) {
        return query.test(value);
    }
    return value === query;
};
// Find all paths with keys or values that match the query
var searchKeysAndValues = function (data, query) {
    var flattened = flat.flatten(data);
    var matches = {};
    for (var _i = 0, _a = Object.entries(flattened); _i < _a.length; _i++) {
        var _b = _a[_i], path = _b[0], value = _b[1];
        if (isMatch(value, query)) {
            matches[path] = value;
        }
        else if (isMatch(path, query)) {
            matches[path] = value;
        }
    }
    return matches;
};
// Find all paths with values that match the query
var search = function (data, query) {
    var flattened = flat.flatten(data);
    var matches = {};
    for (var _i = 0, _a = Object.entries(flattened); _i < _a.length; _i++) {
        var _b = _a[_i], path = _b[0], value = _b[1];
        if (isMatch(value, query)) {
            matches[path] = value;
        }
    }
    return matches;
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
            type: 'string'
        },
        path: {
            describe: 'Path to the property in the JSON object (use dot notation)',
            demandOption: false,
            type: 'string'
        },
        term: {
            describe: 'Query string or regex pattern',
            demandOption: false,
            type: 'string'
        },
        properties: {
            describe: 'Comma-separated list of properties to display (ignores non-existent properties)',
            demandOption: false,
            type: 'string'
        }
    },
    handler: function (argv) {
        var _a, _b, _c;
        if (!argv.path && !argv.term) {
            console.error('You must provide either the --path or --term option.');
            process.exit(1);
        }
        var data = readJsonFile(argv.file);
        var pathParts = (_a = argv.path) === null || _a === void 0 ? void 0 : _a.split('.');
        var properties = (_c = (_b = argv.properties) === null || _b === void 0 ? void 0 : _b.split(',')) !== null && _c !== void 0 ? _c : [];
        if (pathParts && pathParts.length)
            pathQuery(pathParts, data, properties);
        else
            termQuery(argv.term, data);
    }
})
    .demandCommand(1, '')
    .help()
    .parse();