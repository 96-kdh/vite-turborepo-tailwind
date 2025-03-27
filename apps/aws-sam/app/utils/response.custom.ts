const response = (statusCode: number, msg: string) => ({
    statusCode: statusCode,
    headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
    },
    body: JSON.stringify({ message: msg }),
});

const responseObject = (statusCode: number, obj: string) => ({
    statusCode: statusCode,
    headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
    },
    body: obj,
});

export const CustomResponse = {
    SuccessOK: (msg = 'OK') => response(200, msg),
    SuccessBody: (obj: string) => responseObject(200, obj),
    Created: (msg = 'Created') => response(201, msg),
    Accepted: (msg = 'Accepted') => response(202, msg),
    NoContents: (msg = 'No Contents') => response(204, msg),

    BadRequest: (msg: string) => response(400, msg),
    Unauthorized: (msg: string) => response(401, msg),
    Forbidden: (msg: string) => response(403, msg),
    NotFound: (msg: string) => response(404, msg),

    InternalError: (msg = 'Internal Server Error') => response(500, msg),
};
