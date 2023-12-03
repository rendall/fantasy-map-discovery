import { getCellFromName, readJsonFile } from "../utils.js";
import { findRouteAStar } from "./astar.js";
export const routeHandler = (argv) => {
    const { file, locations } = argv;
    const data = readJsonFile(file);
    const cells = data.pack.cells;
    const locationsArray = locations
        .split(",")
        .map((location) => location.trim());
    const locationIds = locationsArray.map((location) => {
        const locationId = parseInt(location, 10);
        if (isNaN(locationId)) {
            const cell = getCellFromName(location, data.pack);
            if (cell) {
                return cell.i;
            }
            else {
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
            console.error("One or both of the provided cell indices are not found in the map data.");
            process.exit(1);
        }
        const heightExponent = parseInt(data.settings.heightExponent);
        const route = findRouteAStar(startCell, endCell, cells, data.biomesData.cost, heightExponent);
        if (route) {
            routes.push(route.slice(0, -1)); // Remove the last element to avoid duplicating the intermediate locations
        }
        else {
            console.log(`No route found between locations ${locations[i]} and ${locations[i + 1]}.`);
            process.exit(1);
        }
    }
    const showBurg = (burgId) => burgId === 0 ? "" : `burg: ${data.pack.burgs[burgId]?.name},`;
    // Add the last location to the final route
    const finalRoute = routes
        .flat()
        .concat(cells.find((cell) => cell.i === locationIds[locationIds.length - 1]) ?? []);
    const cellDistance = (a, b) => Math.sqrt((a.p[0] - b.p[0]) ** 2 + (a.p[1] - b.p[1]) ** 2);
    let distance = 0;
    const addDistance = (i, route) => {
        if (i === 0)
            return 0;
        const iLeg = route[i];
        if (!iLeg)
            return 0;
        const lastLeg = route[i - 1];
        if (!lastLeg)
            return 0;
        distance = distance + cellDistance(iLeg, lastLeg);
        const scaledDistance = distance * parseFloat(data.settings.distanceScale);
        return parseFloat(scaledDistance.toFixed(1));
    };
    // Display the final route
    if (finalRoute.length > 0) {
        console.log("Route:");
        finalRoute.forEach((cell, i, route) => console.log(`Cell i: ${cell.i}, distance: ${addDistance(i, route)} ${data.settings.distanceUnit}, ${showBurg(cell.burg)} biome: ${data.biomesData.name[cell.biome]}, position: (${cell.p[0]}, ${cell.p[1]})`));
    }
    else {
        console.log("No route found between the provided locations.");
    }
};
