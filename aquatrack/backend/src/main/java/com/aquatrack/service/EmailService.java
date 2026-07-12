package com.aquatrack.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Handles all transactional email: overuse alerts, anomaly (leak) reports,
 * and billing-cycle completion notices. Failures are logged rather than thrown,
 * so a mail outage never blocks the billing/alert pipeline.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    public void sendOveruseAlert(String toEmail, String flatNumber, String consumptionKl, String thresholdKl) {
        String subject = "AquaTrack Alert: High water usage detected - Flat " + flatNumber;
        String body = "Hello,\n\n" +
                "Your household (Flat " + flatNumber + ") recorded a water usage of " + consumptionKl + " kL, " +
                "which is above your normal threshold of " + thresholdKl + " kL.\n\n" +
                "Water-saving tips:\n" +
                "- Check taps and toilets for silent leaks\n" +
                "- Avoid letting the tap run while washing dishes\n" +
                "- Consider a shorter shower routine today\n\n" +
                "- AquaTrack";
        send(toEmail, subject, body);
    }

    public void sendAnomalyLeakAlert(String toEmail, String flatNumber, String consumptionKl, String averageKl) {
        String subject = "AquaTrack Alert: Possible leak detected - Flat " + flatNumber;
        String body = "Hello,\n\n" +
                "We detected a statistically unusual spike in water usage for Flat " + flatNumber + ": " +
                consumptionKl + " kL versus a household average of " + averageKl + " kL. " +
                "This pattern can indicate a leak.\n\n" +
                "Please inspect your plumbing and fixtures at your earliest convenience. " +
                "If you cannot find the source, contact your apartment administrator.\n\n" +
                "- AquaTrack";
        send(toEmail, subject, body);
    }

    public void sendBillingCycleComplete(String toEmail, String flatNumber, String totalAmount, String cycleLabel) {
        String subject = "AquaTrack: Your invoice for " + cycleLabel + " is ready";
        String body = "Hello,\n\n" +
                "Billing cycle " + cycleLabel + " has been finalized for Flat " + flatNumber + ".\n" +
                "Total amount due: " + totalAmount + "\n\n" +
                "Log in to AquaTrack to view and download your itemized PDF invoice.\n\n" +
                "- AquaTrack";
        send(toEmail, subject, body);
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
