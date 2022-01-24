/**
 * Requires
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { pathToFileURL } = require( 'url' );

/**
 * @typedef {Object} PackageImporterOptions
 * @property {boolean} strict - Require a package directory and a package.json if there is no module target info, default: false
 * @property {null|string} cwd - Set the working directory for the importer, default: null > process.cwd()
 * @property {string} prefix - Package import prefix, default: ~
 * @property {Array<string>} ext - Array of acceptable extensions, defaults: see PACKAGE_IMPORTER_DEFAULT_OPTIONS.ext
 * @property {Array<string>} keys - Array of possible package keys to check for a file reference, defaults: see PACKAGE_IMPORTER_DEFAULT_OPTIONS.keys
 * @property {Array<string>} paths - Array of possible package locations, relative or absolute paths, defaults see PACKAGE_IMPORTER_DEFAULT_OPTIONS.paths
 */

/**
 * Resolve package entry if possible
 * @private
 * @param {string} module_name - Module name
 * @param {string} module_path - Module path
 * @param {Object|PackageImporterOptions} options - Importer options
 * @throws Error
 * @return {Object|{key: string, source: string}} - Empty object if not found or key and source
 */
function _packageImporter_get_pkg_entry( module_name, module_path, options ) {

    // Attempt to load the module package
    let pkg = null, error = null;
    try {
        pkg = require( path.join( module_path, 'package.json' ) );
    } catch ( e ) {
        error = e;
    }

    // No valid package
    if ( error || ( pkg === null || typeof pkg !== 'object' ) ) {

        // In loose mode let just pray there is an index file sass can load
        if ( !options.strict ) {
            return null;
        }

        // In strict we fail
        throw new Error( 'SassPackageImporter failed to load package.json for: ' + module_name + ' in: ' + module_path, error );
    }

    // If we do not find a fitting key,
    // it's the same as if there was no package and we pray that sass finds and index file
    let found = null;

    // Let see if we can find an appropriate source
    for ( let i = 0; i < options.keys.length; i++ ) {
        const k = options.keys[ i ];

        // Key exists and has a possible value
        if ( typeof pkg[ k ] === 'string' && pkg[ k ].length ) {
            const ext = path.extname( pkg[ k ] );

            // Skip possibly incompatible extension that's not empty but also not included in our options list
            if ( ext && ext.length && !options.ext.includes( ext ) ) {
                continue;
            }

            // If we found a possible entry well take it and stop checking
            found = pkg[ k ];
            break;
        }
    }
    return found;
}

/**
 * Check if given path exists
 * @private
 * @param {string} check_path - Path to check
 * @param {string} module_name - Module name
 * @param {Object|PackageImporterOptions} options - Importer options
 * @return {null|string} - Path string if it exists
 */
function _packageImporter_get_pkg_path( check_path, module_name, options ) {

    // Resolve absolute or relative path
    const check = check_path.startsWith( path.sep ) ?
        path.resolve( check_path, module_name )
        : path.resolve( options.cwd || process.cwd(), check_path, module_name );

    // Return path if it exists
    if ( fs.lstatSync( check ).isDirectory() ) {
        return check;
    }
    return null;
}

/**
 * Get package info from string
 * @private
 * @param {string} input - Input string
 * @param {Object|PackageImporterOptions} options - Importer options
 * @throws Error
 * @return {{module_name, module_path: string, module_target: (null|string)}} - Package info object
 */
function _packageImporter_get_pkg_info( input, options ) {

    // Module target is the path after the module name
    let module_target = null, module_name = input;

    // Split it up to see what's what, also remove empties
    const p = input.split( path.sep ).filter( ( v ) => { return !!v.length; } );

    // If we have more than one segment
    if ( p.length > 1 ) {

        // The first is part of the module name for sure
        module_name = p.shift();

        // If the first started with an @ it's an org
        // And if present, the second element is also part of the module name
        if ( p.length && module_name.charAt( 0 ) === '@' ) {
            module_name += path.sep + p.shift();
        }

        // Anything we have left now is part of the module target path
        if ( p.length ) {
            module_target = p.join( path.sep );
        }
    }

    // Resolve the actual module path and return data
    let module_path;
    for ( let i = 0; i < options.paths.length; i++ ) {
        module_path = _packageImporter_get_pkg_path( options.paths[ i ], module_name, options );
        if ( module_path ) break;
    }

    // Fail in strict
    if ( !module_path ) {
        if ( options.strict ) throw new Error( 'SassPackageImporter failed to resolve an existing path for: ' + module_name );

        // Or allow sass to check, but it will likely not find anything either
        module_path = path.join( options.paths[ 0 ], module_name );
    }
    return { module_name, module_path, module_target };
}

/**
 * Package importer default options
 * @private
 * @type {Object|PackageImporterOptions}
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
 * @typedef {Object} SassFileImporter
 * @property {Function|SassFileImporterFinder} findFileUrl - File url finder
 */

/**
 * @typedef {Function} SassFileImporterFinder
 * @param {string} url - Sass import url
 * @return {null|URL} - URL instance of package source, null if not found
 */

/**
 * Get package importer object for sass api
 * @public
 * @param {Object|PackageImporterOptions} options - Importer options
 * @return {Object|SassFileImporter} - Importer object to use in sass options
 */
module.exports = function packageImporter( options = null ) {

    // Get default options
    const local_options = { ...PACKAGE_IMPORTER_DEFAULT_OPTIONS };

    // Assign custom options
    if ( options !== null && typeof options === 'object' ) {
        Object.assign( local_options, options );
    }

    // Return context module
    return {

        /**
         * Detect and find node_modules package url
         * @type {SassFileImporter}
         * @public
         * @param {string} url - Import url
         * @return {null|URL} - Resolved url or null
         */
        findFileUrl( url ) {

            // Skip if not the appropriate prefix
            if ( !url.startsWith( local_options.prefix ) ) return null;

            // Get possible module name and path
            const {
                module_name,
                module_path,
                module_target,
            } = _packageImporter_get_pkg_info( url.substring( local_options.prefix.length ), local_options );

            // If it's just the module name, let fetch the source from the package
            let source = module_target;
            if ( !source ) {

                // Check if we can select an appropriate entry from the package
                source = _packageImporter_get_pkg_entry( module_name, module_path, local_options );
            }

            // We have nothing in the package or in the original path, let's hope for the best
            if ( !source || !source.length ) {
                source = '';
            }

            // Return a local file url for sass to process
            return new URL( pathToFileURL( path.join( module_path, source ) ) );
        }
    };
};
