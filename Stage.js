/*jshint boss:true onevar:false browser:true*/
/*global createjs*/

(function() {
"use strict";

    createjs.Stage = function(canvas, antialias) {
        this.canvas = canvas;
        this.children = [];
        antialias = antialias || false;
        this.gl = this.canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: antialias }) || 
            this.canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true, antialias: antialias });
        this.setupGL();
        this.bindEvents();
        this.idMap = {};
        this.events = {};
        this.drawingBuffer = null;
    };

    createjs.Stage.prototype = {
        setupGL: function() {
            var gl = this.gl;
            
            this.setupVectorProgram();
            this.setupTexturedProgram();
            this.setupPickProgram();

            gl.canvas2d = {
                element: document.createElement("canvas")
            };
            gl.canvas2d.context = gl.canvas2d.element.getContext("2d");
        },
        setupVectorProgram: function() {
            var gl = this.gl;
            var vector = gl.vector = {};

            //wouldn't it be nice to load these from an external source--or build them in? Yes. Yes it would.
            var vSource = 
                "uniform vec2 u_resolution;" +
                "uniform mat3 u_transform;" +
                "attribute vec2 a_position;" +
                "attribute vec4 a_color;" +
                "varying vec4 v_color;" +
                "void main() {" +
                    "vec2 clipspace = ((u_transform * vec3(a_position, 1)).xy / u_resolution) * 2.0 - 1.0;" +
                    "gl_Position = vec4(clipspace * vec2(1, -1), 0, 1);" +
                    "v_color = a_color;" +
                "}";
            var fSource = 
                "precision mediump float;" +
                "varying vec4 v_color;" +
                "void main() {" +
                    "gl_FragColor = v_color;" +
                "}";
            var vertex = vector.vertex = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertex, vSource);
            gl.compileShader(vertex);

            var fragment = vector.fragments = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragment, fSource);
            gl.compileShader(fragment);

            var program = vector.program = gl.createProgram();
            gl.attachShader(program, vertex);
            gl.attachShader(program, fragment);
            gl.linkProgram(program);

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);

            vector.uniforms = {};

            vector.use = function() {
                if (gl.current === vector) {
                    return;
                }
                gl.useProgram(vector.program);
                var uniforms = vector.uniforms;
                uniforms.resolution = gl.getUniformLocation(program, "u_resolution");
                uniforms.transform = gl.getUniformLocation(program, "u_transform");
                gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
                gl.current = vector;
            };
        },
        setupTexturedProgram: function() {
            var gl = this.gl;
            var textured = gl.textured = {};

            var vSource = 
                "uniform vec2 u_resolution;" +
                "uniform mat3 u_transform;" +
                "attribute vec2 a_position;" +
                "attribute vec2 a_texcoords;" +
                "varying vec2 v_texcoords;" +
                "void main() {" +
                    "vec2 clipspace = ((u_transform * vec3(a_position, 1)).xy / u_resolution) * 2.0 - 1.0;" +
                    "gl_Position = vec4(clipspace * vec2(1, -1), 0, 1);" +
                    "v_texcoords = a_texcoords;" +
                "}";
            var fSource = 
                "precision mediump float;" +
                "uniform sampler2D u_sampler;" +
                "varying vec2 v_texcoords;" +
                "void main() {" +
                    "gl_FragColor = texture2D(u_sampler, v_texcoords);" +
                "}";
            var vertex = gl.textured.vertex = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertex, vSource);
            gl.compileShader(vertex);

            var fragment = gl.textured.fragment = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragment, fSource);
            gl.compileShader(fragment);

            var program = gl.textured.program = gl.createProgram();
            gl.attachShader(program, vertex);
            gl.attachShader(program, fragment);
            gl.linkProgram(program);

            textured.use = function() {
                if (gl.current === textured) {
                    return;
                }
                gl.useProgram(textured.program);
                var uniforms = textured.uniforms = {};
                uniforms.resolution = gl.getUniformLocation(program, "u_resolution");
                gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
                uniforms.transform = gl.getUniformLocation(program, "u_transform");
                uniforms.sampler = gl.getUniformLocation(program, "u_sampler");
                gl.current = textured;  
            };
            
        },
        setupPickProgram: function() {
            var gl = this.gl;
            var pick = gl.pick = {};

            var vSource = 
                "uniform vec2 u_resolution;" +
                "uniform mat3 u_transform;" +
                "attribute vec2 a_position;" +
                "void main() {" +
                    "vec2 clipspace = ((u_transform * vec3(a_position, 1)).xy / u_resolution) * 2.0 - 1.0;" +
                    "gl_Position = vec4(clipspace * vec2(1, -1), 0.0, 1.0);" +
                "}";
            var fSource = 
                "precision mediump float;" +
                "precision mediump int;" +
                "uniform vec2 u_id;" + 
                "void main() {" +
                    "gl_FragColor = vec4(u_id.x / 255.0, 0.0, u_id.y / 255.0, 1.0);" +
                "}";

            var vertex = pick.vertex = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertex, vSource);
            gl.compileShader(vertex);

            var fragment = pick.fragment = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragment, fSource);
            gl.compileShader(fragment);

            var program = pick.program = gl.createProgram();
            gl.attachShader(program, vertex);
            gl.attachShader(program, fragment);
            gl.linkProgram(program);

            pick.use = function() {
                gl.useProgram(program);
                var uniforms = pick.uniforms = {};
                uniforms.resolution = gl.getUniformLocation(program, "u_resolution");
                gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
                uniforms.transform = gl.getUniformLocation(program, "u_transform");
                uniforms.id = gl.getUniformLocation(program, "u_id");
                gl.current = pick;
            };
        },
        update: function() {
            var gl = this.gl;
            var identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
            var self = this;
            this.idMap = {};
            gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

            //walk the children list
            var walker = function(children, transform) {
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    //save child IDs for lookup later
                    if (child.id) {
                        self.idMap[child.id] = child;
                    }
                    //if not selecting an item, use the child's GL program.
                    if (gl.current !== gl.pick) {
                        self.drawingBuffer = null;
                        if (child instanceof createjs.Shape) {
                            gl.vector.use();
                        } else {
                            gl.textured.use();
                        }
                    } else {
                        //otherwise, we set the uniform and render
                        var msb = child.id >> 8;
                        var lsb = child.id & 0xFF;
                        gl.uniform2f(gl.current.uniforms.id, msb, lsb);
                    }
                    //ask the child to render to this GL context
                    var matrix = child.render(transform, gl);
                    //walk its children as well
                    if (child.children && child.children.length) {
                        walker(child.children, matrix);
                    }
                }
            };
            walker(this.children, identity);
        },
        enableMouseOver: function() {},
        bindEvents: function() {
            var canvas = this.canvas;
            var gl = this.gl;
            var self = this;
            var entered = null;

            ["mousemove", "click"].forEach(function(event) {
                canvas.addEventListener(event, function(e) {
                    if (!self.drawingBuffer) {
                        gl.pick.use();
                        self.update();
                        var buffer = new Uint8Array(canvas.width * canvas.height * 4);
                        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
                        gl.current = null;
                        self.update();
                        self.drawingBuffer = buffer;
                    }
                    //Would love to have this in Firefox
                    if (!e.offsetX) {
                        var offset = canvas.getBoundingClientRect();
                        e.offsetX = e.clientX - offset.left;
                        e.offsetY = e.clientY - offset.top;
                    }
                    //canvas coordinates are upside-down
                    var address = (e.offsetX + (canvas.height - e.offsetY) * canvas.width) * 4;
                    var pixelData = self.drawingBuffer.subarray(address, address + 4);
                    if (pixelData[1]) console.log(pixelData[1]);
                    var id = (pixelData[0] << 8) + pixelData[2];
                    var child = self.idMap[id];
                    if (child) {
                        child.fire(event);
                        if (child !== entered) {
                            //this is a mouseover
                            if (entered) {
                                entered.fire("mouseout");
                            }
                            child.fire("mouseover");
                            entered = child;
                        }
                    } else if (entered) {
                        entered.fire("mouseout");
                        entered = null;
                    }
                });
            });
        }
    };

})();