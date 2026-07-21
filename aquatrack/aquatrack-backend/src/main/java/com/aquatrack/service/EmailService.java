package com.aquatrack.service;

import com.aquatrack.entity.Alert;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.User;
import com.aquatrack.entity.Invoice;
import com.aquatrack.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;
    private final InvoicePdfService invoicePdfService; // Injected your exact PDF service

    public EmailService(JavaMailSender mailSender, UserRepository userRepository, InvoicePdfService invoicePdfService) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
        this.invoicePdfService = invoicePdfService;
    }

    public void sendAlertEmail(Alert alert) {
        Household household = alert.getHousehold();

        List<User> residents = userRepository.findAll().stream()
                .filter(u -> u.getHousehold() != null &&
                        u.getHousehold().getId().equals(household.getId()))
                .toList();

        for (User resident : residents) {
            String subject = switch (alert.getAlertType()) {
                case OVERUSE -> "AquaTrack Alert: Unusual Water Overuse Detected";
                case ANOMALY_LEAK -> "AquaTrack Alert: Possible Water Leak Detected";
                case BILLING_CYCLE_COMPLETE -> "AquaTrack: Your Water Bill is Ready";
            };

            String body =
                    "Hi " + resident.getFullName() + ",\n\n" +
                    alert.getMessage() + "\n\n" +
                    "Flat Number: " + household.getFlatNumber() + "\n\n" +
                    "Regards,\n" +
                    "AquaTrack Team";

            send(resident.getEmail(), subject, body);
        }
    }

    public void sendLoginNotification(User user) {
        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd MMMM yyyy hh:mm a");

        String loginTime = LocalDateTime.now().format(formatter);
        String subject = "Successful Login to AquaTrack";

        String body =
                "Hi " + user.getFullName() + ",\n\n" +
                "Your AquaTrack account has been successfully logged in.\n\n" +
                "Login Details\n" +
                "------------------------------\n" +
                "Username : " + user.getUsername() + "\n" +
                "Email    : " + user.getEmail() + "\n" +
                "Time     : " + loginTime + "\n\n" +
                "If this login was performed by you, no action is required.\n\n" +
                "If you do not recognize this activity, please change your password immediately and contact your apartment administrator.\n\n" +
                "Thank you,\n" +
                "AquaTrack Team";

        send(user.getEmail(), subject, body);
    }

    public void sendBillingCycleCompleteEmail(Invoice invoice) {
        Household household = invoice.getHousehold();
        List<User> residents = userRepository.findAll().stream()
                .filter(u -> u.getHousehold() != null && u.getHousehold().getId().equals(household.getId()))
                .toList();

        File tempPdfFile = null;
        try {
            // 1. Generate the PDF bytes dynamically using your exact backend utility service
            byte[] pdfBytes = invoicePdfService.generateInvoicePdf(invoice); 

            // 2. Create a unique temporary file marker context on the system disk
            String fileName = "Invoice_Flat_" + household.getFlatNumber() + "_" + invoice.getId() + ".pdf";
            tempPdfFile = File.createTempFile("aquatrack_", "_" + fileName);
            
            try (FileOutputStream fos = new FileOutputStream(tempPdfFile)) {
                fos.write(pdfBytes);
            }

            // 3. Dispatch the email with the attached document out to each household resident
            for (User resident : residents) {
                String subject = "AquaTrack: Your water bill for flat " + household.getFlatNumber() + " is ready";
                String body = "Hi " + resident.getFullName() + ",\n\n" +
                        "Your billing cycle has been finalized.\n\n" +
                        "Consumption: " + invoice.getConsumptionKl() + " kL\n" +
                        "Base charge: " + invoice.getBaseCharge() + "\n" +
                        "Shared area allocation: " + invoice.getSharedAllocation() + "\n" +
                        "Total due: " + invoice.getTotal() + "\n\n" +
                        "Your itemized statement has been attached to this email as a PDF.\n\n" +
                        "Regards,\nAquaTrack Team";

                sendWithAttachment(resident.getEmail(), subject, body, tempPdfFile, fileName);
            }

        } catch (Exception e) {
            System.err.println("Failed to compile or attach bill PDF for invoice ID " + invoice.getId() + ": " + e.getMessage());
        } finally {
            // 4. Cleanup: Remove the temporary file resource container immediately after transmission pipelines complete
            if (tempPdfFile != null && tempPdfFile.exists()) {
                tempPdfFile.delete();
            }
        }
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send text email to " + to + ": " + e.getMessage());
        }
    }

    private void sendWithAttachment(String to, String subject, String body, File attachmentFile, String displayFileName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true); // true = multipart message handling
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body);

            if (attachmentFile != null && attachmentFile.exists()) {
                FileSystemResource res = new FileSystemResource(attachmentFile);
                helper.addAttachment(displayFileName, res);
            }

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email with attachment to " + to + ": " + e.getMessage());
        }
    }
}