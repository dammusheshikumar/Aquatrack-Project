import axiosClient from './axiosClient';

export const registerUser = (payload) => axiosClient.post('/auth/register', payload).then((r) => r.data);
export const loginUser = (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data);
