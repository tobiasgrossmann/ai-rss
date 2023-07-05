module.exports = async function (app) { 
    app.locals.configuration = {};
    app.locals.configuration.port = process.env.PORT || 3000;
    app.locals.configuration.model = process.env.MODEL || "13B";
    app.locals.configuration.model_type = process.env.MODEL_TYPE || "llama"; 
};