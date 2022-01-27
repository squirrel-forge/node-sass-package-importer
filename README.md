# @squirrel-forge/sass-package-importer
A simple node sass package importer built for the new [sass js api](https://sass-lang.com/documentation/js-api) must be used with the new [sass](https://www.npmjs.com/package/sass) package.
Made to be compatible with node ^10.0.0, might work on higher versions, but currently not supported or tested.

---
**Please note** that if you are looking for a more versatile implementation, especially if you are looking for the [old node-sass api](https://www.npmjs.com/package/node-sass) or the [sass legacy api](https://sass-lang.com/documentation/js-api#legacy-api), check out the [node-sass-package-importer](https://www.npmjs.com/package/node-sass-package-importer).

## Installation

```
npm i @squirrel-forge/sass-package-importer
```

## Usage

Use *~* to prefix packages that should be imported or used and they will be resolved according to your [options](#options), the default options will attempt to load from the *node_modules* directory inside your cwd.

#### Source scss
```scss
@import "~@squirrel-forge/sass-util";

// OR
@use "~@squirrel-forge/sass-util";
```

### Plugin usage:
```javascript
const sass = require( 'sass' );
const packageImporter = require( '@squirrel-forge/sass-package-importer' );

// Classic way, calling the factory in place with options
const sassOptions = { importers : [ packageImporter( /* null|PackageImporterOptions */ ) ] };

// Plugin way, supply the sass options as second argument
// It will create the importers property if required and append the importer.
const sassOptions = {};
packageImporter( /* null|PackageImporterOptions */, sassOptions );

// Since the importer is sync it work for both sync and async compile
const result = sass.compile( scssFilename, sassOptions );

// OR
const result = await sass.compileAsync( scssFilename, sassOptions );
```

## Options

```javascript
/**
 * Package importer options
 * @type {null|PackageImporterOptions}
 */
const PACKAGE_IMPORTER_DEFAULT_OPTIONS = {
    strict : false,
    cwd : null,
    prefix : '~',
    ext : [ '.scss', '.sass', '.css' ],
    keys : [ 'scss', 'sass', 'style', 'css', 'main.scss', 'main.sass', 'main.style', 'main.css', 'main' ],
    paths : [ 'node_modules' ],
};

/**
 * @typedef {Object} PackageImporterOptions
 * @property {boolean} strict - Require a package directory and a package.json if there is no module target info, default: false
 * @property {null|string} cwd - Set the working directory for the importer, default: null > process.cwd()
 * @property {string} prefix - Package import prefix, default: ~
 * @property {Array<string>} ext - Array of acceptable extensions, defaults: see PACKAGE_IMPORTER_DEFAULT_OPTIONS.ext
 * @property {Array<string>} keys - Array of possible package keys to check for a file reference, defaults: see PACKAGE_IMPORTER_DEFAULT_OPTIONS.keys
 * @property {Array<string>} paths - Array of possible package locations, relative or absolute paths, defaults see PACKAGE_IMPORTER_DEFAULT_OPTIONS.paths
 */
```

## Issues

If you encounter any issues, please report [here](https://github.com/squirrel-forge/node-sass-package-importer/issues).

---
Check the sourcecode on [github](https://github.com/squirrel-forge/node-sass-package-importer) for extensive comments.
