/*jshint boss:true onevar:false browser:true*/
/*global createjs*/

(function() {
"use strict";

    var addEventListener = function(type, f) {
        if (!this.events[type]) {
            this.events[type] = [];
        }
        this.events[type].push(f);
    };
    var removeEventListener = function(type, f) {
        if (!this.events[type]) {
            return;
        }
        if (f) {
            this.events[type] = this.events[type].filter(function(i) { return i !== f; });
        } else {
            this.events[type] = [];
        }
    };
    var hasEventListener = function(type, f) {
        if (!this.events[type]) {
            return false;
        }
        return this.events[type].indexOf(f) > -1;
    };
    var fire = function(type, data) {
        var callbacks = this.events[type];
        data.type = type;
        if (callbacks) {
            callbacks = callbacks.slice();
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i].call(this, data);
            }
        }
    };

    [createjs.Stage, createjs.Shape, createjs.Text].forEach(function(constructor) {
        constructor.prototype.addEventListener = addEventListener;
        constructor.prototype.removeEventListener = removeEventListener;
        constructor.prototype.hasEventListener = hasEventListener;
        constructor.prototype.fire = fire;
    });

})();