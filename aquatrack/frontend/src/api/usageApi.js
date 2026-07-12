import axiosClient from './axiosClient';

export const logManualReading = (payload) => axiosClient.post('/usage/manual', payload).then((r) => r.data);
export const bulkUploadCsv = (householdFile) => {
  const form = new FormData();
  form.append('file', householdFile);
  return axiosClient.post('/usage/bulk-upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
export const getUsageHistory = (householdId) => axiosClient.get(`/usage/household/${householdId}`).then((r) => r.data);
export const getRecentUsage = (householdId) => axiosClient.get(`/usage/household/${householdId}/recent`).then((r) => r.data);
