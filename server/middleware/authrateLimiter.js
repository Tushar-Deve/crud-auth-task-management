const rateLimit = require("express-rate-limit");

const loginLimiter= rateLimit({
    windowMs:15 * 60 * 1000,
    max:5,
    message:{
        success:false,
        message:"Too many login attempts,Try again after 15 minutes "
    }
}); 

const forgotLimiter= rateLimit({
    windowMs:15 * 60 * 1000,
    max:3,
    message:{
        success:false,
        message:"Too many requests,Try again Later"
    }
});

module.exports = {
    loginLimiter,
    forgotLimiter
};