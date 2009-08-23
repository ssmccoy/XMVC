
/** Defunct. */
xmvc.Crawler = function (registry) {
    this.process = function (fragment) {
        window.setTimeout(crawler.process(fragment), 10)
    }
}

