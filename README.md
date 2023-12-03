# App for Azgaar Fantasy Map Discovery

This app helps with discovery and analysis of any [Azgaar Fantasy Map](https://azgaar.github.io/Fantasy-Map-Generator/)

It is a console app that can search, query and even use SQL to help you understand the land and its peoples.

## Map

First, acquire a map!

1. Visit <https://azgaar.github.io/Fantasy-Map-Generator/>
1. Generate a map that you like.
1. Click the arrow in the upper left corner of the site.
1. In the popup menu, find and click the _Export_ button along the bottom.
1. Then choose **full** _Export to JSON_ and save it to your computer.
   - The directory should be convenient to this app. Consider putting it right in this project's directory.
   - Consider renaming it to something short.
1. After saving, you can view the map on the website by finding the `info.seed` value (e.g. `"seed": "126920625"`) and then putting that number value in the *Menu => Options => Map seed* field

This app uses that JSON.

## Usage

These instructions assume you are familiar with Node.js, command line interfaces and you know how to install this repo. If not, please check [Installation](#installation) below.

There is a [search](#search-command) command and a [route](#route-command) command.

### search command

After installation, navigate to the project directory and type

```
node dist/index.js search --help
```

You should see the following output:

```
dist/index.js search

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

File is required, and is a relative path to the json file you downloaded in the first step.

```
node dist/index.js search --file=Chuely.json --term="culture"
```

If the app does not find it, you will see an error like `Error reading the JSON file: Error: ENOENT: no such file or directory`

### --path

The "path" option is used to retrieve the value of a specific JSON path within the dataset. It allows you to extract information from nested JSON objects. To use the "path" option, run:

```
node dist/index.js search --path [json_path]
```

Replace `[json_path]` with the desired JSON path to the object you want to extract. See [Examples](#examples) and [Details](#details) below for more about how to write a _path_.

```
node dist/index.js search --file=Chuely.json --path info
node dist/index.js search --file=Chuely.json --path settings
node dist/index.js search --file=Chuely.json --path settings.distanceUnit
node dist/index.js search --file=Chuely.json --path settings.options.year
```

### --term

The "term" option is used to search for specific terms within the dataset and it returns the *JSON path* where that term is used. To use the "term" option, run:

```
node dist/index.js search --term [search_term]
```

Replace `[search_term]` with the term you want to search for. This searches both paths and values for the term. It can be a string or a regex.

```
node dist/index.js search --file=Chuely.json --term="infantry"
```

returns the paths where "infantry" occurs:

```
settings.options.military.0.name: infantry
```

In this case, it is used only once.  You can then take a look at that path by using:
```bash
node dist/index.js search --file=Chuely.json --path="settings.options.military.0"
```

which returns:
```JSON
{
  icon: '⚔️',
  name: 'infantry',
  rural: 0.25,
  urban: 0.2,
  crew: 1,
  power: 1,
  type: 'melee',
  separate: 0
}
```

To use a regular expression, insert it between two slashes. This example returns any path where "name" is at the end: effectively, all names in the world.

```bash
node dist/index.js search --file=Chuely.json --term=/name$/
```
```
settings.options.military.0.name: infantry
settings.options.military.1.name: archers
settings.options.military.2.name: cavalry
settings.options.military.3.name: artillery
settings.options.military.4.name: fleet
pack.features.5.name: Berzogollo
pack.features.6.name: Moyoma
pack.features.7.name: Opolissos
pack.features.8.name: Okobalyurt
pack.features.12.name: Chandmadar
pack.features.13.name: Chirwon
pack.features.16.name: Metharmah
pack.features.17.name: Villeres
pack.features.18.name: Bobelelesely
pack.features.20.name: Hajfagyecsany
...
```

### --properties

The `--properties` option is used to filter the JSON output by specifying the properties you want to display. You can provide a comma-separated list of property names, and the output will only include those properties. For example, to see only the `name` and `population` properties of the `burgs`:

```bash
node dist/index.js search --file Chuely.json --path pack.burgs --properties name,population
```

```JSON
[
  {},
  { name: 'Gaury', population: 13.802 },
  { name: 'Exandna', population: 35.054 },
  { name: 'Juktos', population: 66.189 },
  { name: 'Gang', population: 55.573 },
  { name: 'Zaoliasto', population: 69.184 },
  { name: 'Erdieauvil', population: 12.952 },
  { name: 'Huecanar', population: 19.395 },
  { name: 'Valmera', population: 5.419 },
  { name: 'Cleauchare', population: 19.402 },
  { name: 'Bay', population: 4.724 },
  ...
]
```

Other uses of `--properties`

```bash
node dist/index.js search --file Chuely.json --path pack.rivers --properties name,type
node dist/index.js search --file Chuely.json --path pack.features --properties type,group
```

### --sql

The "sql" option allows you to execute SQL queries on the dataset. This can be useful for extracting information or analyzing the data in various ways. Note that if this option is defined, all options (other than `--file`) are ignored. To use the "sql" option, run:

```
node dist/index.js search --sql [sql_query]
```

Replace `[sql_query]` with a valid SQL query for the dataset. Generally that should be a `SELECT` query.

```
node dist/index.js search --file=Chuely.json --sql="SELECT i,state,p FROM cells WHERE road=1"
```

This will return all of the cells on the map that contain road with id 1:
```JSON
[
  { i: 6, state: 0, p: [ 1414.74, 214.02 ] },
  { i: 7, state: 0, p: [ 1406, 220.7 ] }, 

  ...

  { i: 5007, state: 0, p: [ 613.5, 1133.3 ] },
  { i: 5039, state: 0, p: [ 596.62, 1141.69 ] },
  { i: 5040, state: 0, p: [ 607.28, 1141.81 ] }
]
```
Apparently road 1 is quite long.


You can list all of the tables available to query by using:

```
node dist/index.js search --file=Chuely.json --sql="SELECT VALUE listTables()"
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

This shows you all of the groupings that you can search:

```
node dist/index.js search --file=Chuely.json --sql="SELECT * FROM cultures"
node dist/index.js search --file=Chuely.json --sql="SELECT * FROM cultures WHERE expansionism>2"
node dist/index.js search --file=Chuely.json --sql="SELECT UNIQUE type FROM cultures"
node dist/index.js search --file=Chuely.json --sql="SELECT * FROM cultures WHERE type='Nomadic'"
node dist/index.js search --file=Chuely.json --sql="SELECT * FROM religions"
```

You can also perform joins on different tables:

```bash
node dist/index.js search --file=Chuely.json --sql="SELECT religions.name, religions.type, religions.form, cultures.name AS culture FROM religions LEFT JOIN cultures ON religions.culture = cultures.i"
```

which returns something like this:
```JSON
[
  {
    name: 'No religion',
    type: undefined,
    form: undefined,
    culture: undefined
  },
  {
    name: 'Luari Beliefs',
    type: 'Folk',
    form: 'Nature Worship',
    culture: 'Luari'
  },
  {
    name: 'Slovan Beliefs',
    type: 'Folk',
    form: 'Nature Worship',
    culture: 'Slovan'
  },
  {
    name: 'Angshire Beliefs',
    type: 'Folk',
    form: 'Shamanism',
    culture: 'Angshire'
  },
  {
    name: 'Soumi Spirits',
    type: 'Folk',
    form: 'Animism',
    culture: 'Soumi'
  },
  {
    name: 'Norse Beliefs',
    type: 'Folk',
    form: 'Shamanism',
    culture: 'Norse'
  },
  {
    name: 'Shwazen Beliefs',
    type: 'Folk',
    form: 'Shamanism',
    culture: 'Shwazen'
  },
  {
    name: 'Old Vengrian Shamanism',
    type: 'Folk',
    form: 'Shamanism',
    culture: 'Vengrian'
  },
  {
    name: 'Romian Spirits',
    type: 'Folk',
    form: 'Animism',
    culture: 'Romian'
  },
  {
    name: 'Tallian Beliefs',
    type: 'Folk',
    form: 'Nature Worship',
    culture: 'Tallian'
  },
  {
    name: 'Ulus Beliefs',
    type: 'Folk',
    form: 'Nature Worship',
    culture: 'Ulus'
  },
  {
    name: 'Elladan Shamanism',
    type: 'Folk',
    form: 'Shamanism',
    culture: 'Elladan'
  },
  {
    name: 'Old Astellian Beliefs',
    type: 'Folk',
    form: 'Animism',
    culture: 'Astellian'
  },
  {
    name: 'Portuzian Beliefs',
    type: 'Folk',
    form: 'Ancestor Worship',
    culture: 'Portuzian'
  },
  {
    name: 'Hebrew Spirits',
    type: 'Folk',
    form: 'Animism',
    culture: 'Hebrew'
  },
  {
    name: 'Eurabic Druids',
    type: 'Folk',
    form: 'Nature Worship',
    culture: 'Eurabic'
  },
  {
    name: 'Koryo Spirits',
    type: 'Folk',
    form: 'Animism',
    culture: 'Koryo'
  },
  {
    name: 'Turchian Spirits',
    type: 'Folk',
    form: 'Animism',
    culture: 'Turchian'
  },
  {
    name: 'Zaoliast Church',
    type: 'Organized',
    form: 'Monotheism',
    culture: 'Astellian'
  },
  {
    name: 'Juktian Faith',
    type: 'Organized',
    form: 'Monotheism',
    culture: 'Elladan'
  },
  {
    name: 'Word of Goasungyeon',
    type: 'Organized',
    form: 'Pantheism',
    culture: 'Koryo'
  },
  {
    name: 'Path of Auly',
    type: 'Organized',
    form: 'Dualism',
    culture: 'Luari'
  },
  {
    name: 'Vengrian Gods',
    type: 'Organized',
    form: 'Polytheism',
    culture: 'Vengrian'
  },
  {
    name: 'Path of Pyrtene',
    type: 'Organized',
    form: 'Monotheism',
    culture: 'Elladan'
  },
  {
    name: 'Alalaretism',
    type: 'Organized',
    form: 'Dualism',
    culture: 'Astellian'
  },
  {
    name: 'Astellianism',
    type: 'Organized',
    form: 'Monotheism',
    culture: 'Astellian'
  },
  {
    name: 'Occultism of the Hungry Divine One',
    type: 'Cult',
    form: 'Dark Cult',
    culture: 'Astellian'
  },
  {
    name: 'Atforish Heresy',
    type: 'Heresy',
    form: 'Heresy',
    culture: 'Angshire'
  }
]
```

You can also use paths in your SQL query by using the special `pathValue` function:

```
node dist/index.js search --file=Chuely.json --sql="SELECT VALUE pathValue('settings.mapName')"
```

which just returns the name of the map: `Chuely`

### Search Examples

Search for a specific term:

```
node dist/index.js search --file=Chuely.json --term /character/
```

Execute an SQL query:

```
node dist/index.js search --file=Chuely.json --sql "SELECT * FROM notes"
```

List the populations of all the burgs ordered by population starting with the largest:

```
node dist/index.js search --file=Chuely.json --sql="SELECT name, CAST(population * 1000 AS INTEGER) AS population FROM burgs ORDER by population DESC"
```

List the states, their capitals and cultures:

```
node dist/index.js search --file=Chuely.json --sql="SELECT states.fullName AS state, burgs.name AS capital, cultures.name AS culture FROM states JOIN burgs ON states.capital = burgs.i  JOIN cultures ON states.culture = cultures.i"
```
```JSON
[
  { state: 'Principality of Gauria', capital: 'Gaury', culture: 'Luari' },
  { state: 'Principality of Tera', capital: 'Exandna', culture: 'Elladan' },
  { state: 'Brauronian Theocracy', capital: 'Juktos', culture: 'Elladan' },
  { state: 'Republic of Song', capital: 'Gang', culture: 'Koryo' },
  { state: 'Tembladian Theocracy', capital: 'Zaoliasto', culture: 'Astellian' },
  { state: 'Kingdom of Gisisecoq', capital: 'Erdieauvil', culture: 'Luari' },
  { state: 'Principality of Milas', capital: 'Huecanar', culture: 'Astellian' },
  { state: 'Divine Principality of Aloriosia', capital: 'Valmera', culture: 'Astellian' },
  { state: 'Kingdom of Souneufia', capital: 'Cleauchare', culture: 'Luari' },
  { state: 'Republic of Balkan', capital: 'Bay', culture: 'Turchian' },
  { state: 'Duchy of Alvezia', capital: 'Cuerino', culture: 'Astellian' },
  { state: 'Ganian Empire', capital: 'Puebla', culture: 'Astellian' },
  { state: 'Betsatian Empire', capital: 'Zikhle', culture: 'Hebrew' },
  { state: 'Grand Duchy of Senilveria', capital: 'Mangui', culture: 'Astellian' },
  { state: 'Grand Duchy of Lornia', capital: 'Nesploy', culture: 'Luari' }
]
```

List the burgs and their biomes:

```
node dist/index.js search --file=Chuely.json --sql="SELECT burgs.name AS burg_name, biomes.name AS biome FROM burgs JOIN cells ON burgs.cell = cells.i JOIN biomes ON cells.biome = biomes.i"
```

Retrieve the value of a specific JSON path:

```
node dist/index.js search --file Chuely.json --path "pack.cells.733.biome"
```

List the populations of all the burgs - using `settings.populationRate` as the mutliplier:

```
node dist/index.js search --file=Chuely.json --sql="SELECT name, CAST(population * pathValue('settings.populationRate') AS INTEGER) AS population FROM burgs ORDER BY population DESC"
```

### Details

#### path

A [path](#path) is a way to look at a specific value in the JSON file. It helps you navigate through the structure of the file and access the information you need. Make a path by separating properties with a `.`

The top-level terms are: info, settings, pack, grid, biomesData, notes, nameBases

In order to see all of the religions, for instance, you could do:

```
node dist/index.js search --file=Chuely.json --path=pack.religions
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
node dist/index.js search --file=Chuely.json --path=pack.states.5
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

The top-level property `pack` is massive. This will spam you with unvariegated JSON objects:

```
node dist/index.js search --file=Chuely.json --path="pack"
```

Instead, use it with one of its subpaths: features, cultures, burgs, states, provinces, religions, rivers, markers

```
node dist/index.js search --file=Chuely.json --path="pack.rivers"
```

#### sql

This app uses the [AlaSQL](https://github.com/AlaSQL/alasql#readme) library to parse your SQL queries.

SQL is a programming language designed for managing and manipulating relational databases that allows you to retrieve data from one or more _tables_ using the SELECT statement and join them together based on specified conditions to create a combined result set. If you need more information, I can recommend [Khan Academy](https://www.khanacademy.org/computing/computer-programming/sql)

There are two custom functions you can use in your SQL query:

#### 1. listTables

This function is used to list all the tables that are currently available in the database.

```
$ node dist/index.js search --file=Chuely.json --sql="SELECT VALUE listTables()"

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
node dist/index.js search --file=Chuely.json --sql="SELECT VALUE pathValue('settings.mapName')"
```

Replace `settings.mapName` with the desired JSON path, using dots to separate the levels. This will return the value found at the specified JSON path.

#### term

`--term` uses a string or regular expressions (regex) to match your search. I've had the best luck using regex `/whatever/` than strings `"whatever"`. If you'd like to learn more about regular expressions, <https://regexr.com/> seems pretty okay.

Using `--term` returns the value and the path to that value. e.g.

```
 node dist/index.js search --file=Chuely.json --term=/military/

...
settings.options.military.4.crew: 100
settings.options.military.4.power: 50
settings.options.military.4.type: naval
settings.options.military.4.separate: 1
pack.states.1.military.0.i: 0
pack.states.1.military.0.a: 12368
...

$ node dist/index.js search --file=Chuely.json --path settings.options.military.4.power

50
```

### route command

Pathfinding. Use the `route` command to find the shortest route a traveller can take from one location to another.

`node dist/index.js route --help` gives these instructions

```
index.js route

Find the shortest route between locations in the map

Options:
  --version    Show version number
  --help       Show help
  --file       Path to the JSON file
  --locations  Comma-separated list of cell indices or location names (start, intermediate1, intermediate2, ..., end)
```

#### examples

If you want to follow along the examples, Nidyia has seed `126920625` and Chuely has seed `570163886`.

Type the `--locations` separated by commas.

`node dist/index.js route --locations="Skalt'hanek,Nanarras,Sargush,Rralerjass" --file=RAW/Nidyia.json`

The first location is the start and the others are visited in turn:

```
Cell i: 79, distance: 0 mi, burg: Skalt'hanek, biome: Temperate rainforest, position: (590.57, 217.21)
Cell i: 144, distance: 41.7 mi,  biome: Temperate rainforest, position: (598.88, 223.51)
Cell i: 84, distance: 112.4 mi, burg: Nanarras, biome: Temperate rainforest, position: (616.5, 224.7)
Cell i: 81, distance: 162.3 mi, burg: Sargush, biome: Temperate rainforest, position: (626.31, 216.97)
Cell i: 38, distance: 207.6 mi,  biome: Temperate rainforest, position: (622.5, 206.3)
Cell i: 37, distance: 253.2 mi, burg: Rralerjass, biome: Temperate rainforest, position: (618.73, 195.54)
```

You can type the name in lowercase and without spaces or other marks, if that's easier:

`node dist/index.js route --locations="skalthanek,nanarras,sargush,rralerjass" --file=RAW/Nidyia.json`

You can also use the cell ids for unnamed locations without a burg, like so:

`node dist/index.js route --file Nidyia.json --locations 3679,4186`

To find the correct cell id, open the _Cell Details_ window on the website,
hover your cursor over the part of the map for which you want the cell id and
observe the first number, labeled *Cell* (e.g. `Cell: 3284`). Use that number
in the `--locations` option.

To open the _Cell Details_ window open the menu, then click _Tools_ then _Click to overview: Cells_.

## Installation

Follow these steps to get the application up and running on your local machine:

1. Ensure that you have Node.js installed on your system. If you don't have it installed, you can download it from the [official Node.js website](https://nodejs.org/).

2. Clone or download the repository to your local machine.

3. Open a terminal or command prompt, and navigate to the root directory of the cloned or downloaded repository.

4. Run the following command to install the required dependencies:

```
   npm install
```

5. After the dependencies are installed, make sure it works using the following command:

```
   node dist/index.js search
```

If you see something like `Query specifc information in the JSON file` you are good to go.

That's it! You should now be able to use the application on your local machine.
