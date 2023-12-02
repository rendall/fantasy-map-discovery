import type { FantasyMap, Pack } from "./lib/map-types";
import * as fs from 'fs';
// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
// To parse this data:
//
//   import { Convert, Map } from "./file";
//
//   const map = Convert.toMap(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.
export const VERSION = '1.95.00';
export class Convert {
    public static toMap(json: string): FantasyMap {
        return cast(JSON.parse(json), r("Map"));
    }

    public static mapToJson(value: FantasyMap): string {
        return JSON.stringify(uncast(value, r("Map")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Map": o([
        { json: "info", js: "info", typ: r("Info") },
        { json: "settings", js: "settings", typ: r("Settings") },
        { json: "coords", js: "coords", typ: r("Coords") },
        { json: "cells", js: "cells", typ: r("Cells") },
        { json: "vertices", js: "vertices", typ: a(r("Vertex")) },
        { json: "biomes", js: "biomes", typ: r("Biomes") },
        { json: "notes", js: "notes", typ: a(r("Note")) },
        { json: "nameBases", js: "nameBases", typ: a(r("NameBase")) },
    ], false),
    "Biomes": o([
        { json: "i", js: "i", typ: a(0) },
        { json: "name", js: "name", typ: a("") },
        { json: "color", js: "color", typ: a("") },
        { json: "biomesMartix", js: "biomesMartix", typ: a(m(0)) },
        { json: "habitability", js: "habitability", typ: a(0) },
        { json: "iconsDensity", js: "iconsDensity", typ: a(0) },
        { json: "icons", js: "icons", typ: a(a("")) },
        { json: "cost", js: "cost", typ: a(0) },
    ], false),
    "Cells": o([
        { json: "cells", js: "cells", typ: a(r("Cell")) },
        { json: "features", js: "features", typ: a(u(r("FeatureClass"), 0)) },
        { json: "cultures", js: "cultures", typ: a(r("Culture")) },
        { json: "burgs", js: "burgs", typ: a(r("Burg")) },
        { json: "states", js: "states", typ: a(r("State")) },
        { json: "provinces", js: "provinces", typ: a(u(r("ProvinceClass"), 0)) },
        { json: "religions", js: "religions", typ: a(r("Religion")) },
        { json: "rivers", js: "rivers", typ: a(r("River")) },
        { json: "markers", js: "markers", typ: a(r("Marker")) },
    ], false),
    "Burg": o([
        { json: "cell", js: "cell", typ: u(undefined, 0) },
        { json: "x", js: "x", typ: u(undefined, 3.14) },
        { json: "y", js: "y", typ: u(undefined, 3.14) },
        { json: "state", js: "state", typ: u(undefined, 0) },
        { json: "i", js: "i", typ: u(undefined, 0) },
        { json: "culture", js: "culture", typ: u(undefined, 0) },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "feature", js: "feature", typ: u(undefined, 0) },
        { json: "capital", js: "capital", typ: u(undefined, 0) },
        { json: "port", js: "port", typ: u(undefined, 0) },
        { json: "population", js: "population", typ: u(undefined, 3.14) },
        { json: "type", js: "type", typ: u(undefined, r("BurgType")) },
        { json: "coa", js: "coa", typ: u(undefined, r("Coa")) },
        { json: "citadel", js: "citadel", typ: u(undefined, 0) },
        { json: "plaza", js: "plaza", typ: u(undefined, 0) },
        { json: "walls", js: "walls", typ: u(undefined, 0) },
        { json: "shanty", js: "shanty", typ: u(undefined, 0) },
        { json: "temple", js: "temple", typ: u(undefined, 0) },
    ], false),
    "Coa": o([
        { json: "t1", js: "t1", typ: "" },
        { json: "ordinaries", js: "ordinaries", typ: u(undefined, a(r("Ordinary"))) },
        { json: "charges", js: "charges", typ: u(undefined, a(r("Charge"))) },
        { json: "shield", js: "shield", typ: r("Shield") },
        { json: "division", js: "division", typ: u(undefined, r("DivisionClass")) },
    ], false),
    "Charge": o([
        { json: "charge", js: "charge", typ: "" },
        { json: "t", js: "t", typ: r("T") },
        { json: "p", js: "p", typ: "" },
        { json: "size", js: "size", typ: 3.14 },
        { json: "divided", js: "divided", typ: u(undefined, r("Divided")) },
        { json: "sinister", js: "sinister", typ: u(undefined, 0) },
        { json: "reversed", js: "reversed", typ: u(undefined, 0) },
    ], false),
    "DivisionClass": o([
        { json: "division", js: "division", typ: r("DivisionEnum") },
        { json: "t", js: "t", typ: "" },
        { json: "line", js: "line", typ: u(undefined, "") },
    ], false),
    "Ordinary": o([
        { json: "ordinary", js: "ordinary", typ: "" },
        { json: "t", js: "t", typ: r("T") },
        { json: "line", js: "line", typ: u(undefined, "") },
        { json: "divided", js: "divided", typ: u(undefined, "") },
    ], false),
    "Cell": o([
        { json: "i", js: "i", typ: 0 },
        { json: "v", js: "v", typ: a(0) },
        { json: "c", js: "c", typ: a(0) },
        { json: "p", js: "p", typ: a(3.14) },
        { json: "g", js: "g", typ: 0 },
        { json: "h", js: "h", typ: 0 },
        { json: "area", js: "area", typ: 0 },
        { json: "f", js: "f", typ: 0 },
        { json: "t", js: "t", typ: 0 },
        { json: "haven", js: "haven", typ: 0 },
        { json: "harbor", js: "harbor", typ: 0 },
        { json: "fl", js: "fl", typ: 0 },
        { json: "r", js: "r", typ: 0 },
        { json: "conf", js: "conf", typ: 0 },
        { json: "biome", js: "biome", typ: 0 },
        { json: "s", js: "s", typ: 0 },
        { json: "pop", js: "pop", typ: 3.14 },
        { json: "culture", js: "culture", typ: 0 },
        { json: "burg", js: "burg", typ: 0 },
        { json: "road", js: "road", typ: 0 },
        { json: "crossroad", js: "crossroad", typ: 0 },
        { json: "state", js: "state", typ: 0 },
        { json: "religion", js: "religion", typ: 0 },
        { json: "province", js: "province", typ: 0 },
    ], false),
    "Culture": o([
        { json: "name", js: "name", typ: "" },
        { json: "i", js: "i", typ: 0 },
        { json: "base", js: "base", typ: 0 },
        { json: "origins", js: "origins", typ: a(u(0, null)) },
        { json: "shield", js: "shield", typ: r("Shield") },
        { json: "center", js: "center", typ: u(undefined, 0) },
        { json: "color", js: "color", typ: u(undefined, "") },
        { json: "type", js: "type", typ: u(undefined, "") },
        { json: "expansionism", js: "expansionism", typ: u(undefined, 3.14) },
        { json: "code", js: "code", typ: u(undefined, "") },
    ], false),
    "FeatureClass": o([
        { json: "i", js: "i", typ: 0 },
        { json: "land", js: "land", typ: true },
        { json: "border", js: "border", typ: true },
        { json: "type", js: "type", typ: r("FeatureType") },
        { json: "cells", js: "cells", typ: 0 },
        { json: "firstCell", js: "firstCell", typ: 0 },
        { json: "group", js: "group", typ: "" },
        { json: "area", js: "area", typ: u(undefined, 3.14) },
        { json: "vertices", js: "vertices", typ: u(undefined, a(0)) },
        { json: "shoreline", js: "shoreline", typ: u(undefined, a(0)) },
        { json: "height", js: "height", typ: u(undefined, 3.14) },
        { json: "flux", js: "flux", typ: u(undefined, 0) },
        { json: "temp", js: "temp", typ: u(undefined, 3.14) },
        { json: "evaporation", js: "evaporation", typ: u(undefined, 0) },
        { json: "inlets", js: "inlets", typ: u(undefined, a(0)) },
        { json: "outlet", js: "outlet", typ: u(undefined, 0) },
        { json: "name", js: "name", typ: u(undefined, "") },
    ], false),
    "Marker": o([
        { json: "icon", js: "icon", typ: "" },
        { json: "type", js: "type", typ: "" },
        { json: "px", js: "px", typ: u(undefined, 0) },
        { json: "x", js: "x", typ: 3.14 },
        { json: "y", js: "y", typ: 3.14 },
        { json: "cell", js: "cell", typ: 0 },
        { json: "i", js: "i", typ: 0 },
        { json: "dy", js: "dy", typ: u(undefined, 0) },
        { json: "dx", js: "dx", typ: u(undefined, 0) },
    ], false),
    "ProvinceClass": o([
        { json: "i", js: "i", typ: 0 },
        { json: "state", js: "state", typ: 0 },
        { json: "center", js: "center", typ: 0 },
        { json: "burg", js: "burg", typ: 0 },
        { json: "name", js: "name", typ: "" },
        { json: "formName", js: "formName", typ: "" },
        { json: "fullName", js: "fullName", typ: "" },
        { json: "color", js: "color", typ: "" },
        { json: "coa", js: "coa", typ: r("Coa") },
    ], false),
    "Religion": o([
        { json: "name", js: "name", typ: "" },
        { json: "i", js: "i", typ: 0 },
        { json: "origins", js: "origins", typ: u(a(0), null) },
        { json: "type", js: "type", typ: u(undefined, r("ReligionType")) },
        { json: "form", js: "form", typ: u(undefined, "") },
        { json: "culture", js: "culture", typ: u(undefined, 0) },
        { json: "center", js: "center", typ: u(undefined, 0) },
        { json: "deity", js: "deity", typ: u(undefined, u(null, "")) },
        { json: "expansion", js: "expansion", typ: u(undefined, r("Expansion")) },
        { json: "expansionism", js: "expansionism", typ: u(undefined, 3.14) },
        { json: "color", js: "color", typ: u(undefined, "") },
        { json: "code", js: "code", typ: u(undefined, "") },
    ], false),
    "River": o([
        { json: "i", js: "i", typ: 0 },
        { json: "source", js: "source", typ: 0 },
        { json: "mouth", js: "mouth", typ: 0 },
        { json: "discharge", js: "discharge", typ: 0 },
        { json: "length", js: "length", typ: 3.14 },
        { json: "width", js: "width", typ: 3.14 },
        { json: "widthFactor", js: "widthFactor", typ: 3.14 },
        { json: "sourceWidth", js: "sourceWidth", typ: 0 },
        { json: "parent", js: "parent", typ: 0 },
        { json: "cells", js: "cells", typ: a(0) },
        { json: "basin", js: "basin", typ: 0 },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: r("RiverType") },
    ], false),
    "State": o([
        { json: "i", js: "i", typ: 0 },
        { json: "name", js: "name", typ: "" },
        { json: "urban", js: "urban", typ: 3.14 },
        { json: "rural", js: "rural", typ: 3.14 },
        { json: "burgs", js: "burgs", typ: 0 },
        { json: "area", js: "area", typ: 0 },
        { json: "cells", js: "cells", typ: 0 },
        { json: "neighbors", js: "neighbors", typ: a(0) },
        { json: "diplomacy", js: "diplomacy", typ: a(u(a(""), r("DiplomacyEnum"))) },
        { json: "provinces", js: "provinces", typ: a(0) },
        { json: "color", js: "color", typ: u(undefined, "") },
        { json: "expansionism", js: "expansionism", typ: u(undefined, 3.14) },
        { json: "capital", js: "capital", typ: u(undefined, 0) },
        { json: "type", js: "type", typ: u(undefined, "") },
        { json: "center", js: "center", typ: u(undefined, 0) },
        { json: "culture", js: "culture", typ: u(undefined, 0) },
        { json: "coa", js: "coa", typ: u(undefined, r("Coa")) },
        { json: "campaigns", js: "campaigns", typ: u(undefined, a(r("Campaign"))) },
        { json: "form", js: "form", typ: u(undefined, r("Form")) },
        { json: "formName", js: "formName", typ: u(undefined, "") },
        { json: "fullName", js: "fullName", typ: u(undefined, "") },
        { json: "pole", js: "pole", typ: u(undefined, a(3.14)) },
        { json: "alert", js: "alert", typ: u(undefined, 3.14) },
        { json: "military", js: "military", typ: u(undefined, a(r("StateMilitary"))) },
    ], false),
    "Campaign": o([
        { json: "name", js: "name", typ: "" },
        { json: "start", js: "start", typ: 0 },
        { json: "end", js: "end", typ: 0 },
    ], false),
    "StateMilitary": o([
        { json: "i", js: "i", typ: 0 },
        { json: "a", js: "a", typ: 0 },
        { json: "cell", js: "cell", typ: 0 },
        { json: "x", js: "x", typ: 3.14 },
        { json: "y", js: "y", typ: 3.14 },
        { json: "bx", js: "bx", typ: 3.14 },
        { json: "by", js: "by", typ: 3.14 },
        { json: "u", js: "u", typ: r("U") },
        { json: "n", js: "n", typ: 0 },
        { json: "name", js: "name", typ: "" },
        { json: "state", js: "state", typ: 0 },
        { json: "icon", js: "icon", typ: r("Icon") },
    ], false),
    "U": o([
        { json: "cavalry", js: "cavalry", typ: u(undefined, 0) },
        { json: "infantry", js: "infantry", typ: u(undefined, 0) },
        { json: "archers", js: "archers", typ: u(undefined, 0) },
        { json: "artillery", js: "artillery", typ: u(undefined, 0) },
        { json: "fleet", js: "fleet", typ: u(undefined, 0) },
    ], false),
    "Coords": o([
        { json: "latT", js: "latT", typ: 0 },
        { json: "latN", js: "latN", typ: 0 },
        { json: "latS", js: "latS", typ: 0 },
        { json: "lonT", js: "lonT", typ: 0 },
        { json: "lonW", js: "lonW", typ: 0 },
        { json: "lonE", js: "lonE", typ: 0 },
    ], false),
    "Info": o([
        { json: "version", js: "version", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "exportedAt", js: "exportedAt", typ: Date },
        { json: "mapName", js: "mapName", typ: "" },
        { json: "seed", js: "seed", typ: "" },
        { json: "mapId", js: "mapId", typ: 0 },
    ], false),
    "NameBase": o([
        { json: "name", js: "name", typ: "" },
        { json: "i", js: "i", typ: 0 },
        { json: "min", js: "min", typ: 0 },
        { json: "max", js: "max", typ: 0 },
        { json: "d", js: "d", typ: "" },
        { json: "m", js: "m", typ: 3.14 },
        { json: "b", js: "b", typ: "" },
    ], false),
    "Note": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "legend", js: "legend", typ: "" },
    ], false),
    "Settings": o([
        { json: "distanceUnit", js: "distanceUnit", typ: "" },
        { json: "distanceScale", js: "distanceScale", typ: "" },
        { json: "areaUnit", js: "areaUnit", typ: "" },
        { json: "heightUnit", js: "heightUnit", typ: "" },
        { json: "heightExponent", js: "heightExponent", typ: "" },
        { json: "temperatureScale", js: "temperatureScale", typ: "" },
        { json: "barSize", js: "barSize", typ: "" },
        { json: "barLabel", js: "barLabel", typ: "" },
        { json: "barBackOpacity", js: "barBackOpacity", typ: "" },
        { json: "barBackColor", js: "barBackColor", typ: "" },
        { json: "barPosX", js: "barPosX", typ: "" },
        { json: "barPosY", js: "barPosY", typ: "" },
        { json: "populationRate", js: "populationRate", typ: 0 },
        { json: "urbanization", js: "urbanization", typ: 0 },
        { json: "mapSize", js: "mapSize", typ: "" },
        { json: "latitudeO", js: "latitudeO", typ: "" },
        { json: "temperatureEquator", js: "temperatureEquator", typ: "" },
        { json: "temperaturePole", js: "temperaturePole", typ: "" },
        { json: "prec", js: "prec", typ: "" },
        { json: "options", js: "options", typ: r("Options") },
        { json: "mapName", js: "mapName", typ: "" },
        { json: "hideLabels", js: "hideLabels", typ: true },
        { json: "stylePreset", js: "stylePreset", typ: "" },
        { json: "rescaleLabels", js: "rescaleLabels", typ: true },
        { json: "urbanDensity", js: "urbanDensity", typ: 0 },
    ], false),
    "Options": o([
        { json: "pinNotes", js: "pinNotes", typ: true },
        { json: "showMFCGMap", js: "showMFCGMap", typ: true },
        { json: "winds", js: "winds", typ: a(0) },
        { json: "stateLabelsMode", js: "stateLabelsMode", typ: "" },
        { json: "year", js: "year", typ: 0 },
        { json: "era", js: "era", typ: "" },
        { json: "eraShort", js: "eraShort", typ: "" },
        { json: "military", js: "military", typ: a(r("OptionsMilitary")) },
    ], false),
    "OptionsMilitary": o([
        { json: "icon", js: "icon", typ: r("Icon") },
        { json: "name", js: "name", typ: "" },
        { json: "rural", js: "rural", typ: 3.14 },
        { json: "urban", js: "urban", typ: 3.14 },
        { json: "crew", js: "crew", typ: 0 },
        { json: "power", js: "power", typ: 0 },
        { json: "type", js: "type", typ: "" },
        { json: "separate", js: "separate", typ: 0 },
    ], false),
    "Vertex": o([
        { json: "p", js: "p", typ: a(3.14) },
        { json: "v", js: "v", typ: a(0) },
        { json: "c", js: "c", typ: a(0) },
    ], false),
    "Divided": [
        "counter",
    ],
    "T": [
        "argent",
        "azure",
        "gules",
        "or",
        "purpure",
        "sable",
        "vert",
    ],
    "DivisionEnum": [
        "chevronny",
        "gyronny",
        "perBend",
        "perBendSinister",
        "perChevron",
        "perChevronReversed",
        "perCross",
        "perFess",
        "perPale",
        "perPile",
        "perSaltire",
    ],
    "Shield": [
        "easterling",
        "erebor",
        "fantasy1",
        "fantasy5",
        "gondor",
        "hessen",
        "horsehead2",
        "ironHills",
        "moriaOrc",
        "pavise",
        "roman",
        "round",
        "urukHai",
    ],
    "BurgType": [
        "Generic",
        "Hunting",
        "Lake",
        "Naval",
    ],
    "FeatureType": [
        "island",
        "lake",
        "ocean",
    ],
    "Expansion": [
        "culture",
        "global",
        "state",
    ],
    "ReligionType": [
        "Folk",
        "Organized",
    ],
    "RiverType": [
        "Brook",
        "Creek",
        "Fork",
        "River",
        "Stream",
    ],
    "DiplomacyEnum": [
        "Ally",
        "Enemy",
        "Friendly",
        "Neutral",
        "Rival",
        "Suspicion",
        "Suzerain",
        "Unknown",
        "Vassal",
        "x",
    ],
    "Form": [
        "Monarchy",
        "Theocracy",
    ],
    "Icon": [
        "\ud83d\udc34",
        "\ud83c\udff9",
        "\ud83c\udf0a",
        "⚔️",
        "\ud83d\udca3",
        "\ud83d\udc51",
    ],
};

export const readJsonFile = (filePath: string) => {
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

export const getCellFromName = (locationName: string, { burgs, cells }: Pack) => {
  const normalize = (s: string = "") => s.toLowerCase().replace(/[\s\W]/g, "")
  const namedBurgs = burgs.filter(burg => normalize(burg.name) === normalize(locationName))
  if (namedBurgs.length > 1) console.warn(`Location ${locationName} found at cells ${namedBurgs.map(burg => burg.cell).join(', ')}`)
  if (namedBurgs.length > 0) return cells.find(cell => cell.i === namedBurgs[0].cell)
  if (!namedBurgs.length) console.error(`Location ${locationName} not found. (normalized to ${normalize(locationName)})`)
}