import type { World } from "../lib/map-types.ts";

/** Advance the world's year */
const incrementYear = (world: World): World => {
    const lastYear = world.settings.options.year
    const newYear = lastYear + 1
    const newWorld = {...world, settings: {...world.settings, options: {...world.settings.options, year: newYear}}}
    return newWorld
}

/** A no-op rule that just returns the same world */
const identityRule = (world: World): World => {
    return world;
};

export default [incrementYear, identityRule];
