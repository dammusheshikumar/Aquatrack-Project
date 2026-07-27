import axiosClient from './axiosClient';

export const getTariffPlans = (apartmentId) => axiosClient.get(`/tariffs/apartment/${apartmentId}`).then((r) => r.data);
export const createTariffPlan = (payload) => axiosClient.post('/tariffs', payload).then((r) => r.data);

export const openBillingCycle = (payload) => axiosClient.post('/billing/cycles', payload).then((r) => r.data);
export const getBillingCycles = (apartmentId) => axiosClient.get(`/billing/cycles/apartment/${apartmentId}`).then((r) => r.data);
export const recordWaterPurchase = (payload) => axiosClient.post('/billing/purchases', payload).then((r) => r.data);
export const finalizeBillingCycle = (id) => axiosClient.post(`/billing/cycles/${id}/finalize`).then((r) => r.data);
export const archiveBillingCycle = (id) => axiosClient.post(`/billing/cycles/${id}/archive`).then((r) => r.data);

export const getInvoicesForHousehold = (householdId) => axiosClient.get(`/invoices/household/${householdId}`).then((r) => r.data);
export const getInvoicesForCycle = (cycleId) => axiosClient.get(`/invoices/cycle/${cycleId}`).then((r) => r.data);
export const downloadInvoicePdf = (invoiceId) =>
  axiosClient.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' }).then((r) => r.data);
