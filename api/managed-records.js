import fetch from "../util/fetch-fill";
import URI from "urijs";

// /records endpoint
window.path = "http://localhost:3000/records";

// Your retrieve function plus any additional functions go here ...

/**
 * @typedef {Object} RecordObject - An object returned from the /records endpoint
 * @property {number} id - A unique integer
 * @property {("red"|"brown"|"blue"|"yellow"|"green")} color - A color
 * @property {("open"|"closed")} disposition - The disposition
 */

/**
 * @typedef {Object} IsPrimary - Additional key added to RecordObject
 * @property {boolean} isPrimary - Whether the color is a primary (red|blue|yellow)
 */

/**
 * @typedef {RecordObject & IsPrimary} Open - A RecordObject with additional key `isPrimary`
 */

/**
 * @typedef {Object} RetrievePayload - Returned object from retrieve
 * @property {number[]} ids - The ids of all items returned from the request.
 * @property {Open[]} open - All items returned with `disposition` === "open". A fourth key is added to each item, `isPrimary`, indicating whether the item contains a primary color (red|blue|yellow)
 * @property {number} closedPrimaryCount - The number of items returned with `disposition` === "closed" and containing a primary color (red|blue|yellow)
 * @property {number|null} previousPage - The page number for the previous page of results, or `null` if it's the first page
 * @property {number|null} nextPage - The page number for the next page of results, or `null` if it's the last page
 */

/**
 * Determine if the given color is a primary color
 * @param {string} color
 * @returns {boolean}
 */
function isPrimaryColor(color) {
    return ["red", "blue", "yellow"].includes(color);
}

/**
 * Retrieve data from the /records endpoint.
 * @param {Object} [options] - An optional object with the following keys:
 * @param {number} [options.page=1] - The page to retrieve. If omitted, fetch page 1.
 * @param {string[]} [options.colors] - An array of colors to retrieve. If omitted, fetch all colors.
 * @returns{Promise<RetrievePayload>} payload
 */
export function retrieve(options) {
    // Set options if any part is not supplied
    if (options === undefined) {
        options = {};
    }
    const colors = "colors" in options ? options.colors : [];
    const page = "page" in options ? options.page : 1;

    // Construct the request URL
    // Always limit each page
    const limit = 10;
    // offset is the index of the first item to be returned (number of records to skip)
    // color[] is the color to include in the results. Include multiple times for multiple colors
    // Example: /records?limit=2&offset=0&color[]=brown&color[]=green
    const requestURI = URI(window.path);
    requestURI.addSearch("limit", limit + 1); // Get one over limit so we know if there's another page
    const offset = (page - 1) * limit || 0; // 0 if page wasn't given
    requestURI.addSearch("offset", offset);
    if (colors) {
        requestURI.addSearch("color[]", colors)
    }
    const URL = requestURI.toString();

    return fetch(URL)
        .then(res => {
            if (res.ok) {
                return res.json();
            } else {
                throw new Error(`Fetching /records failed with: ${res.status}`);
            }
        })
        .then(data => {
            const previousPage = page === 1 ? null : page - 1; // no previous page if page is 1
            const nextPage = data.length > 10 ? page + 1 : null; // no next page if length <= 10

            // trim back to the limit
            data.splice(limit, 1);

            // add field isPrimary to each record
            const recordsWithPrimary = data.map(record => {
                return {...record, isPrimary: isPrimaryColor(record.color)}
            })

            // Payload is:
            // - ids: All ids returned from request
            // - open: All records with `open` and a new field isPrimary
            // - closedPrimaryCount: # of records with `closed` and isPrimary === true
            // - previousPage: # of the previous page, else null
            // - nextPage: # of the next page, else null
            const payload = {
                ids: data.map(record => record.id),
                open: recordsWithPrimary.filter(record => record.disposition === "open"),
                closedPrimaryCount: recordsWithPrimary.filter(record => record.disposition === "closed" && record.isPrimary).length,
                previousPage,
                nextPage
            }

            return payload;
        })
        .catch(err => console.log(err));
}

export default retrieve;

