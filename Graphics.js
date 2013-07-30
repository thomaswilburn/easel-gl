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
            var fill = this.fillColor;
            var pen = this.penCoords;
            
            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            var commands = [];
            var bufferLength = 0;

            //For each vertex, we also fill in four floats for the color, allowing
            //multiple colored shapes to be drawn with a single drawArrays() call.
            var prepCommand = function(coords) {
                for (var i = 0; i < coords.length; i += 2) {
                    commands.push(coords[i], coords[i + 1], fill.r, fill.g, fill.b, fill.a);
                }
                bufferLength += coords.length >> 1;
            };

            //Since WebGL lacks real lines, and probably won't get them anytime
            //soon, we fake them by creating a quad along the length of the line.
            //It's complex enough that we pull it out into its own utility
            //function.
            var makeLine = function(start, end) {
                var dx = end.x - start.x;
                var dy = end.y - start.y;
                var length = Math.sqrt(dx * dx + dy * dy);
                var thickness = self.lineWidth >> 1 || 0.5;
                var makeEndsMeet = function(a, b) {
                    var vec = { x: b.x - a.x, y: b.y - a.y };
                    var cw = { x: -vec.y / length * thickness, y: vec.x / length * thickness };
                    var ccw = { x: vec.y / length * thickness, y: -vec.x / length * thickness };
                    return [{ x: a.x + cw.x, y: a.y + cw.y }, {x: a.x + ccw.x, y: a.y + ccw.y }];
                };
                var corners = [].concat(makeEndsMeet(start, end), makeEndsMeet(end, start));
                var a = corners[0];
                var b = corners[1];
                var c = corners[2];
                var d = corners[3];
                return [
                    a.x, a.y,
                    b.x, b.y,
                    c.x, c.y,
                    c.x, c.y,
                    d.x, d.y,
                    a.x, a.y
                ];
            };

            for (var i = 0; i < this.stack.length; i++) {
                var cmd = this.stack[i];
                switch (cmd.type) {
                    case "rect":
                        prepCommand([
                            cmd.x, cmd.y,
                            cmd.x, cmd.y + cmd.h,
                            cmd.x + cmd.w, cmd.y,
                            cmd.x + cmd.w, cmd.y,
                            cmd.x + cmd.w, cmd.y + cmd.h,
                            cmd.x, cmd.y + cmd.h
                        ]);
                    break;


                    case "line":
                        var linePoly = makeLine({x: pen.x, y: pen.y}, {x: cmd.x, y:cmd.y}, cmd.thickness);
                        prepCommand(linePoly);
                    //fall through!

                    case "move":
                        pen.x = cmd.x;
                        pen.y = cmd.y;
                    break;

                    case "circle":
                        //we have to fake a triangle fan here, unfortunately.
                        //otherwise, circles would have to have their own
                        //gl.drawArray(), and nobody wants that (it'd be murder on
                        //our memory bandwidth).
                        var circumference = Math.PI * cmd.radius * 2;
                        var vertexCount = Math.round(circumference / 10);
                        if (vertexCount < 20) {
                            vertexCount = 20;
                        }
                        if (vertexCount > 60) {
                            vertexCount = 60;
                        }
                        var sweep = Math.PI * 2 / vertexCount;
                        var last = sweep;
                        var vertices = [];
                        var x0 = cmd.radius;
                        var y0 = 0;
                        for (var j = sweep * 2; j <= Math.PI * 2; j += sweep) {
                            var x1 = cmd.x + Math.cos(j) * cmd.radius;
                            var y1 = cmd.y + Math.sin(j) * cmd.radius;
                            var x2 = cmd.x + Math.cos(last) * cmd.radius;
                            var y2 = cmd.x + Math.sin(last) * cmd.radius;
                            vertices.push(
                                x0, y0,
                                x2, y2,
                                x1, y1
                            );
                            last = j;
                        }
                        prepCommand(vertices);
                    break;

                    case "fill":
                        fill.r = cmd.r;
                        fill.g = cmd.g;
                        fill.b = cmd.b;
                        fill.a = cmd.a;
                    break;
                }
            }

            //Currently, more than half the time of the render loop is spent here.
            //Probably much of that time is just from repeatedly getting the same
            //attribute locations and setting up buffers. The best strategy to
            //minimize this would be to call this code only when finished or when
            //switching away from a vector program, but then we would have to use
            //a single shared buffer across all vector instances rendered at a
            //time.
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
        beginFill: function(color, alpha) {
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
                        alpha = parseFloat(color[3], 10);
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
            this.stack.push({
                type: "fill",
                r: Number((color >> 16) & 0xFF) / 255,
                g: Number((color >> 8) & 0xFF) / 255,
                b: Number(color & 0xFF) / 255,
                a: alpha
            });
            return this;
        },
        beginStroke: function(color) {
            this.beginFill(color);
            return this;
        },
        setStrokeStyle: function(width) {
            this.lineWidth = width;
            return this;
        },
        clear: function() {
            this.stack = [];
            return this;
        }
    };

    createjs.Graphics.getHSL = function(h, s, l) {
        l /= 100;
        s /= 100;
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