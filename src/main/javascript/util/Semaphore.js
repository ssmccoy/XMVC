/**
 * Create a semaphore.
 *
 * Creates a semaphore with the given number of resources.
 * @constructor
 * @class A super simple non-blocking semaphore
 */
function Semaphore (resources) {
    var usage = 0

    /**
     * Status of resource available.
     *
     * This value will be true of the resource is currently available.  It will
     * be false otherwise.
     *
     * @member
     * @type boolean
     */
    this.isAvailable = function () {
        return usage < resources
    }

    /**
     * Acquire one resource.
     *
     * Forcibly acquires a resource.  Resources are allocated regardless of if
     * they are available
     *
     * @return true if this was actually available.
     * @type boolean
     */
    this.acquire = function () {
        return usage++ < resources
    }

    /**
     * Releases one resource.
     *
     * @return true if this makes a new resource available
     * @type boolean
     */
    this.release = function () {
        return --usage < resources
    }
}
