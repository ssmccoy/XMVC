/* The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
 * the specific language governing rights and limitations under the License.
 *
 * The Original Code is Copyright 2007, Marchex INC.
 *
 * The Initial Developer of the Original Code is Scott S. McCoy.
 *
 * All Rights Reserved.
 */
 
/**
 * @fileoverview
 * @depends sarissa.js
 * The eXtensible Markup View Controller.
 *
 * <p>This framework is effectively a means for building a controller, as per
 * an MVC type of design paradigm.  It does not follow this paradigm precisely,
 * but instead models it for a means appropriate to building graphical user
 * interfaces that use eXtensible Markup Language (XML) documents as their user
 * interface medium.  This controller is design for deligating and describing
 * actions which may take place within the user interface, routing them to
 * their prospective owners, accepting their responses and transforming the
 * given responses to markup suitable for the user interface display.</p>
 *
 * <p>This framework is designed around several assumptions for markup driven
 * graphical user interfaces.  The first as that the application itself
 * provides little of it's actual functionality, and in tern, is typically
 * little more than an interface to a larger system communicated to via some
 * form of services.  The second, is that typically these services would
 * additionally use markup as their transfer method.  The third, is that
 * calling these services will typically be asynchronous and the result of such
 * calls often will not be available until after the handling of the action has
 * been completed.</p>
 *
 * <p>At one time, this framework had heavy dependency on being in a mozilla
 * chrome environment.  This is no longer true, however, optimizations and
 * additional features are availablde when used in an environment.  This
 * framework defines a mechanism for dependency loading that is simple and
 * uniform, for instance, and will use the javascript subscript loader XPCOM
 * component when it is available.  This makes for easier debugging, as it
 * displays the actual file names, line numbers, and currently executing
 * functions when errors occur and makes available in both explicit system
 * exceptions a full stack trace.</p>
 *
 * <p>In addition to these features, this framework comes with a generic SOAP
 * Client implementation.</p>
 *
 * @see soap.js
 */

/* To use in IE, use IEtoW3C.js */
xmvc = {}

xmvc.ActionType = {
    object: {},
    method: {},
    clazz: {}
}

/**
 * The XMVC Registry.
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.ControllerRegistery = function () {
    var handlers = []


    /**
     * This object represents an event within the registry.
     */
    function Event () {
        /** {@link xmvc.ControllerScope} */
        this.scope = null
    }

    this.registerAction = function (name, action) {
        actions[name] = action
    }

    this.regsiterTransform = function (stylesheet) {
    }

    this.registerUpdate = function (name) {
    }

    this.registerView = function (name) {
    }

    this.locateAction = function () {
    }

    this.locateTransform = function () {
    }

    this.eventsForId = function (id) {
    }
}


/* XXX What the hell were the action types for? */
xmvc.ActionTypes = {
    generic: {},
    specifiable: {},
    eventhandler: {},
}







