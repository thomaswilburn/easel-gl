/*jshint boss:true onevar:false browser:true*/
/*global createjs*/

(function() {
"use strict";

    var addChild = function(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        this.children.push(child);
        child.parent = this;
    };
    var removeChild = function(child) {
        this.children = this.children.filter(function(item) { return item !== child; });
    };
    var removeAllChildren = function() {
        this.children = [];
    };

    var globalToLocal = function(x, y) {
        var transform = createjs.invertMatrix(this.getMatrix());
        var parent = this.parent;
        while (parent) {
            if (parent.getMatrix) {
                transform = createjs.mat3Mult(transform, createjs.invertMatrix(parent.getMatrix()));
            }
            parent = parent.parent;
        }
        var result = {
            x: transform[0] * x + transform[3] * y + transform[6],
            y: transform[1] * x + transform[4] * y + transform[7]
        };
        return result;
    };

    [createjs.Stage, createjs.Shape].forEach(function(constructor) {
        constructor.prototype.addChild = addChild;
        constructor.prototype.removeChild = removeChild;
        constructor.prototype.removeAllChildren = removeAllChildren;
        constructor.prototype.globalToLocal = globalToLocal;
    });

})();