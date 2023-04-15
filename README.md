# App for Azgaar Fantasy Map Discovery

This app helps with discovery and analysis of any [Azgaar Fantasy Map](https://azgaar.github.io/Fantasy-Map-Generator/)

It is a console app that can search, query and even use SQL to help you understand the land and its peoples.

## Map

First, acquire a map!

1. Visit <https://azgaar.github.io/Fantasy-Map-Generator/>
1. Generate a map that you like.
1. Click the arrow in the upper left corner of the site.
1. In the popup menu, find and click the *Export* button along the bottom.
1. Then choose **full** *Export to JSON* and save it to your computer.
    * The directory should be convenient to this app. Consider putting it right in this project's directory.
    * Consider renaming it to something short.

This app uses that JSON.

## Usage

These instructions assume you are familiar with Node.js, command line interfaces and you know how to install this repo. If not, please check [Installation](#installation) below.

After installation, navigate to the project directory and type

```
node index.js search --help
```

You should see the following output:

```
index.js search

Query specific information from the JSON file

Options:
  --version     Show version number                                    [boolean]
  --help        Show help                                              [boolean]
  --file        Path to the JSON file                        [string] [required]
  --path        Path to the property in the JSON object (use dot notation)
                                                                        [string]
  --term        Query string or regex pattern                           [string]
  --properties  Comma-separated list of properties to display (ignores
                non-existent properties)                                [string]
  --sql         SQL query string to perform on JSON data                [string]
```

This README covers what these options mean. Be sure to check out the [Examples](#examples) section below.

### --file

File is required, and is a relative path to your map.

```
node index.js search --file=Chuely.json --term="culture"
```

### --path

The "path" option is used to retrieve the value of a specific JSON path within the dataset. It allows you to extract information from nested JSON objects. To use the "path" option, run:

```
node index.js search --path [json_path]
```

Replace `[json_path]` with the desired JSON path to the object you want to extract.

### --term

The "term" option is used to search for specific terms within the dataset. This can be useful for finding specific locations, biomes, or other information related to your map. To use the "term" option, run:

```
node index.js search --term [search_term]
```

Replace `[search_term]` with the term you want to search for. This searches both paths and values for the term. It can be a string or a regex.

```
node index.js search --file=Chuely.json --term="infantry"
node index.js search --file=Chuely.json --term=Betford
node index.js search --file=Chuely.json --term=/name$/
```

### --properties

The `--properties` option is used to filter the JSON output by specifying the properties you want to display. You can provide a comma-separated list of property names, and the output will only include those properties. For example, to see only the `name` and `population` properties of the `burgs`:

```
node index.js search --file Chuely.json --path cells.burgs --properties name,population
```

Other uses of `--properties`

```
node index.js search --file Chuely.json --path cells.rivers --properties name,type
node index.js search --file Chuely.json --path cells.features --properties type,group
```

### --sql

The "sql" option allows you to execute SQL queries on the dataset. This can be useful for extracting information or analyzing the data in various ways. Note that if this option is defined, all options (other than `--file`) are ignored. To use the "sql" option, run:

```
node index.js search --sql [sql_query]
```

Replace `[sql_query]` with a valid SQL query for the dataset. Generally that should be a `SELECT` query.

```
node index.js search --file=Chuely.json --sql="SELECT * FROM cells WHERE road=1"
```

You can list all of the tables available to query by using:
```
node index.js search --file=Chuely.json --sql="SELECT VALUE listTables()"
```
and that should return:
```JSON
[
  'cells',     'features',
  'cultures',  'burgs',
  'states',    'provinces',
  'religions', 'rivers',
  'markers',   'biomes',
  'notes'
]
```

You can also use paths in your SQL query by using the special `pathValue` function:
```
node index.js search --file=Chuely.json --sql="SELECT VALUE pathValue('settings.mapName')"

// 'Chuely'
```

## Examples

Search for a specific term:

```
node index.js search --term /tavern/
```

Execute an SQL query:

```
node index.js search --sql "SELECT * FROM notes"
```

List the populations of all the burgs:

```
node index.js search --file=Chuely.json --sql="SELECT name, CAST(population * 1000 AS INTEGER) AS population FROM burgs"
```

List the states and their capitals:
```
node index.js search --file=Chuely.json --sql="SELECT states.name AS state_name, burgs.name AS capital_name FROM states JOIN burgs ON states.capital = burgs.i"
```

List the burgs and their biomes:
```
node index.js search --file=Chuely.json --sql="SELECT burgs.name AS burg_name, biomes.name AS biome FROM burgs JOIN cells ON burgs.cell = cells.i JOIN biomes ON cells.biome = biomes.i"
```

Retrieve the value of a specific JSON path:

```
node index.js search --file Chuely.json --path "cells.cells.733.biome" 
```

List the populations of all the burgs - using `settings.populationRate` as the mutliplier:
```
node index.js search --file=Chuely.json --sql="SELECT name, CAST(population * pathValue('settings.populationRate') AS INTEGER) AS population FROM burgs"
```
### Details

#### path

A [path](#path) is a way to look at a specific value in the JSON file. It helps you navigate through the structure of the file and access the information you need. Make a path by separating properties with a `.`

The top-level terms are: info, settings, coords, cells, vertices, biomes, notes, nameBases

In order to see all of the religions, for instance, you could do:

```
node index.js search --file=Chuely.json --path=cells.religions
```

which might return

```JSON
[
  { name: 'No religion', i: 0, origins: null },
  {
    name: 'Tetbuton Deities',
    type: 'Folk',
    form: 'Polytheism',
    culture: 1,
    center: 4916,
    deity: 'Westclesto, The New',
    expansion: 'culture',
    expansionism: 0,
    color: '#c6b9c1',
    i: 1,
    code: 'TD',
    origins: [ 0 ]
  },
  {
...
```

If you want to look at just one element of an array, you can add its index number on the end like this:

```
node index.js search --file=Chuely.json --path=cells.states.5
```

which would return your map's version of state #5

```JSON
{
  i: 5,
  color: '#a6d854',
  name: 'Betnes',
  expansionism: 1.4,
  capital: 5,
  type: 'Lake',
  center: 4077,
  culture: 7,
...
```

The top-level property `cells` is massive. I don't recommend doing:

```
node index.js search --file=Chuely.json --path="cells"
```

Instead, use it with one of its subpaths: features, cultures, burgs, states, provinces, religions, rivers, markers

```
node index.js search --file=Chuely.json --path="cells.rivers"
```

#### sql

This app uses the [AlaSQL](https://github.com/AlaSQL/alasql#readme) library to parse your SQL queries.

SQL is a programming language designed for managing and manipulating relational databases that allows you to retrieve data from one or more *tables* using the SELECT statement and join them together based on specified conditions to create a combined result set. If you need more information, I can recommend [Khan Academy](https://www.khanacademy.org/computing/computer-programming/sql)

There are two custom functions you can use in your SQL query:

#### 1. listTables

This function is used to list all the tables that are currently available in the database.

```
$ node index.js search --file=Chuely.json --sql="SELECT VALUE listTables()"

[
  'cells',     'features',
  'cultures',  'burgs',
  'states',    'provinces',
  'religions', 'rivers',
  'markers',   'biomes',
  'notes'
]
```

You can use this to help construct your queries: `SELECT * FROM provinces` for example.

#### 2. pathValue

This function takes a JSON path as a string and returns the value at that path in the JSON object. See [path](#path) to see how to constuct a `path`

```
node index.js search --file=Chuely.json --sql="SELECT VALUE pathValue('settings.mapName')"
```

Replace `settings.mapName` with the desired JSON path, using dots to separate the levels. This will return the value found at the specified JSON path.

#### term

`--term` uses a string or regular expressions (regex) to match your search. I've had the best luck using regex `/whatever/` than strings `"whatever"`. If you'd like to learn more about regular expressions, <https://regexr.com/> seems pretty okay.

Using `--term` returns the value and the path to that value.  e.g.

```
$ node index.js search --file=Chuely.json --term=/military/

...
settings.options.military.4.crew: 100
settings.options.military.4.power: 50
settings.options.military.4.type: naval
settings.options.military.4.separate: 1
cells.states.1.military.0.i: 0
cells.states.1.military.0.a: 12368
...

$ node index.js search --file=Chuely.json --path settings.options.military.4.power

50
```

## Installation

Follow these steps to get the application up and running on your local machine:

1. Ensure that you have Node.js installed on your system. If you don't have it installed, you can download it from the [official Node.js website](https://nodejs.org/).

2. Clone or download the repository to your local machine.

3. Open a terminal or command prompt, and navigate to the root directory of the cloned or downloaded repository.

4. Run the following command to install the required dependencies:

```
   npm install
```

5. After the dependencies are installed, you can run the application using the following command:

```
   node app.js <options>
```

Replace `<options>` with the desired command-line options, as explained in the [Usage](#usage) section.

That's it! You should now be able to use the application on your local machine.
