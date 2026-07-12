package com.aquatrack.service;

import com.aquatrack.entity.Alert;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.User;
import com.aquatrack.repository.AlertRepository;
import com.aquatrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public Alert raiseOveruseAlert(Household household, BigDecimal consumption, BigDecimal threshold) {
        Alert alert = alertRepository.save(Alert.builder()
                .household(household)
                .alertType(Alert.AlertType.OVERUSE)
                .severity(Alert.Severity.WARNING)
                .message("Usage " + consumption + " kL exceeded threshold of " + threshold + " kL")
                .build());

        findResidentEmail(household).ifPresent(email ->
                emailService.sendOveruseAlert(email, household.getFlatNumber(),
                        consumption.toString(), threshold.toString()));

        return alert;
    }

    public Alert raiseAnomalyAlert(Household household, BigDecimal consumption, BigDecimal average) {
        Alert alert = alertRepository.save(Alert.builder()
                .household(household)
                .alertType(Alert.AlertType.ANOMALY_LEAK)
                .severity(Alert.Severity.CRITICAL)
                .message("Statistical anomaly: " + consumption + " kL vs household average " + average + " kL - possible leak")
                .build());

        findResidentEmail(household).ifPresent(email ->
                emailService.sendAnomalyLeakAlert(email, household.getFlatNumber(),
                        consumption.toString(), average.toString()));

        return alert;
    }

    public void raiseBillingCompleteAlert(Household household, String totalAmount, String cycleLabel) {
        alertRepository.save(Alert.builder()
                .household(household)
                .alertType(Alert.AlertType.BILLING_COMPLETE)
                .severity(Alert.Severity.INFO)
                .message("Invoice ready for " + cycleLabel + ": " + totalAmount)
                .build());

        findResidentEmail(household).ifPresent(email ->
                emailService.sendBillingCycleComplete(email, household.getFlatNumber(), totalAmount, cycleLabel));
    }

    public List<Alert> getActiveAlerts() {
        return alertRepository.findByIsResolvedFalseOrderByCreatedAtDesc();
    }

    public List<Alert> getHouseholdAlerts(Long householdId) {
        return alertRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId);
    }

    public long countActiveAlerts() {
        return alertRepository.countByIsResolvedFalse();
    }

    private Optional<String> findResidentEmail(Household household) {
        return userRepository.findByHouseholdId(household.getId()).map(User::getEmail);
    }
}
