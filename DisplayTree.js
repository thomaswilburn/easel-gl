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

    var globalToLocal = function() { return {x: 0, y: 0}; };

    [createjs.Stage, createjs.Shape].forEach(function(constructor) {
        constructor.prototype.addChild = addChild;
        constructor.prototype.removeChild = removeChild;
        constructor.prototype.removeAllChildren = removeAllChildren;
        constructor.prototype.globalToLocal = globalToLocal;
    });

})();