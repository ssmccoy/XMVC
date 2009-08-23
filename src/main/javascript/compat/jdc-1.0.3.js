// **************************************************************************
// Copyright 2007 - 2008 The JSLab Team, Tavs Dokkedahl and Allan Jacobs
// Contact: http://www.jslab.dk/contact.php
//
// This file is part of the JSLab DOM Correction (JDC) Program.
//
// JDC is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 3 of the License, or
// any later version.
//
// JDC is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
// ***************************************************************************
// File created 2008-10-10 17:19:36

// JDC Version: 1.0.3
// EPE revision: 92
// UEM revision: 75
// Release date: 2008-09-30
// [epe.ie.htmlelement.js]

// Content
// 1. User configurable settings
// 2. Element creation
// 3. Element property change
// 4. Element chache
// 5. Functions for collabaration with external scripts (hooks)
// 6. Redeclaration of native JS functions/methods
// 7. Prototype handling
// 8. Element constructor declarations

// Works for IE version 6.0 and above
if (document.createEventObject) {

  /***********************************************
  *
  *
  *  Section 1 - User configurable settings
  *
  *
  ***********************************************/

  // Declare namespace
  var EPE = {};

  // Cache elements between creation and insertion. This is nessesary in
  // a number of situations especially when using innerHTML
  // 1 = on, 0 = off. Default value is 1
  // See http://www.jslab.dk/epe.features.php#enable.cache for more info
  EPE.CACHE_ELEMENTS = 0;

  // THERE ARE NO CONFIGURABLE SETTINGS BELOW THIS LINE

  /***********************************************
  *
  *
  *  Section 2 - Element creation
  *
  *
  ***********************************************/

  // Save native createElement method
  EPE.IECreateElement = document.createElement;

  /**
  * Creates an element of the type specified by tag.  The element is wrapped
  * within an instance of a subclass of HTMLElement.
  *
  * @param tag {String} The HTML tag name of the element type to create.
  * @returns a native element wrapped in an instance of HTMLElement.
  * @type HTMLElement
  */
  EPE.createElement =
    function(tag) {
      tag = tag.toLowerCase();
      // Return an element wrapped in a proper [ELEMENT] constructor
      // If no constructor exists use HTMLElement.
      var elm = EPE.tags[tag] ? new EPE.tags[tag](tag) : new HTMLElement(tag);
      // Cache element until it is inserted into document
      if (EPE.CACHE_ELEMENTS)
        EPE.cache.add(elm);
      return elm;
    };

  // This assignment *must* come after the EPE.createElement declaration
  document.createElement = EPE.createElement;

  /**
   * Copy all methods and properties from real prototype to a given element's
   * pseudo-prototype.
   *
   * This method is called when application code invokes the init method,
   * when a new node is attached to the document in innerHTML, and from
   * document createElement.
   *
   * An element can only be extended once.  This method does nothing if the
   * given element has it's constructor property set.
   *
   * @param elm  Element.
   * @param oCon Constructor.
   */
  EPE.extend =
    function(elm,oCon) {
      // If elm has a 'constructor' property is has already been extended.
      // Elements may *not* be extended twice as this will cause unpredictable
      // results for some workarounds. Calling EPE.extend twice could happen when
      // an element appends childs using innerHTML. The childs which are
      // there prior to the innerHTML change will already have been extended.
      if (!elm.constructor) {
        // If constructor function for this element is not provided
        // then get correct constructor function
        // If constructor does not exist use HTMLElement
        if (!oCon)
          oCon = EPE.tags[elm.tagName.toLowerCase()] ? EPE.tags[elm.tagName.toLowerCase()] : HTMLElement;
        // Set constructor property for easy comparison
        elm.constructor = oCon;
        // if element can have child nodes
        if (elm.canHaveChildren) {
          // Changes to innerHTML which are made before the node is attached to the document
          // do not trigger onpropertychange. In this case we need to check whether the node being
          // inserted has childnodes which have not been extended by EPE.
          // See also the EPE.extend method for more info.
          // The functions which can alter a document is
          // appendChild
          // insertBefore
          // replaceChild
          // Save ref. to original methods
          elm._appendChild = elm.appendChild;
          elm._insertBefore = elm.insertBefore;
          elm._replaceChild = elm.replaceChild;
          // Replace with EPE versions
          elm.appendChild = EPE.appendChild;
          elm.insertBefore = EPE.insertBefore;
          elm.replaceChild = EPE.replaceChild;
        }
        // Copy properties from HTMLElement prototype
        oPro = HTMLElement._prototype;
        if (elm.nodeName != "OBJECT" && elm.nodeName != "APPLET") {
          for (var p in oPro) {
            elm[p] = oPro[p];
          }
        }
        // Temp. solution for OBJECT and APPLET tags
        else {
          for (var p in oPro) {
            try {
              elm[p] = oPro[p];
            }
            catch (ex) {
            }
          }
        }
        // Copy properties from constructor prototype
        // effectively overwritting duplicate properties
        // defined on the HTMLElement
        var oPro = oCon._prototype;
        if (elm.nodeName != "OBJECT" && elm.nodeName != "APPLET") {
          for (var p in oPro)
            elm[p] = oPro[p];
        }
        // Temp. solution for OBJECT and APLLET tags
        else {
          for (var p in oPro) {
            try {
              elm[p] = oPro[p];
            }
            catch (ex) {
            }
          }
        }
        // If any auxiliary functions are registered for handling changes to
        // nodes when they are created/inserted they are executed now, parsing
        // the node as a single argument. Aux. functions are executed in the
        // order in which they are registered.
        EPE.PlugIn.executeCreate(elm);
        // Enable property watching
        EPE.enableWatch(elm);
      }
      return elm;
    };

  /**
  * Custom toString method of all element constructors
  *
  * @returns the name of an element constructor formatted as in Firefox.
  * @type String
  */
  EPE.constructorToString =
    function() {
      var s = Function.prototype.toString.apply(this);
      return s.match(/^function\s(\w+)/)[1];
    };

  /**
   * Extend existing elements onload.  This code *must* be attached as a load
   * event handler by application code to get called when the document finishes
   * loading.
   * This handler will optionally call a load handler as a callback
   * function if the application code requires a load event handler attached
   * to the body element.
   * See http://www.jslab.dk/epe.installation.php for more information
   */
  EPE.init =
    function() {
      // Extend all existing elements
      var a = document.all;
      var l = a.length;
      for(var i=0; i<l; i++) {
        if (a[i].tagName != '!' && a[i].tagName != 'epe')
          EPE.extend(a[i]);
      }
      // Execute aux. init functions which are registered
      // by external scripts
      for(var i=0; i<EPE.init.aux.length; i++)
        EPE.init.aux[i]();
      // Execute original onload handler if any exist
      if (EPE.__R1)
        EPE.__R1();
    };

  /**
   * Storage for functions which should be executed after EPE has
   * initialized but before control is given back to the user
   * script.
   */
  EPE.init.aux = [];

  /***********************************************
  *
  *
  *  Section 3 - Element property change
  *
  *
  ***********************************************/

  /**
   * Central point for enabling property watching.  This function may be
   * called from outside EPE.
   *
   * Enabling property watching is accomplished by attaching EPE.checkInnerHTML
   * as a property change handler.  One side effect is that application code
   * registered change listeners may be called.
   *
   * @param elm An element for which property watching will be enabled.
   */
  EPE.enableWatch =
    function(elm) {
      elm.attachEvent('onpropertychange',EPE.checkInnerHTML);
    };

  /**
   * Central point for disabling property watching.  This function may be
   * called from outside EPE.
   *
   * Disabling property watching is accomplished by detaching EPE.checkInnerHTML
   * as a property change handler.  One side effect is that application code
   * registered change listeners will no longer be called.
   *
   * @param elm An element for which property watching will be disabled.
   */
  EPE.disableWatch =
    function(elm) {
      elm.detachEvent('onpropertychange',EPE.checkInnerHTML);
    };

  /**
   * Watch handler for changes to a node which originate from altering innerHTML
   * or from property changes.  When this function executes the changes have
   * already been made and attached to the document.
   *
   * Note: onpropertychange fires on the document object even though no pseudo
   *       (epe tag) contructor is attached to the document.
   *
   * Weird IE behavior: When assigning event handlers using attachEvent 'this' references the window object
   *                    so we use event.srcElement instead.
  */

  EPE.checkInnerHTML =
    function() {
      // If source of event is document or window then no event.srcElement exist
      // nor do we have to worry about innerHTML
      // EPE handles document changes
      if (event.srcElement && event.propertyName == 'innerHTML') {
        // Sortcut
        var elm = event.srcElement;
        // All child nodes inserted by innerHTML
        // should be extended by EPE
        if (elm.childNodes) {
          for(var i=0; i<elm.childNodes.length; i++) {
            if (elm.childNodes[i].tagName)
              EPE.extendInnerHTML(elm.childNodes[i]);
          }
        }
      }
      // Aux. functions might handle changes to other properties
      else {
        if (event.srcElement)
          EPE.PlugIn.executeChange(event.srcElement,event);
        else if (this == document)
          EPE.PlugIn.executeChange(document,event);
      }
    };

  /**
   * Recursively extend all nodes added by an innerHTML change.
   *
   * @param node The base HTML node for a depth-first recursion step.
   */
  EPE.extendInnerHTML =
    function(node) {
      // For each childnode
      if (node.childNodes) {
        for(var i=0; i<node.childNodes.length; i++) {
          // If childnode is an element and childnode has childnodes then recurse
          if (node.childNodes[i].tagName && node.childNodes[i].childNodes)
            EPE.extendInnerHTML(node.childNodes[i]);
        }
      }
      // If node is an element node
      if (node && node.tagName) {
        // All nodes being attached to the document will
        // execute this block at some point
        // Extend the node. Node now supports the HTMLElement interface
        EPE.extend(node);
        // Execute onattach events
        EPE.PlugIn.executeAttach(node);
        // Temporary fix for nasty bug when assigning event handlers
        // as properties
        for(var p in node) {
          if (/^on/i.test(p) && node[p] && node[p] != UEM.wrapper)
            node.addEventListener(p.substring(2), node[p], false);
        }
      }
    };

  /***********************************************
  *
  *
  *  Section 4 - Element cache
  *
  *
  ***********************************************/

  // If caching is turned on
  if (EPE.CACHE_ELEMENTS) {

    EPE.cache = EPE.IECreateElement('epe');
    document.documentElement.childNodes[0].appendChild(EPE.cache);

    EPE.cache.add =
      function(elm) {
        if (elm.canHaveChildren) {
          EPE.cache.appendChild(elm);
          elm.cached = true;
        }
      };

    EPE.cache.remove =
      function(elm) {
        elm.cached = null;
        if (elm.childNodes.length) {
          for(var i=0; i<elm.childNodes.length; i++)
            if (elm.childNodes[i].cached)
              EPE.cache.remove(elm.childNodes[i]);
        }
        EPE.cache.removeChild(elm);
      };
  }

  /***********************************************
  *
  *
  *  Section 5 - Functions for collabaration with
  *              external scripts (hooks)
  *
  *
  ***********************************************/

  /**
   * Create a new EPE.PlugIn object.
   *
   * @param t The element tag which this plugin is for. If not
   * provided then all elements are assumed.
   */
  EPE.PlugIn = function(t) {
      this.con = t ? EPE.tags[t.toLowerCase()] : HTMLElement;
      if(!this.con)
        throw new Error('EPE.PlugIn: No constructor for tag found.');
    };

  // Storage for external functions which are executed when
  // an element is created
  EPE.PlugIn.create = {};

  // Storage for external functions which are executed when
  // a property of an element is changed
  EPE.PlugIn.change = {};

  // Storage for external functions which are executed when
  // an alement is attached to the document
  EPE.PlugIn.attach = {};

  /**
   * Add a create or change listener.  These listeners are called from EPE.extend which
   * is called when application code invokes the init method,
   * when a new node is attached to the document in innerHTML, and from
   * document createElement.
   *
   * The event module UEM registers create listeners.
   *
   * @param t The type of listener. Either create or change
   * @param f The event function.
   */
  EPE.PlugIn.prototype.addEPEListener =
    function(t,f) {
      var con = this.con.toString();
      // If constructor doesn't exist in cache then function doesn't either
      if (!EPE.PlugIn[t][con]) {
        EPE.PlugIn[t][con] = [];
        EPE.PlugIn[t][con].push(f);
      }
      else {
        // Only cache if function is not cached already
        var l = EPE.PlugIn[t][con].length;
        for(var i=0; i<l; i++) {
          if (EPE.PlugIn[t][con] == f)
            return;
        }
        EPE.PlugIn[t][con].push(f);
      }
    };

    /**
     * Remove a create or change listener.
     *
     * @param t The type of listener. Either create or change
     * @param f The event function.
     */
    EPE.PlugIn.prototype.removeEPEListener =
      function(t,f) {
        // If function is not registered for constructor just return
        var con = this.con.toString();
        if (!EPE.PlugIn[t][con])
          return;
        // Else find function
        var l = EPE.PlugIn[t][con].length;
        var n = 0;
        for(var i=0; i<l; i++)
          EPE.PlugIn[t][con][i] == f ? n++ : EPE.PlugIn[t][con][i-n] = EPE.PlugIn[t][con][i];
        EPE.PlugIn[t][con].length = EPE.PlugIn[t][con].length - n;
        // If no functions are registered for constructor remove array
        if (!EPE.PlugIn[t][con].length)
          delete EPE.PlugIn[t][con];
      };

  // Execute create listeners
  EPE.PlugIn.executeCreate =
    function(elm) {
      var con = null;
      if (elm.nodeName != 'APPLET' && elm.nodeName != 'OBJECT') {
        con = elm.constructor.toString();
      }
      // Temp. solution for OBJECT and APPLET tags
      else {
        try {
          con = elm.constructor.toString();
        }
        catch (ex) {
        }
      }
      // Execute listeners on specific element
      if (con != null && this.create[con]) {
        if (elm.nodeName != 'APPLET' && elm.nodeName != 'OBJECT') {
          for(var i=0; i<this.create[con].length; i++)
            this.create[con][i].apply(elm);
        }
        // Temp. solution for OBJECT and APPLET tags
        else {
          for(var i=0; i<this.create[con].length; i++)
            try {
              this.create[con][i].apply(elm);
            }
            catch (ex) {
            }
        }
      }
      // Execute listeners on HTMLElement
      else if (this.create['HTMLElement']) {
        for(var i=0; i<this.create['HTMLElement'].length; i++) {
          if (elm.nodeName != 'APPLET' && elm.nodeName != 'OBJECT') {
            this.create['HTMLElement'][i].apply(elm);
          }
          // Temp. solution for OBJECT and APPLET tags
          else {
            try {
              this.create['HTMLElement'][i].apply(elm);
            }
            catch (ex) {
            }
          }
        }
      }
    };

  // Execute change listeners
  EPE.PlugIn.executeChange =
    function(elm,e) {
      var con = elm.constructor.toString();
      // Stop property watching
      EPE.disableWatch(elm);
      // If element is in fact the document object
      // Execute listeners on specific element
      if (this.change[con]) {
        for(var i=0; i<this.change[con].length; i++)
          this.change[con][i].apply(elm,[e]);
      }
      // Execute listeners on HTMLElement
      else if (this.change['HTMLElement']) {
        for(var i=0; i<this.change['HTMLElement'].length; i++)
          this.change['HTMLElement'][i].apply(elm,[e]);
      }
      // Re-enable property watching
      EPE.enableWatch(elm);
    };

  // Execute attach listeners
  EPE.PlugIn.executeAttach =
    function(elm) {
      var con = elm.constructor.toString();
      // Stop property watching
      EPE.disableWatch(elm);
      // Execute listeners on specific element
      if (this.attach[con]) {
        for(var i=0; i<this.attach[con].length; i++)
          this.attach[con][i].apply(elm);
      }
      // Execute listeners on HTMLElement
      if (this.attach['HTMLElement']) {
        for(var i=0; i<this.attach['HTMLElement'].length; i++)
          this.attach['HTMLElement'][i].apply(elm);
      }
      // Re-enable property watching
      EPE.enableWatch(elm);
    };

  /***********************************************
  *
  *
  *  Section 6 - Redeclaration of native JS
  *              functions/methods
  *
  ***********************************************/

  /**
   * Replacement for the native appendChild method. Appends a child element
   * and arranges for the node and it's children to be prototype extended.
   *
   * @param elm The node to append as the last of this element's children.
   */
  EPE.appendChild =
    function(elm) {
      EPE.extendInnerHTML(elm);
      // Remove from cache
      if (EPE.CACHE_ELEMENTS && elm.cached)
        EPE.cache.remove(elm);
      return this._appendChild(elm);
    };

  /**
   * Replacement for the native insertBefore method. Inserts a child element
   * and arranges for the node and it's children to be prototype extended.
   *
   * @param newChild The node to insert.
   * @param refChild The child node that will be the nextChild after
   *     the insertion.
   */
  EPE.insertBefore =
    function(newChild, refChild) {
      EPE.extendInnerHTML(newChild);
      if (EPE.CACHE_ELEMENTS && newChild.cached)
        EPE.cache.remove(newChild);
      return this._insertBefore(newChild, refChild);
    };

  /**
   * Replacement for the native replaceChild method. Replaces a child element
   * and arranges for the node and it's children to be prototype extended.
   *
   * @param newChild The node to insert.
   * @param refChild The child node that will be replaced after the insertion
   *     is complete.
   */
  EPE.replaceChild =
    function(newChild, oldChild) {
      EPE.extendInnerHTML(newChild);
      if (EPE.CACHE_ELEMENTS && newChild.cached)
        EPE.cache.remove(newChild);
      return this._replaceChild(newChild, oldChild);
    };

  /**
   * Replacement for the native insertRow method for tables and tablesections.
   * Creates a row, inserts it into the table or table section
   * and arranges for the node and it's children to be prototype extended.
   *
   * @param i Index where the row should be inserted.
   */
  EPE.insertRow =
    function(i) {
      var tr = this._insertRow(i);
      return tr ? EPE.extend(tr) : null;
    };

  /**
   * Replacement for the native insertCell method for table rows.
   * Creates a cell, inserts it into the table row
   * and extends the cell.
   *
   * @param i Index of the cell.
   */
  EPE.insertCell =
    function(i) {
      var td = this._insertCell(i);
      return td ? EPE.extend(td) : null;
    };

  /**
   * Replacement for the native createCaption method for tables.
   * Creates a caption, inserts it into the table
   * and extends the caption.
   *
   */
  EPE.createCaption =
    function() {
      var cap = this._createCaption();
      return cap ? EPE.extend(cap) : null;
    };

  /**
   * Replacement for the native createTHead method for tables.
   * Creates a table header section, inserts it into the table
   * and extends the tablesection.
   *
   */
  EPE.createTHead =
    function() {
      var th = this._createTHead();
      return th ? EPE.extend(th) : null;
    };

  /**
   * Replacement for the native createTFoot method for tables.
   * Creates a table footer section, inserts it into the table
   * and extends the tablesection.
   *
   */
  EPE.createTFoot =
    function() {
      var tf = this._createTFoot();
      return tf ? EPE.extend(tf) : null;
    };

  // If HTMLCollections are anabel by the user
  if (EPE.ENABLE_HTMLCOLLECTIONS) {
    /**
     * Replacement for the native getElementsByTagName method.
     * Creates a proper HTMLCollection which can be extended
     * by prototyping on HTMLCollection.prototype
     *
     * @param t The tag name.
     */
    EPE.getElementsByTagName =
      function(t) {
        var c = new HTMLCollection(this._getElementsByTagName(t));
        return c;
      };
  }

  /***********************************************
  *
  *
  *  Section 7 - Prototype handling
  *
  *
  ***********************************************/

  /**
  * Create a pseudo prototype object for HTML constructors.  The pseudo
  * prototype reflects the content of the original prototype.  Application
  * code that looks like it is changing the original, real prototype is
  * in reality only changing the pseudo-prototype.  There is only one instance
  * of this pseudo-prototype.  This singleton is a target of propertychange
  * events when application code attempts to alter an HTML prototype.
  *
  * This is the first function to be called when EPE is loaded.
  *
  * @param oCon A reference to the constructor.  This is either HTMLElement
  *             itself or a subclass of HTMLElement.
  */
  EPE.initPrototype =
    function(oCon) {
      // oCon is object constructor function
      // Save real prototype.
      oCon._prototype = oCon.prototype;
      // Create element so we can trigger onpropertychange
      oCon.prototype = EPE.IECreateElement('epe');
      // Copy functions from real prototype to pseudo prototype
      // This is done to synchronize the real and pseudo
      // prototype objects when the pseudo object is
      // first created. All subsequent changes will *always*
      // be to the pseudo object and EPE.updatePrototype
      // will be responsible for syncronizing with the
      // real prototype.
      for(var p in oCon._prototype)
        oCon.prototype[p] = oCon._prototype[p];
      // Set the constructor to point at correct function
      oCon.prototype.constructor = oCon;
      // Create toString method so the same is reported as in Firefox
      oCon.toString = EPE.constructorToString;
      // Add <epe> tag to html HEAD section - we probably do least harm here
      document.documentElement.childNodes[0].appendChild(oCon.prototype);
      // Listen for changes to the pseudo prototype
      oCon.prototype.attachEvent('onpropertychange',EPE.updatePrototype);
  };

  /**
   * Called whenever our expando tag changes properties.  When a change
   * to the prototype is attempted in application code, the change is really
   * made to a pseudo-prototype.
   *
   * If the change is for an HTMLElement, the same change is made to the real
   * and pseudo prototypes of the subclasses of HTMLElement.  Then the change
   * is propagated to all elements in the DOM hierarchy.  If caching is enabled
   * by the application code, the same change is propagated to all cached
   * elements.
   *
   * If the change is for a proper subclass of HTMLElement, then
   * the corresponding change is propagated to the real prototype.  Then the
   * change is propagated to all elements in the DOM hierarchy that have a
   * tag name that is backed by the HTMLElement subclass.  If caching is
   * enabled by the application code, the same change is propagated to all
   * cached elements with the appropriate tag names.
   */
  EPE.updatePrototype =
    function(){
      // Property name in pseudo prototype object which was altered
      var p = event.propertyName;
      // Shortcut
      var src = event.srcElement;
      // Update the real prototype. The pseudo prototype is already updated
      // - that was what caused the event to happen in the first place)
      src.constructor._prototype[p] = src[p];
      // If the prototype being updated is on the HTMLElement
      // we need to propagate changes to all constructors.
      if (src.constructor == HTMLElement) {
        var a = EPE.uniqueTags;
        var l = a.length;
        // Update all real and pseudo prototypes
        for(var i=0; i<l; i++) {
          // Only update/overwrite if constructor does not have a property already
          // If p exist then a function on the prototype has been declared
          // and a declaration on HTMLElement should not override.
          //if (a[i]._prototype[p] == undefined) {
            a[i]._prototype[p] = src[p];
            // If we don't update the pseudo prototype then HTML[TAG]Element.prototype[p] will be undefined
            // This will trigger onpropertychange so temp. remove in order to avoid endless recursion
            a[i].prototype.detachEvent('onpropertychange',EPE.updatePrototype);
            a[i].prototype[p] = src[p];
            a[i].prototype.attachEvent('onpropertychange',EPE.updatePrototype);
          //}
        }
        // Update all elements
        EPE.updateAllElements(p,src[p]);
      }
      else {
        // Update elements constructed from this constructor
        var a = src.constructor.tags;
        var l = a.length;
        // Update elements
        for(var i=0; i<l; i++)
          EPE.updateElements(a[i],p,src[p]);
      }
    };

   /**
   *  Update all elements setting element.  First, all elements that are
   *  already in the DOM hierarchy of the current document are updated
   *  (excluding only the nodes added by initPrototype to catch propertychange
   *  events triggered by prototype changes).  Then, if the application code
   *  has enabled element caching, elements that have been stored in the
   *  cache and that have not yet been attached to the DOM hierarchy are
   *  updated.
   *
   *  @param p Property name.
   *  @param v Property value.
   */
  EPE.updateAllElements =
    function(p,v) {
      var elms = document.all;
      // This loop causes all elements to fire onpropertychange
      // Changes to the prototype is an intricate part of EPE
      // and should not be communicated to other scripts
      var l = elms.length;
      for(var i=0; i<l; i++) {
        if (elms[i].tagName != '!' && elms[i].tagName != 'epe') {
          EPE.disableWatch(elms[i]);
          elms[i][p] = v;
          EPE.enableWatch(elms[i]);
        }
      }
    };

  /**
  * Update all elements with a given tagname.  The elements are altered by
  * setting the value of a given property.
  *
  * The update is done in two steps.  First, all instances of the tag that
  * are in the DOM hierarchy of the current document are updated.  Then, if
  * the application code has enabled element caching, elements that have been
  * stored in the cache and that have not yet been attached to the DOM
  * hierarchy are updated.
  *
  * @param tag {String} An HTML tag name.
  * @param p {String}   The name of the property.
  * @param v The value of the property.
  */
  EPE.updateElements =
    function(tag,p,v) {
      // Get specific elements in document
      var elms = document.getElementsByTagName(tag);
      // This loop causes all elements of type tag to fire onpropertychange
      // Changes to the prototype is an intricate part of EPE
      // and should not be communicated to other scripts
      var l = elms.length;
      for(var i=0; i<l; i++) {
        EPE.disableWatch(elms[i]);
        elms[i][p] = v;
        EPE.enableWatch(elms[i]);
      }
    };

  /***********************************************
  *
  *
  *  Section 8 - Element constructor declarations
  *
  *
  ***********************************************/

  // Tag to constructor name table
  EPE.tags = {
    a: HTMLAnchorElement,
    applet: HTMLAppletElement,
    area: HTMLAreaElement,
    base: HTMLBaseElement,
    basefont: HTMLBaseFontElement,
    body: HTMLBodyElement,
    br: HTMLBRElement,
    button: HTMLButtonElement,
    caption: HTMLTableCaptionElement,
    col: HTMLTableColElement,
    colgroup: HTMLTableColElement,
    del: HTMLModElement,
    dir: HTMLDirectoryElement,
    div: HTMLDivElement,
    dl: HTMLDListElement,
    em: HTMLSpanElement,  // Firefox extension.
    fieldset: HTMLFieldSetElement,
    font: HTMLFontElement,
    form: HTMLFormElement,
    frame: HTMLFrameElement,
    frameset: HTMLFrameSetElement,
    h1: HTMLHeadingElement,
    h2: HTMLHeadingElement,
    h3: HTMLHeadingElement,
    h4: HTMLHeadingElement,
    h5: HTMLHeadingElement,
    h6: HTMLHeadingElement,
    head: HTMLHeadElement,
    hr: HTMLHRElement,
    html: HTMLHtmlElement,
    iframe: HTMLIFrameElement,
    img: HTMLImageElement,
    input: HTMLInputElement,
    ins: HTMLModElement,
    isindex: HTMLIsIndexElement,
    label: HTMLLabelElement,
    legend: HTMLLegendElement,
    li: HTMLLIElement,
    link: HTMLLinkElement,
    map: HTMLMapElement,
    menu: HTMLMenuElement,
    meta: HTMLMetaElement,
    object: HTMLObjectElement,
    ol: HTMLOListElement,
    optgroup: HTMLOptGroupElement,
    option: HTMLOptionElement,
    p: HTMLParagraphElement,
    param: HTMLParamElement,
    pre: HTMLPreElement,
    q:  HTMLQuoteElement,
    select: HTMLSelectElement,
    script: HTMLScriptElement,
    span: HTMLSpanElement,  // Firefox extension.
    strike: HTMLSpanElement,  // Firefox extension.
    strong: HTMLSpanElement,  // Firefox extension.
    style: HTMLStyleElement,
    table: HTMLTableElement,
    tbody: HTMLTableSectionElement,
    td: HTMLTableCellElement,
    textarea: HTMLTextAreaElement,
    tfoot: HTMLTableSectionElement,
    th: HTMLTableCellElement,
    thead: HTMLTableSectionElement,
    title: HTMLTitleElement,
    tr: HTMLTableRowElement,
    ul: HTMLUListElement
  };

  // Create array of unique constructors
  EPE.uniqueTags = [];
  for(var p in EPE.tags)
    EPE.uniqueTags.push(EPE.tags[p]);
  var a = [];
  var l = EPE.uniqueTags.length;
  for(var i=0; i<l; i++) {
    for(var j=i+1; j<l; j++) {
      // If this[i] is found later in the array
      if (EPE.uniqueTags[i] == EPE.uniqueTags[j])
        j = ++i;
    }
    a.push(EPE.uniqueTags[i]);
  }
  EPE.uniqueTags = a;

  // IE conditional comments have to be used to hide the function declarations
  // below from Safari and Opera. This is due to Sarafi and Opeara following
  // the ECMA 262 spec on conditional function declarations. Firefox deviates
  // from the spec but might correct it in the future.
  // The conditional comments renders the jsdoc comments useless so they have
  // been changed to inline comments

  // HTMLDocument. Just a placeholder - not meant to be instantiated
  // @constructor

  /*@cc_on
  function HTMLDocument() {}
  document.constructor = HTMLDocument;
  HTMLDocument.toString = EPE.constructorToString;

  // HTMLElement.  The other elements inherit from this object.
  // @param t {String} A tag name.
  // @constructor
  function HTMLElement(t) {
    if (t) {
      var elm = EPE.IECreateElement(t);
      EPE.extend(elm,arguments.callee);
      return elm;
    }
  }
  HTMLElement.tags = ['all'];

  //  A (anchor) tag.
  //  @constructor
  function HTMLAnchorElement() {
    var elm = EPE.IECreateElement('a');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLAnchorElement.tags = ['a'];


  //  APPLET tag.
  //  @constructor
  function HTMLAppletElement() {
    var elm = EPE.IECreateElement('applet');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLAppletElement.tags = ['applet'];

  // AREA tag.
  // @constructor
  function HTMLAreaElement() {
    var elm = EPE.IECreateElement('area');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLAreaElement.tags = ['area'];

  // BASE tag.
  function HTMLBaseElement() {
    var elm = EPE.IECreateElement('base');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLBaseElement.tags = ['base'];

  // BASEFONT tag.
  // @constructor
  function HTMLBaseFontElement() {
    var elm = EPE.IECreateElement('basefont');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLBaseFontElement.tags = ['basefont'];

  //  BODY tag.
  //  @constructor
  function HTMLBodyElement() {
    var elm = EPE.IECreateElement('body');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLBodyElement.tags = ['body'];

  // BR tag.
  // @constructor
  function HTMLBRElement() {
    var elm = EPE.IECreateElement('br');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLBRElement.tags = ['br'];

  // BUTTON tag.
  // @constructor
  function HTMLButtonElement() {
    var elm = EPE.IECreateElement('button');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLButtonElement.tags = ['button'];

  // CAPTION tag.
  // @constructor
  function HTMLTableCaptionElement() {
    var elm = EPE.IECreateElement('caption');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLTableCaptionElement.tags = ['caption'];

  // COL, COLGROUP tag.
  // @constructor
  function HTMLTableColElement(tag) {
    var elm = EPE.IECreateElement(tag);
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLTableColElement.tags = ['col','colgroup'];

  // DIR tag.
  // @constructor
  function HTMLDirectoryElement() {
    var elm = EPE.IECreateElement('dir');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLDirectoryElement.tags = ['dir'];

  // DIV tag.
  // @constructor
  function HTMLDivElement() {
    var elm = EPE.IECreateElement('div');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLDivElement.tags = ['div'];

  // DL tag.
  // @constructor
  function HTMLDListElement() {
    var elm = EPE.IECreateElement('dl');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLDListElement.tags = ['dl'];

  // FIELDSET tag.
  // @constructor
  function HTMLFieldSetElement() {
    var elm = EPE.IECreateElement('fieldset');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLFieldSetElement.tags = ['fieldset'];

  // FONT tag.
  // @constructor
  function HTMLFontElement() {
    var elm = EPE.IECreateElement('font');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLFontElement.tags = ['font'];

  // FORM tag.
  // @constructor
  function HTMLFormElement() {
    var elm = EPE.IECreateElement('form');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLFormElement.tags = ['form'];


  // FRAME tag.
  // @constructor
  function HTMLFrameElement() {
    var elm = EPE.IECreateElement('frame');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLFrameElement.tags = ['frame'];

  // FRAMESET tag.
  // @constructor
  function HTMLFrameSetElement() {
    var elm = EPE.IECreateElement('frameset');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLFrameSetElement.tags = ['framset'];

  // H1, H2, H3, H4, H5, H6 tag.
  // @param t {String} A tag name.  One of 'h1', 'h2', 'h3', 'h4', 'h5', or 'h6'.
  // @constructor
  function HTMLHeadingElement(t) {
    var elm = EPE.IECreateElement(t);
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLHeadingElement.tags = ['h1','h2','h3','h4','h5','h6'];

  // HEAD tag.
  // @constructor
  function HTMLHeadElement() {
    var elm = EPE.IECreateElement('head');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLHeadElement.tags = ['head'];

  // HR tag.
  // @constructor
  function HTMLHRElement() {
    var elm = EPE.IECreateElement('hr');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLHRElement.tags = ['hr'];

  // HTML tag.
  // @constructor
  function HTMLHtmlElement() {
    var elm = EPE.IECreateElement('html');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLHtmlElement.tags = ['html'];

  // IFRAME tag.
  // @constructor
  function HTMLIFrameElement() {
    var elm = EPE.IECreateElement('iframe');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLIFrameElement.tags = ['iframe'];

  // IMG tag.
  // @constructor
  function HTMLImageElement() {
    var elm = EPE.IECreateElement('img');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLImageElement.tags = ['img'];

  // INPUT tag.
  // @constructor
  function HTMLInputElement() {
    var elm = EPE.IECreateElement('input');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLInputElement.tags = ['input'];

  // DEL, INS tag.
  // @param t {String} A tag name.  One of 'del' or 'ins'.
  // @constructor
  function HTMLModElement(t) {
    var elm = EPE.IECreateElement(t);
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLModElement.tags = ['del','ins'];

  // ISINDEX tag.
  // @constructor
  function HTMLIsIndexElement() {
    var elm = EPE.IECreateElement('isindex');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLIsIndexElement.tags = ['isindex'];

  // LABEL tag.
  // @constructor
  function HTMLLabelElement() {
    var elm = EPE.IECreateElement('label');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLLabelElement.tags = ['label'];

  // LEGEND tag.
  // @constructor
  function HTMLLegendElement() {
    var elm = EPE.IECreateElement('legend');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLLegendElement.tags = ['legend'];

  // LI tag.
  // @constructor
  function HTMLLIElement() {
    var elm = EPE.IECreateElement('li');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLLIElement.tags = ['li'];

  // LINK tag.
  // @constructor
  function HTMLLinkElement() {
    var elm = EPE.IECreateElement('link');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLLinkElement.tags = ['link'];

  // MAP tag.
  // @constructor
  function HTMLMapElement() {
    var elm = EPE.IECreateElement('map');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLMapElement.tags = ['map'];

  // MENU tag.
  // @constructor
  function HTMLMenuElement() {
    var elm = EPE.IECreateElement('menu');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLMenuElement.tags = ['menu'];

  // META tag.
  // @constructor
  function HTMLMetaElement() {
    var elm = EPE.IECreateElement('meta');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLMetaElement.tags = ['meta'];

  // OBJECT tag.
  // @constructor
  function HTMLObjectElement() {
    var elm = EPE.IECreateElement('object');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLObjectElement.tags = ['object'];

  // OL tag.
  // @constructor
  function HTMLOListElement() {
    var elm = EPE.IECreateElement('ol');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLOListElement.tags = ['ol'];

  // OPTGROUP tag.
  // @constructor
  function HTMLOptGroupElement() {
    var elm = EPE.IECreateElement('optgroup');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLOptGroupElement.tags = ['optgroup'];

  // OPTION tag.
  // @constructor
  function HTMLOptionElement() {
    var elm = EPE.IECreateElement('option');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLOptionElement.tags = ['option'];

  // P tag.
  // @constructor
  function HTMLParagraphElement() {
    var elm = EPE.IECreateElement('p');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLParagraphElement.tags = ['p'];

  // PARAM tag.
  // @constructor
  function HTMLParamElement() {
    var elm = EPE.IECreateElement('param');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLParamElement.tags = ['param'];

  // PRE tag.
  // @constructor
  function HTMLPreElement() {
    var elm = EPE.IECreateElement('pre');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLPreElement.tags = ['pre'];

  // Q tag.
  // @constructor
  function HTMLQuoteElement() {
    var elm = EPE.IECreateElement('q');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLQuoteElement.tags = ['q'];

  // SELECT tag.
  // @constructor
  function HTMLSelectElement() {
    var elm = EPE.IECreateElement('select');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLSelectElement.tags = ['select'];

  // SCRIPT tag.
  // @constructor
  function HTMLScriptElement() {
    var elm = EPE.IECreateElement('script');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLScriptElement.tags = ['script'];

  // EM, SPAN, STRONG tag.  This is not a W3C class.
  // @param t {String} A tag name.  One of 'em', 'span', or 'strong'.
  // @constructor
  function HTMLSpanElement(t) {
    var elm = EPE.IECreateElement(t);
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLSpanElement.tags = ['em','span','strike','strong'];

  // STYLE tag.
  // @constructor
  function HTMLStyleElement() {
    var elm = EPE.IECreateElement('style');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLStyleElement.tags = ['style'];

  // TABLE tag.
  // @constructor
  function HTMLTableElement() {
    var elm = EPE.IECreateElement('table');
    EPE.extend(elm,arguments.callee);
    // Save ref. to original methodd
    elm._createTCaption = elm.createTCaption;
    elm._createTHead = elm.createTHead;
    elm._createTFoot = elm.createTFoot;
    elm._insertRow = elm.insertRow;
    // Replace with EPE version
    elm.createTCaption = EPE.createTCaption;
    elm.createTHead = EPE.createTHead;
    elm.createTFoot = EPE.createTFoot;
    elm.insertRow = EPE.insertRow;
    return elm;
  }
  HTMLTableElement.tags = ['table'];

  // TBODY, TFOOT, THEAD tag.
  // @param t {String} A tag name.  One of 'tbody', 'tfoot', or 'thead'.
  // @constructor
  function HTMLTableSectionElement(t) {
    var elm = EPE.IECreateElement(t);
    EPE.extend(elm,arguments.callee);
    // Save ref. to original method
    elm._insertRow = elm.insertRow;
    // Replace with EPE version
    elm.insertRow = EPE.insertRow;
    return elm;
  }
  HTMLTableSectionElement.tags = ['tbody','tfoot','thead'];

  // TD, TH tag.
  // @param t {String} A tag name.  One of 'tr' or 'th'.
  // @constructor
  function HTMLTableCellElement(t) {
    var elm = EPE.IECreateElement(t);
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLTableCellElement.tags = ['td','th'];

  // TEXTAREA tag.
  // @constructor
  function HTMLTextAreaElement() {
    var elm = EPE.IECreateElement('textarea');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLTextAreaElement.tags = ['textarea'];

  // TITLE tag.
  // @constructor
  function HTMLTitleElement() {
    var elm = EPE.IECreateElement('title');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLTitleElement.tags = ['title'];

  // TR tag.
  // @constructor
  function HTMLTableRowElement() {
    var elm = EPE.IECreateElement('tr');
    EPE.extend(elm,arguments.callee);
    // Save ref. to original method
    elm._insertCell = elm.insertCell;
    // Replace with EPE version
    elm.insertCell = EPE.insertCell;
    return elm;
  }
  HTMLTableRowElement.tags = ['tr'];

  // UL tag.
  // @constructor
  function HTMLUListElement() {
    var elm = EPE.IECreateElement('ul');
    EPE.extend(elm,arguments.callee);
    return elm;
  }
  HTMLUListElement.tags = ['ul'];
  @*/

  // Create pseudo prototype object on all HTML constructors
  EPE.initPrototype(HTMLElement);
  var a = EPE.uniqueTags;
  var l = a.length;
  for(var i=0; i<l; i++)
    EPE.initPrototype(a[i]);
}
// [uem.ie.js]

