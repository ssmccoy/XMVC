
load("xmvc/ControllerScope.js")

var scope = new xmvc.ControllerScope()

for (var i = 0; i < 10; i++) {
    scope.set("test." + i, i)
    scope = new xmvc.ControllerScope(scope)
}

for (var i = 0; i < 10; i++) {
    var a = scope.contains("test." + i)
    var b = scope.contains("test." + (i + 1))

    if (a == b) print("ERROR: Owning scope level mismatch")

    for (var x = 0; a.parent() != undefined; x++) {
        a = a.parent()
    }
    if (x != i) print(x + " != " + i)

    if (scope.valueOf("test." + i) != i) {
        print("Scope value mismatch, test." + i + " != " + i)
    }
}
