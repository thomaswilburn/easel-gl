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
        child.parent = null;
    };
    var removeAllChildren = function() {
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].parent = null;
        }
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

    var localToGlobal = function(x, y) {
        var transform = this.getMatrix();
        var parent = this.parent;
        while (parent) {
            if (parent.getMatrix) {
                transform = createjs.mat3Mult(parent.getMatrix(), transform);
            }
            parent = parent.parent;
        }
        var result = {
            x: transform[0] * x + transform[3] * y + transform[6],
            y: transform[0] * x + transform[4] * y + transform[7]
        };
        return result;
    };

    [createjs.Stage, createjs.Shape].forEach(function(constructor) {
        constructor.prototype.addChild = addChild;
        constructor.prototype.removeChild = removeChild;
        constructor.prototype.removeAllChildren = removeAllChildren;
        constructor.prototype.globalToLocal = globalToLocal;
        constructor.prototype.localToGlobal = localToGlobal;
    });

})();