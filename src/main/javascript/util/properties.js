/* An inteface to reading java properties (xml) files.
 * ---------------------------------------------------------------------------- 
 * "THE BEER-WARE LICENSE" (revision 43) borrowed from FreeBSD's jail.c: 
 * <tag@cpan.org> wrote this file.  As long as you retain this notice you 
 * can do whatever you want with this stuff. If we meet some day, and you think 
 * this stuff is worth it, you can buy me a beer in return.   Scott S. McCoy 
 * ---------------------------------------------------------------------------- 
 */

/**
 * Create a properties parser error.
 *
 * @param {String} message The error message.
 * @constructor
 * @class A simple exception representing an error while parsing properties
 */
function PropertiesParserError (message) {
    this.message = "Error in PropertiesParser: " + message
}

PropertiesParserError.prototype = new Error()

/**
 * A properties file parser object.
 */
function PropertiesParser () {
    this.properties = []
    
    /**
     * Parse an XML properties data structure.
     * @param {DOMDocument} doc The XML Document containing the properties.
     */
    this.parseXML = function (doc) {
        var element = doc.documentElement
    
        if (element.localName != "properties") {
            throw new PropertiesParserError("Invalid properties document")
        }
    
        element = element.firstChild
    
        while (element != null) {
            if (element instanceof Element) {
                if (element.localName != "entry") {
                    throw new PropertiesParserError("Unexpected Element" +
                            element.localName)
                }
    
                var key         = element.getAttribute("key")
                var value       = element.firstChild ? 
                                    element.firstChild.data : null
    
                this.properties[key] = value
            }
    
            element = element.nextSibling
        }

        return true
    }

    /**
     * Parse a Java Properties file.
     * @param {String} text The entire properties file as a string.
     */
    this.parseProperties = function (text) {
        /* Note: The JS RegExp object seems not to support lookbehind
         * assertions :-/
         */
        var records = text.split(/\\n/)
        var record  = new String()

        for (var i = 0; i < records.length; i++) {
            var lx = records[i].length - 1

            /* Skip empty lines and comments */
            if (records[i][0] == "#" && record.length == 0)        continue
            else if (record.length == 0 && records[i].length == 0) continue

            /* continue escaped lines */
            if (records[i][ lx ] == "\\") {
                record += records[i].substring(0, lx).replace(/^\s*/, "")
            }
            else {
                record += records[i]

                var token = record.indexOf("=") 
                
                /* Strip following/leading spaces... */
                var key   = record.substring(0, token).replace(/\s*$/, "")
                var value = record.substring(token + 1).replace(/^\s*/, "")

                this.properties[ key ] = value
                   

                record = new String()
            }
        }
    }
}
/**
 * A Cache for Properties Files.
 */
function PropertiesCache () {
    this.cache = []
    var self = this

    /**
     * Fetch the following URI, in blocking or non-blocking, and call the
     * appropriate handler.
     * @private
     */
    var fetch = function (handler, uri, blocking) {
        var client = new CBClient(handler)
        client.blocking = blocking
        client.get(uri)
    }

    /**
     * Fetch and parse an XML Properties file.
     * @param {String} uri the unified resource location of the properties file
     * @param {boolean} blocking
     * @throws PropertiesParserError if data is not valid
     */
    this.fetchXML = function (uri, blocking) {
        var handler = function (response) {
            var parser = new PropertiesParser()

            parser.parseXML(response.document)
            self.cache[uri] = parser.properties
        }

        if (!this.cache[uri])
            fetch(handler, uri, blocking)
    }

    /**
     * Fetch and parse a Java Properties file.
     * @param {String} uri the unified resource location of the properties file
     * @param {boolean} blocking
     * @throws PropertiesParserError if data is not valid
     */
    this.fetchProperties = function (uri, blocking) {
        var handler = function (response) {
            var parser = new PropertiesParser()

            parser.parseProperties(response.responseText)
            self.cache[uri] = parser.properties
        }

        if (!this.cache[uri])
            fetch(handler, uri, blocking)
    }
}

/**
 * Create a properties cache (with defaults)
 *
 * Accepts a hash table, array, or properties resource bundle as an argument.
 *
 * @constructor
 * @class A Properties resource bundle.
 * Similar to a Java properties resource bundle.
 */
function Properties (defaults) {
    this.properties = {}
    var initURI = function (uri) {
        this.properties = this.cache[uri]
    }

    /**
     * Returns an XML properties file from the cache.
     *
     * Checks the cache for a file at a given URL and initializes this object
     * with the appropriate properties resource bundle from the cache.
     * Otherwise fetches the file synchronously and pre-populates the cache
     * before returning.
     */
    this.loadXML = function (uri) {
        if (!this.cache[uri]) {
            this.fetchXML(uri, true)
        }

        initURI.call(this, uri)
    }

    /**
     * Returns an Java properties file from the cache.
     *
     * Checks the cache for a file at a given URL and initializes this object
     * with the appropriate properties resource bundle from the cache.
     * Otherwise fetches the file synchronously and pre-populates the cache
     * before returning.
     */
    this.loadProperties = function (uri) {
        if (!this.cache[uri]) {
            this.fetchProperties(uri, true)
        }

        initURI.call(this, uri)
    }

    /**
     * Get a property.
     *
     * Returns the appropriate property for a given key, or the default value
     * if the key is not found.
     *
     * @param {String} key The key
     * @param {Object} def The default
     * @returns {Object} the result.
     * @see #setProperty
     */
    this.getProperty = function (key, def) {
        if (typeof this.properties[key] != "undefined") {
            return this.properties[key]
        }
        if (typeof def != "undefined") {
            return def
        }
        if (typeof defaults != "undefined") {
            return defaults.getProperty(key)
        }

        return undefined
    }

    /**
     * Set a property.
     *
     * Given a key, set the respective property to the given value.
     *
     * @param {String} key The key
     * @param {String} value The value
     * @see #setProperty
     */
    this.setProperty = function (key, value) {
        this.properties[key] = value
    }

    /**
     * Merge properties.
     *
     * <p>Given a properties object, merge all properties from the given
     * properties object into the current properties object, overriding any
     * properties which were previously defined.</p>
     *
     * @param {Properties} properties The properties object to merge in.
     */
    this.mergeProperties = function (properties) {
        for (var key in properties.properties) {
            this.properties[key] = properties.properties[key]
        }
    }
}

/**
 * Preload an XML properties file at a given location asynchronously.
 */
Properties.preloadXML = function (uri) {
    this.prototype.fetchXML(uri, false)
}

/**
 * Preload a Java properties file at a given location asynchronously.
 */
Properties.preloadProperties = function (uri) {
    this.prototype.fetchProperties(uri, false)
}

Properties.prototype = new PropertiesCache()
