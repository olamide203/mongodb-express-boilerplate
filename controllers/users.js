const { ErrorResponse } = require("../utils/ErrorResponse");
const { asyncHandler } = require("../middlewares/async");
const { sendTokenResponse } = require("./auth");
const User = require("../models/User");

// DESCRIPTION: change logged in user password
// ROUTE: POST /api/v1/users/
// ACCESS: private
exports.changePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");
    if (!(await user.matchPassword(req.body.password))) {
        return next(new ErrorResponse(`Incorrect password`, 401));
    }
    req.user.password = req.body.new;
    req.user = await req.user.save();
    sendTokenResponse(res, 200, req.user);
});

// DESCRIPTION: update current logged in user data
// ROUTE: PATCH /api/vi/users/
// ACCESS:
exports.updateUserData = asyncHandler(async (req, res, next) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
    });
    res.status(200).json({ success: true, data: user });
});

// DESCRIPTION: Get current logged in user
// ROUTE: GET /api/v1/users/me
// ACCESS: Private
exports.getMe = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, data: req.user });
});

// DESCRIPTION: Get all user account (admin only)
// ROUTE: GET /api/vi/users/
// ACCESS: private
exports.getUsers = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, data: res.advancedResult });
});
