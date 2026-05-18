import axios from "axios";
import { BASE_URL } from "./appPaths";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // prevent redirect loop
            const currentPath = window.location.pathname;

            if (currentPath !== "/" && currentPath !== "/login") {
                localStorage.removeItem("token");
                window.location.href = "/";
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
