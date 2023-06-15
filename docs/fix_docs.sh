
# Remove contribute links from the module nav, keep it only in main navbar
find ./docs-dist/ -type f -exec sed -i "s/<li .*>Contributing<.*li>//g" {} +

# Import nanopub-display.js
cp nanopub-display/dist/nanopub-display.min.js docs-dist/
# Fix issue with local dev
mkdir -p docs-dist/nanopub-js/
cp nanopub-display/dist/nanopub-display.min.js docs-dist/nanopub-js/

# Fix favicon
find ./docs-dist/ -type f -exec sed -i 's/"\/><meta name="viewport/"\/><script type="module" src="\/nanopub-js\/nanopub-display.min.js"><\/script><link rel="icon" href="https:\/\/raw.githubusercontent.com\/Nanopublication\/nanopub-website\/9fee248bac306dcff7b1b0fb3d645ef6d5b62ba7\/static\/img\/icon.png"\/><meta name="viewport/g' {} +

# find ./docs-dist/ -type f -exec sed -i 's/display"\/><meta name="viewport/display"\/><script type="module" src="https:\/\/cdn.jsdelivr.net\/npm\/@nanopub\/display\/dist\/nanopub-display.bundle.js"><\/script><link rel="icon" href="https:\/\/raw.githubusercontent.com\/Nanopublication\/nanopub-website\/9fee248bac306dcff7b1b0fb3d645ef6d5b62ba7\/static\/img\/icon.png"\/><meta name="viewport/g' {} +
# find ./docs-dist/ -type f -exec sed -i 's/display"\/><meta name="viewport/display"\/><script type="module" src="https:\/\/cdn.jsdelivr.net\/npm\/@nanopub\/display@0.0.4\/dist\/nanopub-display.min.js"><\/script><link rel="icon" href="https:\/\/raw.githubusercontent.com\/Nanopublication\/nanopub-website\/9fee248bac306dcff7b1b0fb3d645ef6d5b62ba7\/static\/img\/icon.png"\/><meta name="viewport/g' {} +
