const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const errorHandler = require("./middlewares/error");
const connectDB = require("./config/db");

// configure evironment variables
require("dotenv").config({ path: "./config/config.env" });

// load routers

// create instance of express
const app = express();

// request body parser
app.use(express.json());

// request cookie parser
app.use(cookieParser());

// sanitize data
app.use(mongoSanitize());

// set security headers
app.use(helmet());

// prevent xss attack
app.use(xss());

// rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, //Limit each IP to 100 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// prevent http parameter pollution attack
app.use(hpp());

// enable CORS
app.use(cors());

// set static folder
app.use(express.static(path.join(__dirname, "public")));

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// load routers as middlewares

// error handler middleware
app.use(errorHandler);

// establish database connection
connectDB(process.env.MONGODB_URI);

// listen on port
const server = app.listen(
    process.env.PORT,
    console.log(
        `sever running in ${process.env.NODE_ENV} mode on http://localhost:${process.env.PORT} `
    )
);

// take care of unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    // close server and exit process
    server.close(() => {
        promise.exit(1);
    });
});
