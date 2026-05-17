// const db = require("../config/db");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// // -----------

// // Login user 

// // -----------

// exports.loginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // 1️⃣ Validation
//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email and password are required",
//             });
//         }

//         // 2️⃣ Check user exists
//         const [users] = await db.query(
//             "SELECT * FROM users WHERE email = ?",
//             [email]
//         );

//         if (users.length === 0) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid email or password",
//             });
//         }

//         const user = users[0];

//         // 3️⃣ Compare password
//         const isMatch = await bcrypt.compare(password, user.password);

//         if (!isMatch) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid email or password",
//             });
//         }

//  // ✅ Generate token BEFORE sending response

//         const token = jwt.sign(
//             { id: user.id },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//         )

//         // 4️⃣ Login success
//         return res.status(200).json({
//             success: true,
//             message: "Login successful",
//             token: token,
//             user: {
//                 id: user.id,
//                 name: user.name,
//                 email: user.email,
//             },
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

// // -------------

// // Post request

// // -------------

// exports.createUser = async (req, res) => {
//     try {

//         const { name, email, password } = req.body;

//         //Basic validation

//         if (!name || !email || !password) {
//             return res.status(401).json({
//                 success: false,
//                 message: "All fields are required",
//             })
//         }

//         // 2️⃣ Check if email already exists

//         const [existingUser] = await db.query(
//             "SELECT * FROM USERS where email=?",
//             [email]
//         );

//         if (existingUser.length > 0) {
//             return res.status(409).json({
//                 success: false,
//                 message: "Email already registered",
//             });
//         }

//         //Hash function

//         const saltRound = 10;    //industry standard
//         const hashPassword = await bcrypt.hash(password, saltRound);

//         // 3️⃣ Insert User
//         const [result] = await db.query(
//             "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
//             [name, email, hashPassword]
//         );

//         return res.status(201).json({
//             success: true,
//             message: "User registered successfully",
//             userId: result.insertId,
//         });

//     }
//     catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

// // -----------------

// // Get request

// // -----------------

// exports.getAllUsers = async (req, res) => {
//     try {
//         const [users] = await db.query("SELECT id ,name ,email FROM users",
//         )

//         return res.status(200).json({
//             success: true,
//             count: users.length,
//             data: users,
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

// // ------------

// // Get userby id

// // ------------

// exports.getUserbyId = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const [users] = await db.query(
//             "SELECT * FROM users where id=?",
//             [id]
//         );

//         if (users.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found",
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Result found",
//             data: users[0],
//         });
//     }
//     catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         })
//     }
// };

// // ---------------

// // Update User Put 

// // ---------------

// exports.updateUser = async (req, res) => {
//     try {

//         const { id } = req.params;
//         const { name, email, password } = req.body;

//         //Basic validation First 

//         if (!name || name.trim() === "") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Name is required"
//             });
//         }

//         if (!email || email.trim() === "") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email is required"
//             });
//         }


//         if (password !== undefined) {
//             if (password.trim() === "") {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Password cannot be empty"
//                 });
//             }
//         }

//         // User Exist

//         const [existingUser] = await db.query(
//             "select * from users where id=?",
//             [id]
//         );

//         if (existingUser.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found",
//             })
//         };

//         //if password update

//         let resultUpdate;

//         if (password) {

//             const hashPassword = await bcrypt.hash(password, 10);
//             [resultUpdate] = await db.query(
//                 "update users set name=?, email=?, password=? where id=?",
//                 [name, email, hashPassword, id]
//             );
//         }
//         else {
//             [resultUpdate] = await db.query(
//                 "update users set name=?, email=? where id=?",
//                 [name, email, id]
//             );
//         }

//         // ✅ Check affectedRows

//         if (resultUpdate.affectedRows === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         //  Check changedRows Data same था

//         if (resultUpdate.changedRows === 0) {
//             return res.status(200).json({
//                 success: true,
//                 message: "No changes made"
//             });
//         }

//         //Success

//         return res.status(200).json({
//             success: true,
//             message: "User Updated Successfully",
//         })
//     }
//     catch (error) {
//         console.log("ERROR 👉", error);
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

// // -----------

// // DELETE 

// // -----------

// exports.deleteUser = async (req, res) => {
//     try {

//         const { id } = req.params;

//         const [existingUser] = await db.query(
//             "select * from users where id=?",
//             [id]
//         );

//         if (existingUser.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found",
//             })
//         }

//         await db.query(
//             "delete from users where id=?",
//             [id]
//         )

//         return res.status(200).json({
//             success: true,
//             message: "user deleted successfully",
//         })
//     }

//     catch (error) {
//         console.log("ERROR 👉", error);
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// };