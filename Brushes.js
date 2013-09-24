/*jshint boss:true onevar:false browser:true*/
/*global createjs*/
(function() {
    "use strict";

    /*

    By moving the various types of draw operations out into a brushes object,
    it makes them a bit easier to manage: some of these (such as triangulating
    paths into polygons) are lengthy and would overwhelm readability in the
    previous, switch/case-based structure. This may also keep JSHint from
    bitching about cyclomatic complexity.

    Each brush should return a list of vertices to be run through
    gl.drawArray() (after the render adds the current color to the vertex
    buffer, of course). They take the current command, as well as the index of
    that command and the complete drawing stack (in case this is dependent on
    other operations). They'll be called with this set to the Graphics object.

    */
    createjs.Graphics.brushes = {
        triangle: function(cmd) {
            return [
                cmd.x1, cmd.y1,
                cmd.x2, cmd.y2,
                cmd.x3, cmd.y3
            ];
        },
        rect: function(cmd) {
            return [
                cmd.x, cmd.y,
                cmd.x, cmd.y + cmd.h,
                cmd.x + cmd.w, cmd.y,
                cmd.x + cmd.w, cmd.y,
                cmd.x + cmd.w, cmd.y + cmd.h,
                cmd.x, cmd.y + cmd.h
            ];
        },
        line: function(cmd) {
            //Since WebGL lacks real lines, and probably won't get them anytime
            //soon, we fake them by creating a quad along the length of the line.
            var start = { x: this.penCoords.x, y: this.penCoords.y };
            var end = { x: cmd.x, y: cmd.y };
            var dx = end.x - start.x;
            var dy = end.y - start.y;
            var length = Math.sqrt(dx * dx + dy * dy);
            var thickness = this.lineWidth / 2 || 0.5;
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
        },
        close: function(cmd, position, stack) {
            //work backwards, collecting all previous line/move commands
            var path = [];
            for (var i = position - 1; i >= 0; i--) {
                var previous = stack[i];
                if (previous.type !== "line" && previous.type !== "move") {
                    break;
                }
                path.unshift(previous);
            }
            //convert to tagged vertex objects
            path = path.map(function(p) {
                return {
                    cat: null, //category
                    v: p //vertex
                };
            });
            var triangles = [];
            //pass in three coordinate sets to get a cross product of the two vectors
            var cross = function(a, b, c) {
                var v1 = {
                    x: b.x - a.x,
                    y: b.y - a.y
                };
                var v2 = {
                    x: a.x - c.x,
                    y: a.y - c.y
                };
                return v1.x * v2.y - v1.y * v2.x;
            };
            var isConvex = function(index) {
                //return whether the cross is negative or not
                var a = path[index];
                var b = path.slice(index - 1).shift();
                var c = path[(index + 1) % path.length];
                return cross(a.v, b.v, c.v) >= 0;
            };
            var isEar = function(index) {
                //create the triangle
                var a = path.slice(index - 1).shift().v,
                    b = path[index].v,
                    c = path[(index + 1) % path.length].v;
                //check all other concave points against it
                for (var i = 0; i < path.length; i++) {
                    if (path[i].cat || Math.abs(i - index) < 2) continue;
                    var point = path[i].v;
                    var aa = Math.atan2(a.y - point.y, a.x - point.x);
                    var ba = Math.atan2(b.y - point.y, b.x - point.x);
                    var ca = Math.atan2(c.y - point.y, c.x - point.x);
                    var angles = ((aa - ca) + (ba - aa) + (ca - ba));
                    //accept some slipperiness from floating point
                    if (Math.abs(angles - (2 * Math.PI)) < 0.1) {
                        return false;
                    }
                }
                return true;
            };
            //that's re-sort, not resort like the vacation destination
            var resort = function() {
                var i;
                for (i = 0; i < path.length; i++) {
                    if (!path[i].cat && isConvex(i)) {
                        path[i].cat = "convex";
                    }
                }
                for (i = 0; i < path.length; i++) {
                    if (path[i].cat === "convex" && isEar(i)) {
                        path[i].cat = "ear";
                    }
                }
            };
            while (path.length > 3) {
                resort();
                var earIndex = path.map(function(p) { return p.cat; }).indexOf("ear");
                if (earIndex < 0) break;
                var t = [ path[earIndex].v, path.slice(earIndex - 1).shift().v, path[(earIndex + 1) % path.length].v ];
                triangles.push(
                    t[0].x, t[0].y,
                    t[1].x, t[1].y,
                    t[2].x, t[2].y
                );
                path = path.filter(function(_, i) {
                    return i !== earIndex;
                });
                resort();
            }
            path.forEach(function(p) {
                triangles.push(p.v.x, p.v.y);
            });
            return triangles;
        },
        circle: function(cmd) {
            var circumference = Math.PI * cmd.radius * 2;
            var vertexCount = Math.round(circumference / 6);
            if (vertexCount < 8) {
                vertexCount = 8;
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
            return vertices;
        },
        fill: function(cmd) {
            this.fillColor.r = cmd.r;
            this.fillColor.g = cmd.g;
            this.fillColor.b = cmd.b;
            this.fillColor.a = cmd.a;
            return null;
        },
        stroke: function(cmd) {
            this.strokeColor.r = cmd.r;
            this.strokeColor.g = cmd.g;
            this.strokeColor.b = cmd.b;
            this.strokeColor.a = cmd.a;
            return null;
        },
        width: function(cmd) {
            this.lineWidth = cmd.value;
            return null;
        }
    };

})();