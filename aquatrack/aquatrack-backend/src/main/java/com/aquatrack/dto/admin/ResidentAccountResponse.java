package com.aquatrack.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;

/** A resident login account, shown alongside its household in the admin console. */
@Data
@AllArgsConstructor
public class ResidentAccountResponse {
    private Long userId;
    private String fullName;
    private String username;
    private String email;
    private String authProvider;
    private String approvalStatus;
    private boolean enabled;
}