// Content
//  1. User configurable settings
//  2. W3C EventListener Interface
//  3. UEM EventListener utility methods
//  4. UEM Event Wrapper
//  5. Interaction with EPE
//  6. UEM Event object utility methods

// Works for IE version 6.0 and above
if (document.createEventObject) {

  /***********************************************
   *
   *
   *  Section 1 - User configurable settings
   *
   *
   ***********************************************/

  // Declare namespace
  UEM = {};

  // Include support for assigning event handlers
  // through innerHTML or assigning as properties.
  // If you are only assigning event handlers using
  // element.addEventListener turn this feature off
  // for increased performance.
  // Default value is 1. Set to 0 to turn off
  UEM.WATCH_PROPERTIES = 1;

  // Execute event listeners for the target in the
  // capture phase. This behavior is also implemented
  // in Firefox, Opera and Safari although the W3C standard
  // says the opposite.
  // Default value is 1. Set to 0 to turn off
  UEM.CAPTURE_ON_TARGET = 1;

  // THERE ARE NO CONFIGURABLE SETTINGS BELOW THIS LINE

  /***********************************************
   *
   *
   *  Section 2 - W3C EventListener Interface
   *
   *
   ***********************************************/

  /**
   * Add an event listener.  This method belongs to HTML elements which
   * supply values for it's this keyword.
   *
   * W3C Reference: http://www.w3.org/TR/DOM-Level-3-Events/events.html#Events-listeners
   *
   * Mozilla reference: http://developer.mozilla.org/en/docs/DOM:element.addEventListener
   *
   * @param type { String } Event type. One of DOMActivate, DOMFocusIn,
   *     DOMFocusOut, abort, blur, change, click, dblclick, error, focus,
   *     load, keydown, keypress, keyup, mousedown, mousemove, mouseover,
   *     mouseup, reset, resize, scroll, select, submit, textinput, or
   *     unload. Of these, dbclick is an extension to the set of W3C event
   *     types.
   * @param fnc { Function } The handler for the event.
   * @param useCapture {boolean} If true, then the handler is available for
   *     invocation during the capture and target phases of event propagation.
   *     If false, the handler is available for invocation during the target
   *     and bubble phases.
   */
  UEM.ADD_TO_WINDOW = false;
  UEM.addEventListener =
    function(type, fnc, useCapture) {
      // For unknown reasons 'this' is not equal to window if a function
      // which is defined on an object is called as a method on window
      // Using call solves it.
      if (this.self && !UEM.ADD_TO_WINDOW) {
        // onload events *must* be assigned using attachEvent
        if (type == 'load')
          window.attachEvent('onload',function(){var e = UEM.createEventObject(window.event); fnc(e);});
        else {
          UEM.ADD_TO_WINDOW = true;
          arguments.callee.call(window, type, fnc, useCapture);
          UEM.ADD_TO_WINDOW = false;
        }
        return;
      }
      // Translate to W3C type
      type = UEM.getEventType(type);
      // Don't monitor changes in elements properties while assigning new event handler
      // This can lead to all kind of unsuspected behaviors
      EPE.disableWatch(this);
      // Shortcut - the type of event. 'UEM' string added to minimize chance of property already existing.
      var eType = 'UEM'+type;
      // If no events are registered for this element
      // and this type of event create array to hold
      // event handlers for this type of event
      if (!this[eType])
        this[eType] = new Array();
      var l = this[eType].length;
      // Do not register duplicate event handlers
      for(var i=0; i<l; i++) {
        if (this[eType][i].fnc == fnc && this[eType][i].useCapture === useCapture) {
          // Enable watching of property changes
          EPE.enableWatch(this);
          return;
        }
      }
      // If this is a capture handler insert it as the last capture handler but
      // before any target/bubbling handler to prevent out-of-order execution
      // in the target phase.
      if (useCapture) {
        // Find first bubbling handler
        for(var i=0; i<l; i++) {
          if (!this[eType][i].useCapture)
            break;
        }
        // i is the position for the new capture handler
        // IE needs 2nd argument for array.splice - this is an error in IE
        var bHandlers = this[eType].splice(i, this[eType].length - i);
        // Create object for storing function reference to event handler
        // and boolean for using capture or not
        this[eType][i] = {};
        // Remember whether we want to use the capture phase or not
        this[eType][i].useCapture = useCapture;
        // Save function reference
        this[eType][i].fnc = fnc;
        // Concat arrays
        this[eType] = this[eType].concat(bHandlers);
      }
      // This is a target/bubbling handler just append to array
      else {
        // Create object for storing function reference to event handler
        // and boolean for using capture or not
        this[eType][l] = {};
        // Remember whether we want to use the capture phase or not
        this[eType][l].useCapture = useCapture;
        // Save function reference
        this[eType][l].fnc = fnc;
      }
      // Declare the event handler for this type of event to be the UEM.Wrapper
      this['on'+type] = UEM.wrapper;
      // Enable watching of property changes
      EPE.enableWatch(this);
    };

  /**
   * Remove an event listener.  This method belongs to HTML elements which
   * supply values for it's this keyword.
   *
   * W3C Reference: http://www.w3.org/TR/DOM-Level-3-Events/events.html#Events-listeners
   *
   * Mozilla reference: http://developer.mozilla.org/en/docs/DOM:element.removeEventListener
   *
   * @param type { String } Event type. One of DOMActivate, DOMFocusIn,
   *     DOMFocusOut, abort, blur, change, click, dblclick, error, focus,
   *     load, keydown, keypress, keyup, mousedown, mousemove, mouseover,
   *     mouseup, reset, resize, scroll, select, submit, textinput, or
   *     unload. Of these, dbclick is an extension to the set of W3C event
   *     types.
   * @param fnc { Function } The handler for the event to be removed.
   * @param useCapture {boolean} If true, then the handler is available for
   *     invocation during the capture and target phases of event propagation.
   *     If false, the handler is available for invocation during the target
   *     and bubble phases.
   */
  UEM.removeEventListener =
    function(type, fnc, useCapture) {
      type = UEM.getEventType(type);
      // Don't monitor changes in elements properties while removing event handlers
      // This can lead to all kind of unsuspected behaviors
      EPE.disableWatch(this);
      // Shortcut - the type of event. 'UEM' string added to minimize chance of property already existing.
      var eType = 'UEM'+type;
      // If handler exist for this element and this type of event
      if (this[eType]) {
        var l = this[eType].length;
        // Remove handler if function and useCapture match
        for(var i=0; i<l; i++) {
          if (this[eType][i].fnc == fnc && this[eType][i].useCapture === useCapture) {
            // Reorder array - move j+1 to j
            for(var j=i; j<l-1; j++) {
              this[eType][j] = this[eType][j+1];
            }
            this[eType].length--;
            // If array is empty then no event handlers of this type
            // is registered for this element. Remove array.
            if (!this[eType].length) {
              this[eType] = null;
              // Also remove reference from type of event to UEM.wrapper
              // Will avoid memory leak in IE 6.1
              this['on'+type] = null;
            }
            break;
          }
        }
      }
      // Enable watching of property changes
      EPE.enableWatch(this);
    };

  /**
   * Create an event for dispatching.  This method belongs to HTML elements which
   * supply values for it's this keyword.
   *
   * W3C reference: http://www.w3.org/TR/DOM-Level-3-Events/events.html#Events-DocumentEvent-createEvent
   *
   * Mozilla reference: http://developer.mozilla.org/en/docs/DOM:document.createEvent
   *
   * IE reference: http://msdn2.microsoft.com/en-us/library/ms536390.aspx
   *
   * Note:  The approach used now is using fireEvent to actually initiate an
   *        event in IE. It might be better/more feasible to leave out fireEvent
   *        and just create the type of event directly.
   *
   * @param type { String } 'Event', 'MouseEvent', or 'UIEvent'.
   * @param e { IE Event object } An actual IE event object. Optional
   * @return an event object.
   */
    // Define createEvent
  document.createEvent =
    function(eventClass, e) {
      // We are holding back on MutationEvent and KeyboardEvent
      if (eventClass == 'Event' || eventClass == 'HTMLEvent' || eventClass == 'UIEvent' || eventClass == 'TextEvent' || eventClass == 'MouseEvent' || eventClass == 'KeyboardEvent' || eventClass == 'MutationEvent') {
        // Map HTMLEvents to Event.
        if (eventClass == 'HTMLEvent')
          eventClass = 'Event';
        return new window[eventClass](e);
      }
      else
        throw new Error('UEM: Event class not supported.');
    };

  /**
   * Dispatch an event into any element.  This method belongs to HTML elements which
   * supply values for it's this keyword.
   *
   * W3C reference: http://www.w3.org/TR/DOM-Level-3-Events/events.html#Events-EventTarget-dispatchEvent
   *
   * Mozilla reference: http://developer.mozilla.org/en/docs/DOM:element.dispatchEvent
   *
   * IE reference: http://msdn2.microsoft.com/en-us/library/ms536423.aspx
   *
   * @param e The event to dispatch.
   * @return true if the event was successfully dispatched and false if the
   * event was cancelled.
   *
   * Currently we avoid to use native IE event object and fireEvent method when dispatching.
   * See also notes in UEM.wrapper.
   */
  UEM.dispatchEvent =
    function(e) {
      // When dispatch by the user the target is not set before now
      e.target = this;
      UEM.wrapper.call(this, e);
    };

  /***********************************************
   *
   *
   *  Section 3 - UEM EventListener utility methods
   *
   *
   ***********************************************/

  /**
   * Used for removing all event handlers when assigning a single handler as a property
   * NOTE: Currently only called by UEM.watch when watching is DISABLED. Hence no need
   *       to disable watching in this function.
   *
   * @param type { String } Event type. One of DOMActivate, DOMFocusIn,
   *     DOMFocusOut, abort, blur, change, click, dblclick, error, focus,
   *     load, keydown, keypress, keyup, mousedown, mousemove, mouseover,
   *     mouseup, reset, resize, scroll, select, submit, textinput, or
   *     unload. Of these, dbclick is an extension to the set of W3C event
   *     types.
   */
  UEM.removeAllEventListeners =
    function(type) {
      UEM.getEventType(type);
      // If a type is provided remove only event handlers of that type
      if (type) {
        // Remove array of UEM object holding true event handler functions
        this['UEM'+type] = null;
        // Remove the actual event property of the element
        this['on'+type] = null;
      }
      // Else remove all event handlers
      // ** NOT WORKING YET - BUT NOT USED YET ** //
      else {
        /*
      var tmp = "";
      for(var p in this) {
        if (typeof this[p] == "object" && p.match(/^on/) || && p != "onpropertychange") {
          tmp = p.replace(/on/,"");
          this['UEM'+tmp] = null;
          this[p] = null;
        }
      }
         */
      }
    };

  /**
   * Return an array with names of events that EPE supports.  This is a subset
   * of the events that can actually be thrown natively, especially when the
   * browser is Internet Explorer.  The names returned are the native names,
   * not the W3C names.  The names returned are not prefixed with 'on'.  For
   * instance, 'activate' might be a member;  not 'DOMActivate' or 'onactivate'.
   *
   * @param tag {String} An HTML tag name.
   * @return an array with names of allowed events.
   */
  UEM.getPossibleEventTypes =
    function(tag) {
      return UEM.elementEventTypes.allTags.concat(UEM.elementEventTypes[tag]);
    };

  // Lookup table for possible event types
  // W3C References: http://www.w3.org/2007/07/xhtml-basic-ref.html
  // http://www.w3.org/TR/1999/REC-html401-19991224/sgml/dtd.html
  UEM.elementEventTypes =
    {
      allTags: ['activate', 'click', 'dblclick', 'focusin', 'focusout', 'keydown', 'keypress', 'keyup', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mousewheel', 'mouseup'],
      a: ['blur','focus'],
      body: ['load','unload'],
      button: ['blur','focus'],
      form: ['reset','submit'],
      input: ['blur','change','focus','select'],
      label: ['blur','focus'],
      select: ['blur','change','focus'],
      textarea: ['blur','change','focus','select']
    };

  /**
   * If the specified tag is one that can have an event listener, return
   * true.  Otherwise false.  Most tags can have event listeners.  An
   * example of a tag that cannot have an event listener is 'br' or 'head'.
   *
   * @param tag {String} An HTML tag name.
   * @return true if the tag can have event listeners; otherwise, false.
   */
  UEM.canHaveEvents =
    function(tag) {
      var a = UEM.noEvents;
      var l = a.length;
      for(var i=0; i<l; i++) {
        if (a[i] == tag)
          return false;
      }
      return true;
    };

  // List of tags which can not have event listeners
  UEM.noEvents = ['br','style','script','head','meta','link','title'];

  /**
   * Translate name of event type from W3C to IE.
   *
   * @param type {String} A W3C event name.
   * @return the native event name.
   */
  UEM.getEventType =
    function(type) {
      return UEM.eventTypes[type] ? UEM.eventTypes[type] : type;
    };

  // Event type translation table
  // Translate name of event type from W3C to IE
  UEM.eventTypes =
    {
      DOMActivate: 'activate',
      DOMFocusIn: 'focusin',
      DOMFocusOut: 'focusout',
      // Don't know wheter this is W3C but Firefox is using DOMMouseScroll
      DOMMouseScroll: 'mousewheel'
    };

  /**
   * Convert functions defined as inline event handlers
   * to proper event listeners.
   *
   * @param f {String} The JavaScript statement or statements that define the
   * inline event handler.
   * @return a new W3C-compatible event handler.  The new handler takes an
   *     event object reference as it's first argument.  The new handler
   *     is wrapped in the body of an anonymous function.
   */
  UEM.convertInlineHandler =
    function(f) {
      // Get body of original event handler
      var m = f.toString().match(/\{([\s\S]*)\}/m)[1];
      var b = m.replace(/^\s*\/\/.*$/mg,'');
      // Wrap body in anonymous function with event as an extra argument
      return new Function('event',b);
    };

  /***********************************************
   *
   *
   *  Section 4 - UEM Event Wrapper
   *
   *
   ***********************************************/

  /**
   * The event handler for all elements on all types of events
   * except for the onpropertychange which is handled separately.  The
   * assignment of the event handler is made in addEventListener.  The 'this'
   * keyword for wrapper references the same object as the 'this' keyword
   * for this call to addEventListener.  During propagation, the 'this'
   * keyword refers to the same element as the currentTarget property of the
   * event object.
   *
   * EXPERIMENTAL: If argument e is supplied UEM.wrapper was called from UEM.dispatch.
   *               This is a cleaner way of dispatching as IE behaves weird with UEM +
   *               natie fireEvent method,
   */
  UEM.wrapper =
    function(e) {
      // If e is supplied this is event is dispatched by the user
      if (!e) {
        // Cancel bubbling - UEM takes care of this
        window.event.cancelBubble = true;
        // Create a proper W3C event object
        var e = UEM.createEventObject(window.event);
      }
      // Shortcut - the type of event. 'UEM' string added to minimize chance of property already existing.
      var eType = 'UEM' + e.type;
      // Temp. array for event functions higher up in the DOM structure - capture phase
      var aCap = [];
      // Temp. array for event functions higher up in the DOM structure - bubbling phase
      var aBub = [];
      var n = this;
      // Add all parent nodes which have an event function for this event type
      while((n = n.parentNode) != null) {
        if (n[eType])
          aCap.push(n);
      }
      // Insert document in propagation chain ONLY if target is document and
      // type of handler exist for document
      if (this == document && document[eType])
        aCap.push(document);
      if (this == window && window[eType])
        aCap.push(window);
      // Reverse capture array to simulate capture phase
      aCap.reverse();
      // For all elements in capture chain. Return false if propagation was stopped
      if (!e.propagate(aCap,true))
        return false;
      // Event phase changes to AT_TARGET
      e.eventPhase = Event.AT_TARGET;
      // Check whether event handler for the target
      // still exist. It might have been removed by
      // another event handler in the capturing phase
      if (this[eType]) {
        // Execute event handlers for this element
        // if the same function is registered twice
        // using both capture and bubbling, then that
        // handler will be executed twice now
        //
        // If 2 event handlers are registered - one for capture
        // and one for bubbling then a special case where the
        // first might cancel itself or the next may arise.
        //
        // Save original length
        var l = this[eType].length;
        for (var i=0; i<this[eType].length; i++) {
          e.currentTarget = this;
          // Apperently you can never have an event listener execute in the target phase
          // for the document object - at least not in Firefox, Opera and Safari so we also
          // avoid it
          if (this != document) {
            // Do not trigger a capture phase handler for this element for an event
            // dispatched directly to this element unless this option is enabled by user
            if (!this[eType][i].useCapture || UEM.CAPTURE_ON_TARGET) {
              // Execute event handler
              this[eType][i].fnc.call(this,e);
              // Check whether stopPropagation() has been called
              if (e.propagationStopped)
                return false;
              // It is possible that this['UEM'+e.type] has now been modified
              // If this['UEM'+e.type] does not exist anymore just break
              if (!this[eType])
                break;
              // If the length of the array has been shortened
              else if (l > this[eType].length) {
                l = this[eType].length;
                i--;
              }
            }
          }
        }
      }
      // Only do bubbling phase if event bubbles
      if (e.bubbles) {
        // We have to iterate again as handlers in the
        // capture or atTarget phases might have removed/added
        // other handlers
        n = this;
        while((n = n.parentNode) != null) {
          if (n[eType])
            aBub.push(n);
        }
        // Insert document in propagation chain ONLY if target is document and
        // type of handler exist for document
        if (this == document && document[eType])
          aBub.push(document);
        if (this == window && window[eType])
          aBub.push(window);
        // Event phase changes to BUBBLING_PHASE
        e.eventPhase = Event.BUBBLING_PHASE;
        // For all elements in bubbling chain. Return false if propagation was stopped
        if (!e.propagate(aBub,false))
          return false;
      }
      return true;
    };

  /***********************************************
   *
   *
   *  Section 5 - Interaction with EPE
   *
   *
   ***********************************************/

  // Define Event interface for window
  window.addEventListener = UEM.addEventListener;
  window.removeEventListener = UEM.removeEventListener;
  window.dispatchEvent = UEM.dispatchEvent;
  window.removeAllEventListeners = UEM.removeAllEventListeners;


  // Define Event interface for document
  document.addEventListener = UEM.addEventListener;
  document.removeEventListener = UEM.removeEventListener;
  document.dispatchEvent = UEM.dispatchEvent;
  document.removeAllEventListeners = UEM.removeAllEventListeners;


  // Define Event interface for elements
  HTMLElement.prototype.addEventListener = UEM.addEventListener;
  HTMLElement.prototype.removeEventListener = UEM.removeEventListener;
  HTMLElement.prototype.dispatchEvent = UEM.dispatchEvent;
  HTMLElement.prototype.removeAllEventListeners = UEM.removeAllEventListeners;

  /**
   * Check for all possible native event handlers and convert to proper event
   * handlers.  This is a listener that is registered as a creation handler
   * with EPE.  The 'this' keyword refers to the element being created and is
   * supplied by EPE when the callback to onElementCreate is made.
   */
  UEM.onElementCreate =
    function() {
      // Get tagName
      var tag = this.tagName.toLowerCase();
      // If node is an element which can't have event listeners
      if (!UEM.canHaveEvents(tag))
        return;
      // Element may have event listeners
      // Possible types are click, dblclick, keydown, keypress, keyup, mousedown, mousemove, mouseout, mouseover, mouseup
      // and the types specific to the element
      var eTypes = UEM.getPossibleEventTypes(tag);
      var tmp = '';
      // For each possible event handler in tag
      for(var p in eTypes) {
        tmp = 'on'+eTypes[p];
        // If handler is defined for node
        if (this[tmp]) {
          // Convert inline function to proper event listener and
          // register event listener. This will implicitely redefine the
          // inline event handler to UEM.wrapper
          this.addEventListener(eTypes[p], UEM.convertInlineHandler(this[tmp]), false);
        }
      }
    };

  /**
   * A property change listener.  It's purpose is to add an event listener
   * if required by some property change event.  The property
   * change event is generated when JavaScript code directly adds or sets a
   * property on a DOM HTML element or when JavaScript code adds elements
   * using the innerHTML property.
   *
   * The 'this' keyword refers to the element being created and is
   * supplied by EPE when the callback to onElementCreate is made.
   *
   * @param e An Internet Explorer event object.
   */
  UEM.onElementChange =
    function(e) {
      var p = e.propertyName;
      if (p.match(/^on/))
        this.addEventListener(p, this[p], false);
    };

  // Create EPE PlugIn
  EPE.PlugIn.UEM = new EPE.PlugIn();
  // Register element create listener function with EPE
  EPE.PlugIn.UEM.addEPEListener('create',UEM.onElementCreate);
  // Register element change listener function with EPE
  // if enabled by user
  // functions
  if (UEM.WATCH_PROPERTIES)
    EPE.PlugIn.UEM.addEPEListener('change',UEM.onElementChange);

  /***********************************************
   *
   *
   *  Section 6 - UEM Event object utility methods
   *
   *
   ***********************************************/

  UEM.createEventObject =
    function(ie_event) {
      // Get event class
      var eClass = UEM.getEventClass(ie_event.type);
      // Construct object
      var e = new window[eClass](ie_event);
      // Init UEM Event properties: currentTarget, eventPhase, target, timeStamp
      e.initUEMEvent(ie_event);
      // Determine general properties
      // If bubbling is enabled check whether event type actually bubbles
      var bubbles = UEM.doesBubble(ie_event.type);
      // If canceling is enabled (or not set at all) check whether event type can actually be cancelled
      // The cancelable property is set by Event.prototype.toIE when event is created from Element.dispatch
      var cancelable = ie_event.cancelable !== false || ie_event.cancelable === undefined ? UEM.isCancelable(ie_event.type) : false;
      // Switch on event class
      switch(eClass) {
        case 'Event':
          e.initEvent(ie_event.type, bubbles, cancelable);
          break;
        case 'UIEvent':
          e.initUIEvent(ie_event.type, bubbles, cancelable, window, null);
          break;
        case 'MouseEvent':
          // Number of clicks on mouse if any
          var detail = null;
          if (ie_event.type == 'dblclick')
            detail = 2;
          else if (ie_event.type == 'click' || ie_event.type == 'mouseup' || ie_event.type == 'mousedown')
            detail = 1;
          // wheel moves in multiplum of 120 and direction is reversed -> so multiply by -1 and divide by 40
          // to get Firefox equivalent
          else if (ie_event.type == 'mousewheel')
            detail = -1 * ie_event.wheelDelta / 40;
          // Translate button number from IE to W3C
          var button = UEM.getButton(ie_event.button);
          // Element which is related to the element firing the event
          var relatedTarget = null;
          if (ie_event.type == 'mouseout')
            relatedTarget = ie_event.toElement;
          else if (ie_event.type == 'mouseover')
            relatedTarget = ie_event.fromElement;
          e.initMouseEvent(ie_event.type, bubbles, cancelable, window, detail, ie_event.screenX, ie_event.screenY, ie_event.clientX, ie_event.clientY, ie_event.ctrlKey, ie_event.altKey, ie_event.shiftKey,null, button, relatedTarget);
          break;
        case 'TextEvent':
          var data = String.fromCharCode(ie_event.keyCode);
          e.initTextEvent(ie_event.type, bubbles, cancelable, window, data);
          e.ctrlKey = ie_event.ctrlKey;
          e.altKey = ie_event.altKey;
          e.shiftKey = ie_event.shiftKey;
          e.metaKey = false;
          break;
        case 'KeyboardEvent':
          // Not used at the moment
          var modifiersList = '';
          var keyIdentifier = null;
          e.keyCode = ie_event.keyCode;
          if (UEM.getW3CKeyIdentifier) {
            keyIdentifier = UEM.getW3CKeyIdentifier(ie_event.keyCode);
          }
          var keyLocation = KeyboardEvent.DOM_KEY_LOCATION_STANDARD;
          // keyIdentifier == 'Control'
          if (ie_event.keyCode == 17)
            keyLocation = ie_event.ctrlLeft ? KeyboardEvent.DOM_KEY_LOCATION_LEFT : KeyboardEvent.DOM_KEY_LOCATION_RIGHT;
          // keyIdentifier == 'Shift'
          else if (ie_event.keyCode == 16)
            keyLocation = ie_event.shiftLeft ? KeyboardEvent.DOM_KEY_LOCATION_LEFT : KeyboardEvent.DOM_KEY_LOCATION_RIGHT;
          // keyIdentifier == 'Alt'
          else if (ie_event.keyCode == 18)
            keyLocation = ie_event.altLeft ? KeyboardEvent.DOM_KEY_LOCATION_LEFT : KeyboardEvent.DOM_KEY_LOCATION_RIGHT;
          // Left Win
          else if (ie_event.keyCode == 91)
            keyLocation = KeyboardEvent.DOM_KEY_LOCATION_LEFT;
          // Right Win
          else if (ie_event.keyCode == 92)
            keyLocation = KeyboardEvent.DOM_KEY_LOCATION_RIGHT;
          // Number pad
          else if (96 <= ie_event.keyCode && ie_event.keyCode <= 105)
            keyLocation = KeyboardEvent.DOM_KEY_LOCATION_NUMPAD;
          if (ie_event.ctrlKey)
            modifiersList += " Control";
          if (ie_event.altKey)
            modifiersList += " Alt";
          if (ie_event.shiftKey)
            modifiersList += " Shift";
          // Remove leading space
          if (modifiersList.length > 0)
            modifiersList = modifiersList.substring(1);
          e.initKeyboardEvent(ie_event.type, bubbles, cancelable, window, keyIdentifier, keyLocation, modifiersList);
          break;
        case 'MutationEvent':
          // Not used at the moment
          /*
          var relatedNode = null;
          var prevValue = null;
          var newValue = null;
          var attrName = null;
          var attrChange = null;
          e.initMutationEvent(ie_event.type, bubbles, cancelable, relatedNode, prevValue, newValue, attrName, attrChange);
           */
          break;
        default:
          break;
      }
      return e;
    };

  /**
   * Look up whether an event of a given type is cancelable.
   *
   * @param type {String} Event type.
   * @return true if the event is cancelable as defined by the W3C DOM event
   * specification.
   */
  UEM.isCancelable =
    function(type) {
      try {
        return UEM.eventTable[type].cancels;
      }
      catch (e) {
        throw new Error('UEM: Unsupported event type: ' + type);
      }
    };

  /**
   * Look up whether an event of a given type bubbles.
   *
   * @param type {String} Event type.
   * @return true if the event can be capture or bubble propagated.  If
   * event propagation is surpressed, return false.
   */
  UEM.doesBubble =
    function(type) {
      try {
        return UEM.eventTable[type].bubbles;
      }
      catch (e) {
        throw new Error('UEM: Unsupported event type: ' + type);
      }
    };

  /**
   * Get a W3C mouse button value for simple mouse events.  If two mouse
   * buttons are pressed simultaneously then
   * <table>
   * <thead><tr><th>Input</th><th>Output</th><th>Meaning</th><tr></thead>
   * <tbody>
   * <tr><td>0</td><td>0</td><td>No button was pressed.  Don't use this.</td></tr>
   * <tr><td>1</td><td>0</td><td>Left button is pressed.</td></tr>
   * <tr><td>2</td><td>2</td><td>Right button is pressed.</td></tr>
   * <tr><td>3</td><td>3</td><td>Left and right are both pressed.  Usage is not portable.</td></tr>
   * <tr><td>4</td><td>1</td><td>Middle button is pressed.</td></tr>
   * <tr><td>5</td><td>5</td><td>Left and middle are both pressed.  Usage is not portable.</td></tr>
   * <tr><td>6</td><td>6</td><td>Right and middle are both pressed.  Usage is not portable.</td></tr>
   * <tr><td>7</td><td>7</td><td>All three buttons are pressed.  Usage is not portable.</td></tr>
   * </tbody>
   * </table>
   *
   * @param i The native code for the mouse button that was pressed.
   * @return value depends on how the mouse is configured.  For a right-handed
   * mouse, return 0, 1, or 2 for a left, middle, or right mouse click.  For
   * a left-handed mouse, return 0, 1, or 2 for a right, middle, or left
   * mouse click.
  */
  UEM.getButton =
    function(i) {
      switch(i) {
        // Left button
        case 1:
          return 0;
        // Middle button
        case 4:
          return 1;
        default:
          return i;
      }
    };

  // W3C -> IE
  UEM.getIEButton =
    function(i) {
    switch(i) {
      case 0:
        return 1;
      case 1:
        return 4;
      default:
        return i;
    }
  };

  /**
   * Find the event class, given only an event name.
   * @param type
   * @return one of 'Event', 'UIEvent', 'MouseEvent', 'TextEvent',
   * 'KeyboardEvent', or 'MutationEvent'.
   */
  UEM.getEventClass =
    function(type) {
      try {
        return UEM.eventTable[type].eventClass;
      }
      catch (e) {
        throw new Error('UEM: Unsupported event type: ' + type);
      }
    };

  // Event property lookup table
  // Reference is summary table in
  // http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-EventTypes-complete
  UEM.eventTable =
    {
    // HTMLEvent
    abort:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'Event'
      },
    activate:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'UIEvent'
      },
    blur:
      {
        cancels: false,
        bubbles: false,
        eventClass: 'UIEvent'
      },
    // HTMLEvent
    change:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'Event'
      },
    click:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    contextmenu:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    dblclick:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    // HTMLEvent
    error:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'Event'
      },
    focus:
      {
        cancels: false,
        bubbles: false,
        eventClass: 'UIEvent'
      },
    focusin:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'UIEvent'
      },
    focusout:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'UIEvent'
      },
    keydown:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'KeyboardEvent'
      },
    keypress:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'TextEvent'
      },
    keyup:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'KeyboardEvent'
      },
    // HTLMEvent
    load:
      {
        cancels: false,
        bubbles: false,
        eventClass: 'Event'
      },
    mousedown:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    mousemove:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    mouseover:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    mouseout:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    mousewheel:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    mouseup:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'MouseEvent'
      },
    // HTMLEvent
    reset:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'Event'
      },
    // HTMLEvent
    resize:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'Event'
      },
    // HTMLEvent
    scroll:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'Event'
      },
    // HTMLEvent
    select:
      {
        cancels: false,
        bubbles: true,
        eventClass: 'Event'
      },
    // HTMLEvent
    submit:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'Event'
      },
    textInput:
      {
        cancels: true,
        bubbles: true,
        eventClass: 'TextEvent'
      },
    // HTMLEvent
    unload:
      {
        cancels: false,
        bubbles: false,
        eventClass: 'Event'
      }
    };
  }
