// --------------------
// Login Service
// --------------------

import api from "./axios";

interface LoginData {
    email: string;
    password: string;
}

export const loginUser = async (loginData: LoginData) => {


    const response = await api.post("/authRoutes/login", loginData);


    return response.data;
};

// --------------------
// Register User Service
// --------------------

export const registerUser = async (
    name: string,
    email: string,
    password: string
) => {
    
    const response = await api.post(
        "/authRoutes/register",
        {
            name,
            email,
            password,
        }
    );

    return response.data;
};

// --------------------
// Verify Register OTP Service
// --------------------

export const verifyRegisterOtp = async (
    email: string,
    otp: string
) => {

    const response = await api.post(
        "/authRoutes/verify-register-otp",
        {
            email,
            otp,
        }
    );

    return response.data;
};


// --------------------
// Logout Service
// --------------------

export const logoutUser = async (token: string) => {

    const response = await api.post(
        "/authRoutes/logout",
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
        }
    );

    return response.data;
};


// --------------------
// Get Profile Service
// --------------------

export const getProfile = async (token: string) => {
    const response = await api.get("/authRoutes/profile", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
    });

    return response.data;
};

// --------------------
// Forgot Password Service
// --------------------

export const forgotPassword = async (email: string) => {

    const response = await api.post(
        "/authRoutes/forgot-password",
        { email }
    );

    return response.data;
};

// --------------------
// Reset Password Service
// --------------------

export const resetPassword = async (token: string, newPassword: string) => {

    const response = await api.post(
        `/authRoutes/reset-password/${token}`,
        { newPassword }
    );

    return response.data;

};


// --------------------
// Change Password Service
// --------------------

export const changePassword = async (
    token: string,
    oldPassword: string,
    newPassword: string
) => {
    const response = await api.post(
        "/authRoutes/change-password",
        {
            oldPassword,
            newPassword,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
        }
    );

    return response.data;
};