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
     * <p>Forcibly acquires a resource.  Resources are allocated regardless of
     * if they are available.  Dispatches the {@link #onexhaustion()} event if
     * the resources were exhausted by this call.</p>
     *
     * @return true if this was actually available.
     * @type boolean
     */
    this.acquire = function () {
        var available = usage++ < resources

        if (usage == resources) {
            this.onexhaustion(usage)
        }

        return available
    }

    /**
     * Releases one resource.
     *
     * <p>Release a resource.  Dispatches the {@link onavailable} event if this
     * makes a resource available.</p>
     *
     * @return true if this makes a new resource available
     * @type boolean
     */
    this.release = function () {
        var available = --usage < resources

        if (usage == (resources - 1)) {
            this.onavailable(usage)
        }

        return available
    }

    this.onavailable  = function () { }
    this.onexhaustion = function () { }
}
