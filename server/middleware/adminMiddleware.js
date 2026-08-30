// middleware/adminMiddleware.js

const adminMiddleware = (req, res, next) => {
    try {

        // authMiddleware ke baad req.user available hoga
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Sirf admin ko access
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin only."
            });
        }

        // Admin hai to next controller par jao
        next();

    } catch (error) {

        console.error("ADMIN MIDDLEWARE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

module.exports = adminMiddleware;