const { ErrorResponse } = require("../utils/ErrorResponse");
const { sendEmail } = require("../utils/email");
const { asyncHandler } = require("../middlewares/async");
const User = require("../models/User");
const crypto = require("crypto");

// DESCRIPTION: register new user
// ROUTE: POST /api/vi/auth/register
// ACCESS: public
exports.register = asyncHandler(async (req, res, next) => {
    const userData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
    };
    const user = await User.create(userData);
    this.sendTokenResponse(res, 200, user);
});

// DESCRIPTION: Login User
// ROUTE: POST /api/v1/auth/login
// ACCESS: Public

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    // validate email and password
    if (!email || !password) {
        return next(
            new ErrorResponse("please provide an email and password", 400)
        );
    }

    // check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        return next(new ErrorResponse("Invalid credentials", 401));
    }
    console.log(user);
    // check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse("Invalid credentials", 401));
    }
    this.sendTokenResponse(res, 200, user);
});

// DESCRIPTION: Forgot password
// ROUTE: POST /api/v1/user/password
// ACCESS: Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new ErrorResponse(`user does not exist`, 404));
    }
    // get reset token
    const token = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // create reset url
    const resetUrl = `${req.protocol}://${req.get(
        "host"
    )}/api/v1/auth/resetpassword/${token}`;
    const message = `You are receiving this email because you (or someone else) requested the reset of a password. please make a PUT request to:\n\n ${resetUrl}`;

    try {
        await sendEmail({
            email: user.email,
            subject: "Password Reset token",
            message,
        });
        res.status(200).json({ success: true, data: "Email sent" });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new ErrorResponse(`Email could not be sent`, 500));
    }
});

// DESCRIPTION: logout
// ROUTE: post /api/v1/auth/logout
// ACCESS: private
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie("token", "", { maxAge: 1, htpOnly: true });
    res.status(200).json({ success: true, data: {} });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
    // get hashed token
    const resetPasswordToken = crypto
        .createHash("SHA256")
        .update(req.params.resetToken)
        .digest("hex");
    // query the db for user using resetToken
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });
    console.log(user);
    if (!user) {
        return next(new ErrorResponse("Invalid token", 400));
    }
    // save the new password to the DB
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    this.sendTokenResponse(res, 200, user);
});

// get token from model, create cookie and send response with the token stored in a cookie on the request header
exports.sendTokenResponse = (res, statusCode, user) => {
    // create token
    const token = user.generateAccessToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };
    // in production environment set the secure option on the cookie to true
    if (process.env.NODE_ENV === "production") {
        options.secure = true;
    }
    res.status(statusCode)
        .cookie("token", token, options)
        .json({ success: true, token });
};
