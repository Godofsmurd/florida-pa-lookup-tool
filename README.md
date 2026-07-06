# Florida Property Research Launcher

A free static website for routing Florida property research by ZIP, pasted address, or county.

## What it does

- Detects a Florida ZIP from a pasted address.
- Maps ZIP to likely county using `data/zip_to_county.json`.
- Opens the county Property Appraiser site from `data/counties.json`.
- Includes quick buttons for SunBiz, Google Maps, tax collector search, clerk records search, and permit search.
- Saves recent lookups in the user's browser only.
- Works on GitHub Pages, Netlify, Vercel, or any basic static host.

## Important note about ZIP accuracy

ZIP codes can cross county lines. This tool is intended as a routing aid, not a legal county determination. For county-line properties, verify with the full address or the county property appraiser.

The included ZIP table is a starter set focused on common Florida areas. Add or correct ZIPs in `data/zip_to_county.json` as your team finds them.

## How to edit links

Open `data/counties.json` and update the county's URLs.

Example:

```json
"Palm Beach County": {
  "pa_url": "https://pbcpao.gov/index.htm",
  "tax_collector_url": "https://www.google.com/search?q=Palm+Beach+County+Florida+tax+collector+property+tax+search",
  "clerk_url": "https://www.google.com/search?q=Palm+Beach+County+Florida+clerk+official+records+search",
  "permit_url": "https://www.google.com/search?q=Palm+Beach+County+Florida+building+permit+search",
  "notes": "..."
}
```

## How to add ZIPs

Open `data/zip_to_county.json` and add a new line like this:

```json
"34987": "St. Lucie County"
```

Make sure every line except the last item has a comma after it.


## Logo

The header is set to use `Statewide_Home_Improvement.png` from the root of the site. Upload your logo file with that exact filename next to `index.html`. If the file is missing, the app falls back to a simple PA badge.

## Removed links

The Universal Florida Links section intentionally includes only SunBiz Entity Search and Google Maps. FLHSMV and DBPR were removed because they are not relevant to this workflow.
