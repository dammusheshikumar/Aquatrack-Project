import axiosClient from './axiosClient';

export const getAdminOverview = () => axiosClient.get('/admin/overview').then((r) => r.data);
export const getResidentDashboard = () => axiosClient.get('/resident/dashboard').then((r) => r.data);

export const getHouseholds = (apartmentId) => axiosClient.get(`/households/apartment/${apartmentId}`).then((r) => r.data);
export const createHousehold = (payload) => axiosClient.post('/households', payload).then((r) => r.data);
export const updateMeterStatus = (id, hasWorkingMeter) =>
  axiosClient.patch(`/households/${id}/meter-status`, { hasWorkingMeter }).then((r) => r.data);

export const getActiveAlerts = () => axiosClient.get('/alerts/active').then((r) => r.data);
export const getHouseholdAlerts = (householdId) => axiosClient.get(`/alerts/household/${householdId}`).then((r) => r.data);
