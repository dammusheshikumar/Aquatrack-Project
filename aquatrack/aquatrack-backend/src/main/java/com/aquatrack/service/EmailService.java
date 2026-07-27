package com.aquatrack.service;

import com.aquatrack.entity.Alert;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.Invoice;
import com.aquatrack.entity.User;
import com.aquatrack.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Sends professional HTML transactional emails with plain-text fallback for AquaTrack.
 * Features AquaTrack branding, responsive layout, styled callout cards, and PDF attachments.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;
    private final InvoicePdfService invoicePdfService;

    // Theme Colors
    private static final String COLOR_NAVY = "#182B49";
    private static final String COLOR_AQUA = "#0096D6";
    private static final String COLOR_BG_LIGHT = "#F8FAFC";
    private static final String COLOR_TEXT_DARK = "#28323C";
    private static final String COLOR_TEXT_MUTED = "#6E7887";
    private static final String COLOR_BORDER = "#E2E8F0";

    public EmailService(JavaMailSender mailSender, UserRepository userRepository, InvoicePdfService invoicePdfService) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
        this.invoicePdfService = invoicePdfService;
    }

    public void sendAlertEmail(Alert alert) {
        Household household = alert.getHousehold();
        for (User resident : residentsOf(household)) {
            String subject = switch (alert.getAlertType()) {
                case OVERUSE -> "⚠️ AquaTrack Alert: Unusual water overuse detected";
                case ANOMALY_LEAK -> "🚨 AquaTrack Alert: Possible leak detected";
                case DAILY_LIMIT_EXCEEDED -> "📊 AquaTrack Alert: Daily water limit exceeded";
                case FINE_IMPOSED -> "⚖️ AquaTrack: A fine has been applied to your account";
                case BILLING_CYCLE_COMPLETE -> "📄 AquaTrack: Your bill is ready";
            };

            String badgeTitle = switch (alert.getAlertType()) {
                case ANOMALY_LEAK -> "LEAK DETECTED";
                case FINE_IMPOSED -> "NOTICE OF FINE";
                case BILLING_CYCLE_COMPLETE -> "BILL READY";
                default -> "WATER USAGE ALERT";
            };

            String bodyHtml = """
                <p style="margin-top: 0;">Hi <strong>%s</strong>,</p>
                <div style="background-color: #FFF5F5; border-left: 4px solid #E53E3E; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <span style="display: inline-block; background-color: #E53E3E; color: white; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 3px; text-transform: uppercase; margin-bottom: 8px;">%s</span>
                    <p style="margin: 0; font-size: 15px; color: #C53030; font-weight: 600;">%s</p>
                </div>
                <table style="width: 100%%; border-collapse: collapse; margin-top: 15px; background-color: #F8FAFC; border-radius: 6px; padding: 12px;">
                    <tr>
                        <td style="padding: 8px 12px; color: %s; font-size: 13px;"><strong>Flat / Unit Number:</strong></td>
                        <td style="padding: 8px 12px; color: %s; font-size: 13px; text-align: right;">%s</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; font-size: 13px; color: %s;">Please check your dashboard or inspect your home fixtures to prevent unnecessary water loss.</p>
                """.formatted(
                    resident.getFullName(),
                    badgeTitle,
                    alert.getMessage(),
                    COLOR_TEXT_MUTED,
                    COLOR_TEXT_DARK,
                    household.getFlatNumber(),
                    COLOR_TEXT_MUTED
            );

            String bodyText = "Hi " + resident.getFullName() + ",\n\n" +
                    alert.getMessage() + "\n\nFlat: " + household.getFlatNumber() +
                    "\n\nRegards,\nAquaTrack Team";

            sendHtmlEmail(resident.getEmail(), subject, buildMasterTemplate("System Alert", bodyHtml), bodyText, null, null);
        }
    }

    public void sendBillingCycleCompleteEmail(Invoice invoice) {
        Household household = invoice.getHousehold();
        byte[] pdfBytes;
        try {
            pdfBytes = invoicePdfService.generateInvoicePdf(invoice);
        } catch (Exception e) {
            System.err.println("Failed to generate PDF for invoice " + invoice.getId() + ": " + e.getMessage());
            pdfBytes = null;
        }
        String fileName = "invoice-" + household.getFlatNumber() + "-" + invoice.getId() + ".pdf";

        for (User resident : residentsOf(household)) {
            String subject = "💧 AquaTrack: Your water bill for flat " + household.getFlatNumber() + " is ready";

            String bodyHtml = """
                <p style="margin-top: 0;">Hi <strong>%s</strong>,</p>
                <p>Your billing cycle has been finalized. Below is the breakdown of your statement for Flat <strong>%s</strong>:</p>
                
                <table style="width: 100%%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <tr style="border-bottom: 1px solid %s;">
                        <td style="padding: 10px 0; color: %s;">Consumption Volume:</td>
                        <td style="padding: 10px 0; font-weight: bold; text-align: right; color: %s;">%s kL</td>
                    </tr>
                    <tr style="border-bottom: 1px solid %s;">
                        <td style="padding: 10px 0; color: %s;">Base Usage Charge:</td>
                        <td style="padding: 10px 0; text-align: right; color: %s;">₹%s</td>
                    </tr>
                    <tr style="border-bottom: 1px solid %s;">
                        <td style="padding: 10px 0; color: %s;">Shared Utility Allocation:</td>
                        <td style="padding: 10px 0; text-align: right; color: %s;">₹%s</td>
                    </tr>
                    <tr style="background-color: %s;">
                        <td style="padding: 12px 10px; font-weight: bold; color: %s; font-size: 16px;">Total Amount Due:</td>
                        <td style="padding: 12px 10px; font-weight: bold; text-align: right; color: %s; font-size: 18px;">₹%s</td>
                    </tr>
                </table>

                <div style="background-color: #E6F2FA; border-left: 4px solid %s; padding: 12px 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 13px; color: %s;">
                        📎 <strong>Attached Statement:</strong> Your full invoice is attached to this email as a PDF. You can also view and pay directly from your AquaTrack Resident Portal.
                    </p>
                </div>
                """.formatted(
                    resident.getFullName(),
                    household.getFlatNumber(),
                    COLOR_BORDER, COLOR_TEXT_MUTED, COLOR_TEXT_DARK, invoice.getConsumptionKl() != null ? invoice.getConsumptionKl() : "0",
                    COLOR_BORDER, COLOR_TEXT_MUTED, COLOR_TEXT_DARK, invoice.getBaseCharge() != null ? invoice.getBaseCharge() : "0.00",
                    COLOR_BORDER, COLOR_TEXT_MUTED, COLOR_TEXT_DARK, invoice.getSharedAllocation() != null ? invoice.getSharedAllocation() : "0.00",
                    COLOR_NAVY, COLOR_AQUA, COLOR_AQUA, invoice.getTotal() != null ? invoice.getTotal() : "0.00",
                    COLOR_AQUA, COLOR_NAVY
            );

            String bodyText = "Hi " + resident.getFullName() + ",\n\n" +
                    "Your billing cycle has been finalized.\n" +
                    "Consumption: " + invoice.getConsumptionKl() + " kL\n" +
                    "Base charge: " + invoice.getBaseCharge() + "\n" +
                    "Shared area allocation: " + invoice.getSharedAllocation() + "\n" +
                    "Total due: " + invoice.getTotal() + "\n\n" +
                    "Your invoice is attached as a PDF.\n\n" +
                    "Regards,\nAquaTrack Team";

            sendHtmlEmail(resident.getEmail(), subject, buildMasterTemplate("Billing Statement", bodyHtml), bodyText, fileName, pdfBytes);
        }
    }

    public void sendRegistrationPendingEmail(User resident) {
        String subject = "AquaTrack: Registration Received";
        String bodyHtml = """
            <p style="margin-top: 0;">Hi <strong>%s</strong>,</p>
            <p>Thank you for signing up for AquaTrack! We've received your resident registration request.</p>
            <div style="background-color: #FEFCBF; border-left: 4px solid #D69E2E; padding: 12px 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #744210;">
                    ⏳ <strong>Pending Admin Review:</strong> Your apartment administrator needs to approve your account before you can log in. We will notify you by email as soon as it is active.
                </p>
            </div>
            """.formatted(resident.getFullName());

        String bodyText = "Hi " + resident.getFullName() + ",\n\n" +
                "We've received your resident registration. Your admin needs to approve it before you can log in.\n\n" +
                "Regards,\nAquaTrack Team";

        sendHtmlEmail(resident.getEmail(), subject, buildMasterTemplate("Account Registration", bodyHtml), bodyText, null, null);
    }

    public void sendRegistrationApprovedEmail(User resident) {
        String subject = "🎉 AquaTrack: Account Approved";
        String bodyHtml = """
            <p style="margin-top: 0;">Hi <strong>%s</strong>,</p>
            <p>Great news! Your apartment administrator has approved your AquaTrack registration.</p>
            <div style="background-color: #C6F6D5; border-left: 4px solid #38A169; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #22543D; font-weight: bold;">
                    ✅ Account Activated
                </p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #276749;">
                    You can now log in to monitor live water usage, view billing breakdown, and get leak detection alerts.
                </p>
            </div>
            """.formatted(resident.getFullName());

        String bodyText = "Hi " + resident.getFullName() + ",\n\n" +
                "Good news — your admin has approved your account. You can now log in!\n\n" +
                "Regards,\nAquaTrack Team";

        sendHtmlEmail(resident.getEmail(), subject, buildMasterTemplate("Account Approved", bodyHtml), bodyText, null, null);
    }

    public void sendRegistrationRejectedEmail(User resident) {
        String subject = "AquaTrack: Registration Status Update";
        String bodyHtml = """
            <p style="margin-top: 0;">Hi <strong>%s</strong>,</p>
            <p>Your administrator was unable to approve your registration for AquaTrack at this time.</p>
            <div style="background-color: #EDF2F7; border-left: 4px solid #A0AEC0; padding: 12px 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #4A5568;">
                    If you believe this was done in error or need assistance, please get in touch with your apartment manager or admin directly.
                </p>
            </div>
            """.formatted(resident.getFullName());

        String bodyText = "Hi " + resident.getFullName() + ",\n\n" +
                "Your admin was unable to approve your registration. Please contact your apartment admin directly.\n\n" +
                "Regards,\nAquaTrack Team";

        sendHtmlEmail(resident.getEmail(), subject, buildMasterTemplate("Registration Update", bodyHtml), bodyText, null, null);
    }

    private List<User> residentsOf(Household household) {
        return userRepository.findByHouseholdId(household.getId());
    }

    // --- HTML Email Dispatch Engine ---
    private void sendHtmlEmail(String to, String subject, String htmlBody, String textFallback, String attachmentName, byte[] attachmentBytes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            
            // Always pass 'true' for multipart when sending alternative text + html or attachments
            boolean hasAttachment = (attachmentBytes != null && attachmentBytes.length > 0);
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);
            
            // Sets plain text fallback and HTML body
            helper.setText(textFallback, htmlBody);

            if (hasAttachment) {
                helper.addAttachment(attachmentName, new org.springframework.core.io.ByteArrayResource(attachmentBytes));
            }

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    // --- AquaTrack Branded Email HTML Master Layout ---
    private String buildMasterTemplate(String category, String contentHtml) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #F4F6F9; margin: 0; padding: 20px; color: %s;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid %s;">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background-color: %s; padding: 25px 30px; text-align: left; border-bottom: 4px solid %s;">
                            <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <span style="font-size: 22px; font-weight: bold; color: #FFFFFF; letter-spacing: 0.5px;">💧 AquaTrack</span><br>
                                        <span style="font-size: 10px; color: %s; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Water Management System</span>
                                    </td>
                                    <td style="text-align: right; vertical-align: middle;">
                                        <span style="background-color: rgba(255,255,255,0.15); color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">%s</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 30px; font-size: 14px; line-height: 1.6; color: %s;">
                            %s
                        </td>
                    </tr>

                    <!-- Eco Tip Banner -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <div style="background-color: #F0F9F2; border: 1px solid #C6F6D5; border-radius: 6px; padding: 12px 15px; font-size: 12px; color: #2F855A;">
                                🌿 <strong>Water Conservation Tip:</strong> Turning off the tap while brushing your teeth can save up to 8 gallons of water a day!
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: %s; padding: 20px 30px; text-align: center; border-top: 1px solid %s; font-size: 12px; color: %s;">
                            <p style="margin: 0 0 5px 0;">This email was generated automatically by <strong>AquaTrack Utility Services</strong>.</p>
                            <p style="margin: 0;">Need help? Contact support or reach out to your apartment administration.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                COLOR_TEXT_DARK,
                COLOR_BORDER,
                COLOR_NAVY,
                COLOR_AQUA,
                COLOR_AQUA,
                category,
                COLOR_TEXT_DARK,
                contentHtml,
                COLOR_BG_LIGHT,
                COLOR_BORDER,
                COLOR_TEXT_MUTED
        );
    }
}