// [uem.ie.event.js]

if (document.createEventObject) {

  /**
   * Construct an Event object.
   * W3C Reference: http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-Event
   *
   * @param e { IE Event object } An actual IE event object. Optional
   * @returns A new Event object
   * @type Event
   */
  /*@cc_on
  function Event() {
    this.bubbles = null;
    this.cancelable = null;
    this.currentTarget = null;
    this.eventPhase = null;
    this.target = null;
    this.timeStamp = null;
    this.type = null;
  }
  @*/
  // Constants
  Event.CAPTURING_PHASE = 1;
  Event.AT_TARGET = 2;
  Event.BUBBLING_PHASE = 3;

  // Methods
  /**
   * Initialize an event object.  Keyword 'this' is an event object.
   *
   * @param type {String} Event type.
   * @param canBubble Boolean that determines if the event propagates.
   * @param cancelable Boolean that determines if the event can be cancelled.
   */
  Event.prototype.initEvent =
    function(type,canBubble,cancelable) {
      this.type = type;
      this.bubbles = canBubble;
      this.cancelable = cancelable;
    };

  /**
   * Stop any propagation - both capturing and bubbling. Conforms to DOM3.
   * The 'this' keyword for 'stopPropagation' is a reference to the event object.
   */
  Event.prototype.stopPropagation =
    function() {
      this.propagationStopped = true;
    };
  /**
   * Prevent default action.  The default action is the semantics, often
   * visual, of the HTML element that fired the event.
   * The 'this' keyword for 'preventDefault' is a reference to the event object.
   */
  Event.prototype.preventDefault =
    function() {
      if (this.cancelable) {
        this.defaultPrevented = true;
        this.e.returnValue = false;
      }
    };

  // DOM 3 Methods
  // http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-Event-isCustom
  Event.prototype.isCustom =
    function() {
      return false;
    };

  // http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-Event-isDefaultPrevented
  Event.prototype.isDefaultPrevented =
    function() {
      return this.defaultPrevented;
    };

  // http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-Event-stopImmediatePropagation
  Event.prototype.stopImmediatePropagation =
    function() {
    };

  /**
   * Utility method for setting basic properties of event object
   * Mainly used from subclasses of the Event class
   * @param e { IE Event object } An actual IE event object.
   * @returns Undefined
   * @type Event
   */
  Event.prototype.initUEMEvent =
    function(ie_event) {
      // Save ref. to window event - we need this to set returnValue.
      this.e = ie_event;
      // currentTarget is set by wrapper/propagate
      this.currentTarget = null;
      this.eventPhase = Event.CAPTURING_PHASE;
      this.target = ie_event.srcElement;
      this.timeStamp = (new Date()).getTime();
    };

  /**
   * Execute functions in propagation chain.  The 'this' keyword for
   * 'propagate' is a reference to the event object.
   *
   * @param chain An array of event handlers.  The handlers must be listed
   *    in the correct propagation order.
   * @param useCapture {Boolean} True to invoke capture phase event handlers
   *    and false to execute bubble phase event handlers.
   * @return true if the propagation chain executes to completion.  False, if
   *    one of the handlers invoked by propagate calls stopPropagation.
   */
  Event.prototype.propagate =
    function(chain,useCapture) {
      // Shortcut - the type of event. 'UEM' string added to minimize chance of property already existing.
      var eType = 'UEM'+this.type;
      // For all elements in capture chain
      for (var i=0; i<chain.length; i++) {
        // Check whether any handler still exist as
        // they might have been removed by other
        // handlers
        if (chain[i][eType]) {
          // For each event of this type
          var l = chain[i][eType].length;
          // Execute event handlers registered with this useCapture (either true or false)
          for (var j=0; j<l; j++) {
            if (chain[i][eType][j].useCapture === useCapture) {
              // Update currentTarget to element whose event handlers are currently being processed
              this.currentTarget = chain[i];
              // Event handler may remove itself. Save length
              var l2 = l;
              chain[i][eType][j].fnc.call(chain[i],this);
              // Check whether stopPropagation has been called
              if (this.propagationStopped)
                return false;
              // Were all handlers for this type removed
              if (!chain[i][eType])
                break;
              // If length have changed (by removing or adding new handlers dynamically)
              if (l2 != chain[i][eType].length) {
                // If we are removing then l2 > l and j needs to be corrected
                if (l2 > l)
                  j -= (l - l2);
                l = chain[i][eType].length;
              }
            }
          }
        }
      }
      return true;
    };
}
// [uem.ie.uievent.js]

