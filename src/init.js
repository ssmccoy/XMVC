/* Synchronous use() statement...
 * Asynchronous load() statement...
 * Code level DEBUG
 * Pretty simple, (c) 2005 Scott S. McCoy
 *
 * (c) 2006 Marchex, INC
 */

/**
 * @fileoverview
 *
 * This is a set of global functions which are required to even load the XMVC
 * framework.  They provide inline dependency acquisition and debugging.  The
 * functions use a local array to store satisfied dependencies so they will not
 * be loaded multiple times.
 */

var CHROME = false

try {
    if (Components.classes) CHROME = true
}
catch (error) {
    CHROME = false
}

if (CHROME) {
    var prefs     = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch)
    var jsLoader  = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]    
                        .getService(Components.interfaces.mozIJSSubScriptLoader)
    var jsConsole = Components.classes["@mozilla.org/consoleservice;1"]
                        .getService(Components.interfaces.nsIConsoleService)

    var DEBUG     = prefs.getBoolPref("xmvc.debug")
}

var LOADED    = []

/**
 * Load a dependency given a name.
 *
 * use() accepts a string which represents a library location using a notation
 * similar to java packages.  Directory separators are represented by a ".".
 * The ".js" file extension is automatially appended to the supplied string.
 *
 * <pre>
 * use("string.format")
 * </pre>
 *
 * Will load /content/js/string/format.js
 */
function use (module) {
    var path = JSPATH + module.replace(".", "/", "g") + ".js"

    if (LOADED[path] != true) {
        /* Optimize for Mozilla */
        if (CHROME) {
            jsLoader.loadSubScript(path, window)
        }
        else {
            /* If we don't have the js subscript loader, then for now we'll
             * just snag this thing using XMLHttpRequest and eval() it.
             * XXX This might be slower.
             */
            var ua = new XMLHttpRequest()

            ua.open("GET", path, false)
            ua.send(null)

            try {
                window.eval(ua.responseText)
            }
            catch (error) {
                throw new Error("Error while loading " + path + ": " +
                    error.message)
                return
            }
        }

        LOADED[path] = true
    }
}

/**
 * Load a dependency given a path.
 *
 * When in debug mode, load() works synchronously using nsIJSSubScriptLoader to
 * provide accurate file names and line numbers in the javascript console.
 * When not in debug mode, load() works asynchronously with eval to increase
 * load times.
 */
function load (path) {
    if (LOADED[path] != true) {
        if (CHROME) {
            jsLoader.loadSubScript("chrome://titus" + path, window)
        }
        else {
            var ua = new XMLHttpRequest()

            ua.onreadystatechange = function () {
                switch (ua.readyState) {
                    case 3:
                        if (ua.status == 200 || ua.status == 0)
                            window.eval(ua.responseText)
                }
            }

            ua.open("GET", path, true)
            ua.send(null)
        }

        LOADED[path] = true
    }
}


/**
 * Write a debug message.
 */
function debug (message) {
    if (!CHROME) return

    if (message instanceof Error) {
        jsConsole.logStringMessage("Exception: " + message.message + 
                "\nStacktrace:\n" + message.stack)
    }
    else {
        jsConsole.logStringMessage(message)
    }
}

/* replace with a stub if debug is disabled */
if (!DEBUG) window.debug = function () {}

/**
 * Write an error message.
 */
function error (message) {
    if (!CHROME) return

    if (message instanceof Error) {
        Components.utils.reportError("Exception: " + message.message +
                "\nStacktrace:\n" + message.stack)
    }
    else {
        Components.utils.reportError(message + "\nStacktrace:\n" + 
                (new Error().stack.split("\n").splice(3).join("\n"))) 
    }
}

