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

const prefs     = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch)
const jsLoader  = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]    
                    .getService(Components.interfaces.mozIJSSubScriptLoader)
const jsConsole = Components.classes["@mozilla.org/consoleservice;1"]
                    .getService(Components.interfaces.nsIConsoleService)

const DEBUG     = prefs.getBoolPref("xmvc.debug")
const DEBUGGER  = false
const LOADED    = []

/**
 * Open a window by type.
 *
 * This is just a stub to please the javascript debugger if it's loaded.
 */
function toOpenWindowByType(inType, uri) {
  var winopts = "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar";
  window.open(uri, "_blank", winopts);
}

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
    var path = "chrome://titus/content/js/" + module.replace(".", "/", "g") + ".js"

    if (LOADED[path] != true) {
        jsLoader.loadSubScript(path, window)
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
        jsLoader.loadSubScript("chrome://titus" + path, window)
        LOADED[path] = true
    }
}


/**
 * Write a debug message.
 */
function debug (message) {
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
    if (message instanceof Error) {
        Components.utils.reportError("Exception: " + message.message +
                "\nStacktrace:\n" + message.stack)
    }
    else {
        Components.utils.reportError(message + "\nStacktrace:\n" + 
                (new Error().stack.split("\n").splice(3).join("\n"))) 
    }
}

if (DEBUGGER) {
    jsLoader.loadSubScript("chrome://venkman/content/venkman-overlay.js", 
            window)

    try {
        window.start_venkman()
    }
    catch (error) {
        window.alert("error starting venkman: " + error)
    }
}

/*
=pod

=back

=cut
*/
