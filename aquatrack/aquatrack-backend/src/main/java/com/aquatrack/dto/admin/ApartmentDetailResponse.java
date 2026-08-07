package com.aquatrack.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApartmentDetailResponse {
    private Long id;
    private String name;
    private String address;
    private int householdCount;
    private List<AdminSummary> admins;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminSummary {
        private Long id;
        private String fullName;
        private String username;
        private String email;
        private String approvalStatus;
    }
}