//http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-UIEvent

if (document.createEventObject) {
  // Constructor
  /*@cc_on
  function UIEvent() {
    // Rest of properties should be set with initUIEvent
    this.detail = null;
    this.view = window;
    // Extend to include all properties of Event object
  }
  @*/
  // Inherit from Event
  UIEvent.prototype = new Event();
  // Reset constructor
  UIEvent.prototype.constructor = UIEvent;

  // Methods
  /**
   * Initialize an event object.  Keyword 'this' is an event object.
   *
   * @param type {String} Event type.
   * @param canBubble Boolean that determines if the event propagates.
   * @param cancelable Boolean that determines if the event can be cancelled.
   * @param view The view from which the event was generated.
   * @param detail Detailed information about the event.  For MouseEvents, the
   *    detail identifies the button pressed.
   */
  UIEvent.prototype.initUIEvent =
    function(type,canBubble,cancelable,view,detail) {
    this.initEvent(type, canBubble, cancelable);
    this.view = view;
    this.detail = detail;
  };
}// [uem.ie.mouseevent.js]

//http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-MouseEvent

if (document.createEventObject) {
  // Constructor
  /*@cc_on
  function MouseEvent() {
    this.altKey = null;
    this.button = null;
    this.clientX = null;
    this.clientY = null;
    this.ctrlKey = null;
    this.metaKey = null;
    this.relatedTarget = null;
    this.screenX = null;
    this.screenY = null;
    this.shiftKey = null;
  };
  @*/
  // Inherit from UIEvent
  MouseEvent.prototype = new UIEvent();
  // Reset constructor
  MouseEvent.prototype.constructor = MouseEvent;

  // Methods
  /**
   * Initialize an event object.  Keyword 'this' is an event object.
   *
   * @param type {String} Event type.
   * @param canBubble Boolean that determines if the event propagates.
   * @param cancelable Boolean that determines if the event can be cancelled.
   * @param view The view from which the event was generated.
   * @param detail The mouse button that was pressed.
   * @param screenX The horizontal coordinate at which the event occurred relative to the origin of the screen coordinate system.
   * @param screenY The vertical coordinate at which the event occurred relative to the origin of the screen coordinate system.
   * @param clientX The horizontal coordinate at which the event occurred relative to the viewport associated with the event.
   * @param clientY The vertical coordinate at which the event occurred relative to the viewport associated with the event.
   * @param ctrlKey true if the control (Ctrl) key modifier is activated.
   * @param altKey true if the alternative (Alt) key modifier is activated.
   * @param shiftKey true if the shift (Shift) key modifier is activated.
   * @param metaKey true if the meta (Meta) key modifier is activated.
   * @param button During mouse events caused by the depression or release of a
   *   mouse button, button is used to indicate which mouse button changed state.
   *   0 indicates the normal button of the mouse (in general on the left or the
   *   one button on Macintosh mice, used to activate a button or select text).
   *   2 indicates the contextual property (in general on the right, used to
   *   display a context menu) button of the mouse if present.
   *   1 indicates the extra (in general in the middle and often combined with
   *   the mouse wheel) button. Some mice may provide or simulate more buttons,
   *   and values higher than 2 can be used to represent such buttons.
   * @param relatedTarget Used to identify a secondary EventTarget related to a
   *   UI event, depending on the type of event.
   */
  MouseEvent.prototype.initMouseEvent =
    function(type,canBubble,cancelable,view,detail,screenX,screenY,clientX,clientY,ctrlKey,altKey,shiftKey,metaKey,button,relatedTarget) {
    this.initUIEvent(type,canBubble,cancelable,view,detail);
    this.screenX = screenX;
    this.screenY = screenY;
    this.clientX = clientX;
    this.clientY = clientY;
    this.ctrlKey = ctrlKey;
    this.altKey = altKey;
    this.shiftKey = shiftKey;
    this.metaKey = metaKey;
    this.button = button;
    this.relatedTarget = relatedTarget;
  };

  //DOM 3 Methods
  MouseEvent.prototype.getModifierState =
    function(keyIdentifier) {
  };
}// [uem.ie.dom2keyboardevent.js]

