const objectify = (fields) => {
    const document = fields
        .split(",")
        .reduce(
            (acc, field) => (
                field.startsWith("-")
                    ? (acc[field.slice(1)] = -1)
                    : (acc[field] = 1),
                acc
            ),
            {}
        );
    return document;
};

const AdvancedQuery = (model, populate) => async (req, res, next) => {
    const { select, sort, page, limit, ...fields } = req.query;
    // specify selection filter using query operators
    const query = JSON.parse(
        JSON.stringify(fields).replace(
            /\b(lt|lte|gt|gte|in)\b/g,
            (match) => `$${match}`
        )
    );
    // specify fields to return in objects that mactc query filter
    const projection = select ? objectify(select) : {};
    // define the sort order of the returned documents
    const sortOrder = sort ? objectify(sort) : { createdAt: -1 };

    // specify the number of documents to return per page
    const count = parseInt(limit) || 100;
    const pageNumber = parseInt(page) || 1;

    // specify the start index for pagination
    const startIndex = (pageNumber - 1) * count;
    const stopIndex = pageNumber * count;

    const pagination = {};
    const total = await model.countDocuments();
    const queryResult = await model
        .find(query, projection)
        .sort(sortOrder)
        .skip(startIndex)
        .limit(count)
        .populate(populate);
    // pagination
    if (startIndex) {
        pagination.prev = {
            page: pageNumber - 1,
            limit: count,
        };
    }
    if (stopIndex < total) {
        pagination.next = {
            page: pageNumber + 1,
            limit: count,
        };
    }
    res.advancedResult = {
        success: true,
        count: queryResult.length,
        pagination,
        data: queryResult,
    };

    next();
};

module.exports = { AdvancedQuery };
