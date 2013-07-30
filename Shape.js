/*jshint boss:true onevar:false browser:true*/
/*global createjs*/

(function() {
"use strict";

    createjs.Shape = createjs.Container = function() {
        this.children = [];
        this.graphics = new createjs.Graphics();
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.x = 0;
        this.y = 0;
        this.parent = null;
        this.id = createjs.getGUID();
        this.events = {};
    };

    createjs.Shape.prototype = {
        render: function(transform, gl) {
            var g = this.graphics;
            //create a matrix for transformation, pass it into the graphics object
            var transformed = createjs.mat3Mult(this.getMatrix(), transform);
            g.render(transformed, gl, this.id);
            return transformed;
        },
        getMatrix: function() {
            var rotation = [
                Math.cos(this.rotation), -Math.sin(this.rotation), 0,
                Math.sin(this.rotation), Math.cos(this.rotation), 0,
                0, 0, 1
            ];

            var translation = [
                1, 0, 0,
                0, 1, 0,
                this.x, this.y, 1
            ];

            var scale = [
                this.scaleX, 0, 0,
                0, this.scaleY, 0,
                0, 0, 1
            ];

            var spun = createjs.mat3Mult(scale, rotation);

            var final = createjs.mat3Mult(spun, translation);
            return final;
        }
    };

})();