import { createSlice } from "@reduxjs/toolkit";



interface AuthState {
    user: any;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
};
const authSlice = createSlice({
    name: "auth",

    initialState,

    reducers: {

        loginSuccess: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.loading = false;
        },


        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.loading = false;
        },

        setLoading: (state, action) => {
            state.loading = action.payload;
        }

    }

});

export const {
    loginSuccess,
    logout,
    setLoading
} = authSlice.actions;

export default authSlice.reducer;