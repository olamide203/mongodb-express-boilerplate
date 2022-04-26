const jwt = require("jsonwebtoken");
const { asyncHandler } = require("./async");
const { ErrorResponse } = require("../utils/ErrorResponse");
const User = require("../models/User");

// protect routes
exports.protect = asyncHandler(async (req, res, next) => {
    let token;
    console.log(typeof req.headers.authorization);
    // Extract token from request header or cookies
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }
    // } else if (req.cookies.token) {
    //     token = req.cookies.token;
    // }

    // make sure token exists
    if (!token) {
        return next(
            new ErrorResponse("Not authorized to access this route", 401)
        );
    }

    // verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRETE);
        console.log(decoded);
        req.user = await User.findById(decoded.id);
    } catch (error) {
        return next(
            new ErrorResponse("Not authorized to access this route", 401)
        );
    }
    next();
});

// grant only users with specific roles access to some routes
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (roles.indexOf(req.user.role) === -1) {
            return next(
                new ErrorResponse(
                    `Usser with role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};
