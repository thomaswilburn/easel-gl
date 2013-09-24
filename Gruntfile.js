/*jshint node:true*/

var child = require("child_process");

module.exports = function(grunt) {
    "use strict";

    require("grunt-contrib-concat/tasks/concat")(grunt);
    require("grunt-contrib-watch/tasks/watch")(grunt);

    grunt.initConfig({
        concat: {
            easel: {
                src: ["createjs.js", "Stage.js", "Graphics.js", "Brushes.js", "Shape.js", "Text.js", "Events.js", "DisplayTree.js"],
                dest: "EaselGL.js",
                options: {
                    process: function(src) {
                        return src.replace(/\/\*.*\*\/[\n\r]*/gm, "");
                    },
                    banner: "/*jshint browser:true onevar:false boss:true*/\n/*global createjs*/\n"
                }
            }
        },
        watch: {
            easel: {
                files: ["*"],
                tasks: ["concat:easel"]
            }
        }
    });

    grunt.registerTask("default", ["concat", "watch"]);

};