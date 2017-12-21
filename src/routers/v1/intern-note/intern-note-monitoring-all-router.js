var Router = require('restify-router').Router;
var db = require("../../../db");
var InternNoteManager = require("dl-module").managers.garmentPurchasing.InternNoteManager;
var resultFormatter = require("../../../result-formatter");

var passport = require('../../../passports/jwt-passport');
const apiVersion = '1.0.0';

function getRouter() {

    var getManager = (user) => {
        return db.get()
            .then((db) => {
                return Promise.resolve(new InternNoteManager(db, user));
            });
    };

    var router = new Router();
    router.get("/", passport, function (request, response, next) {
        var user = request.user;
        var query = request.query;
        // query.user=user.username;
        var offset = request.headers["x-timezone-offset"] ? Number(request.headers["x-timezone-offset"]) : 0;
        var internNoteManager = {};
        query.offset=offset;
        getManager(user)
            .then((manager) => {
                internNoteManager = manager;
                return internNoteManager.getDataMonitoringAll(query);
            })
            .then(docs => {
                var result = resultFormatter.ok(apiVersion, 200, docs);
                return Promise.resolve(result);
            })
            .then((result) => {
                if ((request.headers.accept || '').toString().indexOf("application/xls") < 0) {
                    response.send(result.statusCode, result);
                }
                else{
                    internNoteManager.getXlsDataMonitoringAll(result, query)
                        .then(xls => {
                            response.xls(xls.name, xls.data, xls.options)
                        });
                }
            })
            .catch((e) => {
                var statusCode = 500;
                if (e.name === "ValidationError")
                    statusCode = 400;
                var error = resultFormatter.fail(apiVersion, statusCode, e);
                response.send(statusCode, error);
            });
    });
    return router;
}

module.exports = getRouter;