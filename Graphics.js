/*jshint boss:true onevar:false browser:true*/
/*global createjs*/

(function() {
"use strict";

    createjs.Graphics = function() {
        this.stack = [];
        this.fillColor = {
            r: 0,
            g: 0,
            b: 0,
            a: 1
        };
        this.strokeColor = {
            r: 0,
            g: 0,
            b: 0,
            a: 1
        };
        this.penCoords = {
            x: 0,
            y: 0
        };
        this.lineWidth = 2;
    };
    createjs.Graphics.prototype = {
        render: function(transform, gl, id) {

            id = id || 0;
            var self = this;

            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            var commands = [];
            var bufferLength = 0;

            //reset values that may be changed during draw operations
            this.lineWidth = 2;

            //For each vertex, we also fill in four floats for the color, allowing
            //multiple colored shapes to be drawn with a single drawArrays() call.
            var prepCommand = function(coords, isStroke) {
                var color = isStroke? self.strokeColor : self.fillColor;
                for (var i = 0; i < coords.length; i += 2) {
                    commands.push(coords[i], coords[i + 1], color.r, color.g, color.b, color.a);
                }
                bufferLength += coords.length >> 1;
            };

            //Formerly, this was a giant switch/case statement. Instead, we'll
            //look up draw operations on the brushes object and call the
            //function we find there. We also move the pen after all
            //operations, not just move or line. This effectively makes "move"
            //a no-op.
            for (var i = 0; i < this.stack.length; i++) {
                var cmd = this.stack[i];
                var brushes = createjs.Graphics.brushes;
                if (cmd.type in brushes) {
                    var verts = brushes[cmd.type].call(this, cmd, i, this.stack);
                    if (verts) prepCommand(verts, cmd.type === "line");
                }
                if ("x" in cmd && "y" in cmd) {
                    this.penCoords.x = cmd.x;
                    this.penCoords.y = cmd.y;
                }
            }

            //Currently, more than half the time of the render loop is spent
            //here. Probably much of that time is just from repeatedly getting
            //the same attribute locations and setting up buffers. The best
            //strategy to minimize this would be to call this code only when
            //finished or when switching away from a vector program, but then
            //we would have to use a single shared buffer across all vector
            //instances rendered at a time, and we would lose the ability to
            //set the vector translation via a uniform (it would have to go
            //into the vertex buffer).
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(commands), gl.STATIC_DRAW);

            var a_position = gl.getAttribLocation(gl.current.program, "a_position");
            gl.enableVertexAttribArray(a_position);
            gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 24, 0);

            var a_color = gl.getAttribLocation(gl.current.program, "a_color");
            if (a_color !== -1) {
                gl.enableVertexAttribArray(a_color);
                gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 24, 8);
            }

            gl.uniformMatrix3fv(gl.current.uniforms.transform, false, new Float32Array(transform));

            gl.drawArrays(gl.TRIANGLES, 0, bufferLength);
        },
        drawRect: function(x, y, w, h) {
            this.stack.push({
                type: "rect",
                x: x,
                y: y,
                w: w,
                h: h
            });
            return this;
        },
        drawCircle: function(x, y, r) {
            this.stack.push({
                type: "circle",
                x: x,
                y: y,
                radius: r
            });
            return this;
        },
        moveTo: function(x, y) {
            this.stack.push({
                type: "move",
                x: x,
                y: y
            });
            return this;
        },
        lineTo: function(x, y) {
            this.stack.push({
                type: "line",
                x: x,
                y: y
            });
            return this;
        },
        convertColor: function(color, alpha) {
            if (typeof alpha === "undefined") {
                alpha = 1;
            }
            if (typeof color === "string") {
                if (color.indexOf("rgb") === 0) {
                    color = color.replace(/rgba*\(|\)/g, "");
                    color = color.split(/,\s*/g);
                    var r = parseInt(color[0], 10);
                    var g = parseInt(color[1], 10);
                    var b = parseInt(color[2], 10);
                    if (color[3]) {
                        alpha = color[3];
                    }
                    color = (r << 16) + (g << 8) + (b & 0xFF);
                } else if (color.indexOf("hsl" === 0)) {
                    color = color.replace(/hsla*\(|\)/g, "");
                    color = color.split(/,\s*/g);
                    color = createjs.Graphics.getHSL(color[0], color[1], color[2]);
                } else {
                    color = color.replace("#", "");
                    if (color.length === 3) {
                        color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
                    }
                    color = parseInt(color, 16);
                }
            }
            return {
                r: Number((color >> 16) & 0xFF) / 255,
                g: Number((color >> 8) & 0xFF) / 255,
                b: Number(color & 0xFF) / 255,
                a: Number(alpha)
            };
        },
        beginFill: function(color, alpha) {
            var paint = this.convertColor(color, alpha);
            paint.type = "fill";
            this.stack.push(paint);
            return this;
        },
        beginStroke: function(color, alpha) {
            var paint = this.convertColor(color, alpha);
            paint.type = "stroke";
            this.stack.push(paint);
            return this;
        },
        setStrokeStyle: function(width) {
            this.stack.push({
                type: "width",
                value: width
            });
            return this;
        },
        closePath: function() {
            //we'll need to run through the stack, look for line functions,
            //and build a set of triangles out of them. 
            this.stack.push({ type: "close" });
        },
        clear: function() {
            this.stack = [];
            return this;
        }
    };

    //Generates a 24-bit RGB value from h (0-360), s (0 - 100), and l (0 - 100) values
    createjs.Graphics.getHSL = function(h, s, l) {
        l = Math.min(1, l / 100);
        s = Math.min(1, s / 100);
        h = h % 360;
        var c = (1 - Math.abs(2 * l - 1)) * s;
        h = (h / 60);
        var x = c * (1 - Math.abs((h % 2) - 1));
        var r, g, b;
        if (h >= 0 && h < 1) {
            r = c;
            g = x;
            b = 0;
        }
        if (h >= 1 && h < 2) {
            r = x;
            g = c;
            b = 0;
        }
        if (h >= 2 && h < 3) {
            r = 0;
            g = c;
            b = x;
        }
        if (h >= 3 && h < 4) {
            r = 0;
            g = x;
            b = c;
        }
        if (h >= 4 && h < 5) {
            r = x;
            g = 0;
            b = c;
        }
        if (h >= 5) {
            r = c;
            g = 0;
            b = x;
        }
        var m = l - c * 0.5;
        r = ((r + m) * 255) << 16;
        g = ((g + m) * 255) << 8;
        b = ((b + m) * 255) & 0xFF;
        return r + g + b;
    };

})();