// DOM 2 keyboard event file. Misleading as no DOM 2 keyboard input specification exists
// but its better to keep things seperate.

// http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-KeyboardEvent
// See trunk/uem.keyboardevent.identifiertable.js for notes on keyboard events
if (document.createEventObject) {
  // Constructor
  /*@cc_on
  function KeyboardEvent() {
    this.altKey = null;
    this.ctrlKey = null;
    this.keyIdentifier = null;
    this.keyLocation = null;
    this.metaKey = null;
    this.shiftKey = null;
    this.detail = undefined;
    // Carry keycode for the case where the code does not load the keyboard event maps.
    this.keycode = undefined;
  }
  @*/
  // Inherit from UIEvent
  KeyboardEvent.prototype = new UIEvent();
  // Reset constructor
  KeyboardEvent.prototype.constructor = KeyboardEvent;

  // Constants
  KeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0;
  KeyboardEvent.DOM_KEY_LOCATION_LEFT = 1;
  KeyboardEvent.DOM_KEY_LOCATION_RIGHT = 2;
  KeyboardEvent.DOM_KEY_LOCATION_NUMPAD = 3;

  // Methods
  /**
   * Initialize an event object.  Keyword 'this' is an event object.
   *
   * @param type {String} Event type.
   * @param canBubble Boolean that determines if the event propagates.
   * @param cancelable Boolean that determines if the event can be cancelled.
   * @param view The view from which the event was generated.
   * @param keyIdentifier Identifier of the key.
   * @param keyLocation The key location.  Some keys, the CTRL keys or numeric
   * keys, can be generated from more than one location on the keyboard.
   * @param modifiersList A white space separated list of modifier key
   * identifiers to be activated on this object. As an example, "Control Alt"
   * will mark the control and alt modifiers as activated.
   */
  KeyboardEvent.prototype.initKeyboardEvent =
    function(type,canBubble,cancelable,view,keyIdentifier,keyLocation,modifiersList) {
      this.initUIEvent(type, canBubble, cancelable, view, 0);
      this.detail = undefined;
      this.keyIdentifier = keyIdentifier;
      this.keyLocation = keyLocation;
      this.ctrlKey = (modifiersList.indexOf('Control') >= 0);
      this.altKey = (modifiersList.indexOf('Alt') >= 0);
      this.shiftKey = (modifiersList.indexOf('Shift') >= 0);
      this.metaKey = null;
    };

  //DOM 3 Methods
  KeyboardEvent.prototype.getModifierState =
    function(keyIdentifier) {
  };

//http://www.w3.org/TR/2003/NOTE-DOM-Level-3-Events-20031107/events.html#Events-TextEvent
  // Constructor
  /*@cc_on
  function TextEvent() {
    this.data = null;
    this.detail = undefined;
  };
  @*/
  // Inherit from UIEvent
  TextEvent.prototype = new UIEvent();
  // Reset constructor
  TextEvent.prototype.constructor = TextEvent;

  // Methods
  /**
   * Initialize an event object.  Keyword 'this' is an event object.
   *
   * @param type {String} Event type.
   * @param canBubble Boolean that determines if the event propagates.
   * @param cancelable Boolean that determines if the event can be cancelled.
   */
  TextEvent.prototype.initTextEvent =
    function(type,canBubble,cancelable,view,data) {
    this.initUIEvent(type, canBubble, cancelable, view, 0);
    this.detail = undefined;
    this.data = data;
  };
}
