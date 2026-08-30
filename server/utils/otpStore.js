// --------------------
// OTP Temporary Store
// --------------------

const otpStore = new Map();

// Save OTP data
const saveOtp = (email, data) => {
    otpStore.set(email.toLowerCase(), {
        ...data,
        createdAt: Date.now(),
    });
};

// Get OTP data
const getOtp = (email) => {
    return otpStore.get(email.toLowerCase());
};

// Delete OTP data
const deleteOtp = (email) => {
    otpStore.delete(email.toLowerCase());
};

module.exports = {
    saveOtp,
    getOtp,
    deleteOtp,
};