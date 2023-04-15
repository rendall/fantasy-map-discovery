"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var fs = require("fs");
var yargs = require("yargs");
var flat = require("flat");
var util = require("util");
var alasql = require("alasql");
var display = function (x) { return console.log(util.inspect(x, { depth: 6, colors: true, maxArrayLength: null })); };
// Read the JSON file and parse it into an object
var readJsonFile = function (filePath) {
    try {
        var jsonString = fs.readFileSync(filePath, 'utf-8');
        var map = JSON.parse(jsonString);
        return map;
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
    return result;
};
var termQuery = function (argvTerm, data) {
    var isRegex = argvTerm.startsWith('/') && argvTerm.endsWith('/');
    var term = isRegex ? new RegExp(argvTerm.slice(1, -1)) : argvTerm;
    var matches = searchKeysAndValues(data, term);
    if (Object.keys(matches).length === 0) {
        display('No matches found.');
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
var generateCreateTableStatement = function (tableName, dataArray) {
    dataArray = dataArray.filter(function (elem) { return typeof elem !== "number" && Object.keys(elem).length; });
    if (!dataArray || dataArray.length === 0) {
        throw new Error('Array is empty or not provided');
    }
    var reservedWords = ["group"];
    tableName = reservedWords.includes(tableName) ? "`".concat(tableName, "`") : tableName;
    var firstObject = dataArray[1];
    var columns = Object.keys(firstObject)
        .map(function (key) {
        var value = firstObject[key];
        var columName = reservedWords.includes(key) ? "`".concat(key, "`") : key;
        var columnType = typeof value === 'number'
            ? Number.isInteger(value) ? 'INT' : 'FLOAT'
            : typeof value === 'string'
                ? 'STRING'
                : typeof value === 'boolean'
                    ? 'BOOLEAN'
                    : 'JSON';
        return "".concat(columName, " ").concat(columnType);
    })
        .join(', ');
    return "CREATE TABLE ".concat(tableName, " (").concat(columns, ")");
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
        },
        sql: {
            describe: 'SQL query string to perform on JSON data',
            demandOption: false,
            type: 'string'
        }
    },
    handler: function (argv) {
        var _a, _b, _c;
        if (!argv.path && !argv.term && !argv.sql) {
            console.error('You must provide at least one of the following options: --path, --term, or --sql.');
            process.exit(1);
        }
        var data = readJsonFile(argv.file);
        var pathParts = (_a = argv.path) === null || _a === void 0 ? void 0 : _a.split('.');
        var properties = (_c = (_b = argv.properties) === null || _b === void 0 ? void 0 : _b.split(',')) !== null && _c !== void 0 ? _c : [];
        if (argv.sql) {
            var db_1 = new alasql.Database();
            alasql.fn.listTables = function () {
                var tableNames = Object.keys(db_1.tables);
                return tableNames;
            };
            alasql.fn.pathValue = function (path) { return pathQuery(path.split("."), data, []); };
            var biomes = data.biomes.i.map(function (i) {
                return {
                    i: i,
                    name: data.biomes.name[i],
                    color: data.biomes.color[i],
                    // biomesMatrix: data.biomes.biomesMartix[i],
                    habitability: data.biomes.habitability[i],
                    icons: data.biomes.icons[i],
                    cost: data.biomes.cost[i]
                };
            });
            var markers = data.cells.markers.map(function (marker) { return (__assign(__assign({}, marker), { note: data.notes.find(function (note) { return note.id === "marker".concat(marker.i); }) })); });
            var states = data.cells.states.map(function (state) {
                var _a;
                return (__assign(__assign({}, state), { military: (_a = state.military) === null || _a === void 0 ? void 0 : _a.map(function (regiment) { return (__assign(__assign({}, regiment), { note: data.notes.find(function (note) { return note.id === "regiment".concat(state.i, "-").concat(regiment.i); }) })); }) }));
            });
            var dataObj = __assign(__assign({}, data.cells), { biomes: biomes, markers: markers, notes: data.notes, states: states });
            Object.entries(dataObj).forEach(function (_a) {
                var key = _a[0], value = _a[1];
                var createTable = generateCreateTableStatement(key, value.filter(function (o) { return typeof o !== "number"; }));
                db_1.exec(createTable);
                value = value.filter(function (elem) { return typeof elem !== "number" && Object.keys(elem).length; });
                db_1.tables[key].data = value;
            });
            var result = db_1.exec(argv.sql);
            display(result);
        }
        else if (pathParts && pathParts.length) {
            var query = pathQuery(pathParts, data, properties);
            display(query);
        }
        else {
            termQuery(argv.term, data);
        }
    }
})
    .demandCommand(1, '')
    .help()
    .parse();
