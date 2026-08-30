const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
   try {

      let token;

      // header se token 
      if (
         req.headers.authorization &&
         req.headers.authorization.startsWith("Bearer ")
      ) {
         token = req.headers.authorization.split(" ")[1];
      }

      // cookie se token
      else if(req.cookies && req.cookies.accessToken) {
         token = req.cookies.accessToken;
      }

      // ❌ token missing
      if (!token) {
         return res.status(401).json({
            success: false,
            message: "No token provided"
         });
      }

      // 🔐 verify
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;

      next();

   } catch (error) {

      console.error("AUTH MIDDLEWARE ERROR:", error.name);

      if (error.name === "TokenExpiredError") {
         return res.status(401).json({
            success: false,
            message: "Token expired"
         });
      }

      if (error.name === "JsonWebTokenError") {
         return res.status(401).json({
            success: false,
            message: "Invalid token"
         });
      }

      return res.status(500).json({
         success: false,
         message: "Something went wrong"
      });
   }
};

module.exports = authMiddleware;