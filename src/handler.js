const { nanoid } = require('nanoid');
const perfumes = require('./perfumes');

const addPerfumeHandler = (request, h) => {
    const { name, price, volume, gender, rating, top_notes, heart_notes, base_notes, perfume_type } = request.payload;

    const id = nanoid(16);

    const newPerfume = {
        id, name, price, volume, gender, rating, top_notes, heart_notes, base_notes, perfume_type
    };

    if (!name) {
        const response = h.response({
            status: 'fail',
            message: 'Mohon isi nama parfum',
        });
        response.code(400);
        return response;
    }

    perfumes.push(newPerfume);

    const isSuccess = perfumes.filter((perfume) => perfume.id === id).length > 0;

    if (isSuccess) {
        const response = h.response({
            status: 'success',
            message: 'parfum sudah ditambahkan',
            data: {
                perfumeID: id,
            },
        });
        response.code(201);
        return response;
    }

    const response = h.response({
        status: 'fail',
        message: 'gagal menambahkan parfum',
    });
    response.code(500);
    return response;
};

const getAllPerfumeHandler = (request, h) => {
    const { name, price, volume, gender, rating, top_notes, heart_notes, base_notes, perfume_type } = request.query;


    if (name !== undefined) {
        const perfume = perfumes.filter(
            (query) => query.name.toLowerCase().includes(name.toLowerCase()),
        );

        const response = h.response({
            status: 'success',
            data: {
                perfumes: perfume.map((p) => ({
                    id: p.id,
                    name: p.name,
                })),
            },
        });
        response.code(200);
        return response;
    }

    const response = h.response({
        status: 'success',
        data: {
            perfumes: perfumes.map((perfumes) => ({
                id: perfumes.id,
                name: perfumes.name,
                price: perfumes.price,
                volume: perfumes.volume,
                gender: perfumes.gender,
                rating: perfumes.rating,
            })),
        },
    });
    response.code(200);
    return response;
};


module.exports = {
    addPerfumeHandler,
    getAllPerfumeHandler,
};