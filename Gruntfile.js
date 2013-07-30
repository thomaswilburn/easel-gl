/*jshint node:true*/

module.exports = function(grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.initConfig({
        concat: {
            easel: {
                src: ["createjs.js", "Stage.js", "Graphics.js", "Shape.js", "Text.js", "Events.js", "DisplayTree.js"],
                dest: "../EaselGL.js",
                options: {
                    process: function(src, path) {
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