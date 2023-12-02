import type { World } from "../lib/map-types.ts";
const identityRule = (world: World): World => {
    return world;
};

// Exporting an array containing the identityRule
module.exports = [identityRule];
