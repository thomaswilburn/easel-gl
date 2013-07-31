/*jshint boss:true onevar:false browser:true*/
/*global createjs*/

(function() {
"use strict";

    createjs.Text = function(text, font, color) {
        this.text = text || "WHATEVER.";
        this.font = font || "16px monospace";
        this.color = color || 0;
        this.scaleX = this.scaleY = 1;
        this.rotation = 0;
        this.x = this.y = 10;
        this.textAlign = "left";
        this.background = "white";
        this.parent = null;
        this.id = createjs.getGUID();
        this.events = {};
        this.mouseEnabled = false;
    };
    createjs.Text.prototype = {
        getMatrix: createjs.Shape.prototype.getMatrix,
        render: function(transform, gl) {

            this.x = Math.round(this.x);
            this.y = Math.round(this.y);

            var transformed = createjs.mat3Mult(this.getMatrix(), transform);
            this.createTexture(gl);
            this.drawQuad(transformed, gl);
        },
        createTexture: function(gl) {
            var canvas = gl.canvas2d.element,
                context = gl.canvas2d.context;
            context.font = this.font;
            //single line text only for now
            var textSize = {
                width: context.measureText(this.text).width,
                height: parseInt(/\d+/.exec(this.font)[0], 10)
            };
            
            this.width = canvas.width = textSize.width;
            this.height = canvas.height = textSize.height;

            context.font = this.font;
            context.textBaseline = "middle";
            context.fillStyle = typeof this.background === "number" ? "#" + this.background.toString(16) : this.background;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = typeof this.color === "number" ? "#" + this.color.toString(16) : this.color;
            context.fillText(this.text, 0, textSize.height >> 1);

            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
            //via these params, we don't have to use power of two textures.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        },
        drawQuad: function(transform, gl) {
            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

            //we will change these in response to different alignments
            var a = 0,
                b = 0,
                c = this.width,
                d = this.height;

            if (this.textAlign === "right") {
                a = -this.width;
                c = 0;
            } else if (this.textAlign === "center") {
                a = -this.width >> 1;
                c = this.width >> 1;
            }

            //data is vertex, then texture coordinates
            var data = [
                a, b, 0, 1,
                a, d, 0, 0,
                c, b, 1, 1,
                c, b, 1, 1,
                c, d, 1, 0,
                a, d, 0, 0
            ];

            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

            var a_position = gl.getAttribLocation(gl.current.program, "a_position");
            gl.enableVertexAttribArray(a_position);
            gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);

            var a_texcoords = gl.getAttribLocation(gl.current.program, "a_texcoords");
            if (a_texcoords !== -1) {
                gl.enableVertexAttribArray(a_texcoords);
                gl.vertexAttribPointer(a_texcoords, 2, gl.FLOAT, false, 16, 8);
            }

            gl.uniformMatrix3fv(gl.current.uniforms.transform, false, new Float32Array(transform));
            gl.uniform1i(gl.current.uniforms.sampler, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    };

})();