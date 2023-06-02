const { addPerfumeHandler, getAllPerfumeHandler } = require("./handler");

const routes = [
    {
        method: 'POST',
        path: '/perfumes',
        handler: addPerfumeHandler,
    },
    {
        method: 'GET',
        path: '/perfumes',
        handler: getAllPerfumeHandler,
    }
];

module.exports = routes;