package com.aquatrack.entity;

/**
 * Gates RESIDENT login until an apartment admin reviews the registration.
 * ADMIN accounts are always APPROVED at creation (self-service admin signup
 * is unaffected by this workflow).
 */
public enum ApprovalStatus { PENDING, APPROVED, REJECTED }
