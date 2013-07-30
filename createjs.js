/*jshint boss:true onevar:false browser:true*/

(function() {
"use strict";

    var createjs = window.createjs = {
        mat3Mult: function(a, b) {
            var result = [];

            result[0] = a[0]*b[0] + a[1]*b[3] + a[2]*b[6];
            result[1] = a[0]*b[1] + a[1]*b[4] + a[2]*b[7];
            result[2] = a[0]*b[2] + a[1]*b[5] + a[2]*b[8];

            result[3] = a[3]*b[0] + a[4]*b[3] + a[5]*b[6];
            result[4] = a[3]*b[1] + a[4]*b[4] + a[5]*b[7];
            result[5] = a[3]*b[2] + a[4]*b[5] + a[5]*b[8];

            result[6] = a[6]*b[0] + a[7]*b[3] + a[8]*b[6];
            result[7] = a[6]*b[1] + a[7]*b[4] + a[8]*b[7];
            result[8] = a[6]*b[2] + a[7]*b[5] + a[8]*b[8];

            return result;
        }
    };

    var seed = 1;

    createjs.getGUID = function() {
        //we have to use wide values, because the pick buffer will be anti-aliased
        return seed += 8;
    };

})();