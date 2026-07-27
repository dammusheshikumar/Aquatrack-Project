package com.aquatrack.service;

import com.aquatrack.entity.Invoice;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.Apartment;
import com.aquatrack.entity.BillingCycle;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to generate high-quality, professional utility invoice PDFs for AquaTrack.
 * Built with Apache PDFBox 3.x.
 */
@Service
public class InvoicePdfService {

    // --- Color Palette (AquaTrack Blue Utility Theme) ---
    private static final Color PRIMARY_NAVY = new Color(24, 43, 73);      // #182B49
    private static final Color ACCENT_AQUA = new Color(0, 150, 214);      // #0096D6
    private static final Color SOFT_BLUE = new Color(230, 242, 250);      // #E6F2FA
    private static final Color TEXT_DARK = new Color(40, 50, 60);         // #28323C
    private static final Color TEXT_MUTED = new Color(110, 120, 135);    // #6E7887
    private static final Color BORDER_COLOR = new Color(215, 225, 235);   // #D7E1EB
    private static final Color BG_LIGHT = new Color(248, 250, 252);       // #F8FAFC
    private static final Color GREEN_TIP = new Color(34, 139, 34);        // #228B22

    // --- Page Geometry ---
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();   // 595.27 pt
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight(); // 841.89 pt
    private static final float MARGIN = 40.0f;
    private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");

    public byte[] generateInvoicePdf(Invoice invoice) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                // Initialize standard fonts
                PDFont fontBold = PDType1Font.HELVETICA_BOLD;
                PDFont fontRegular = PDType1Font.HELVETICA;
                PDFont fontOblique = PDType1Font.HELVETICA_OBLIQUE;

                float currentY = PAGE_HEIGHT;

                // 1. Header Banner & Branding
                currentY = drawHeaderBanner(cs, currentY, invoice, fontBold, fontRegular);

                // 2. Info Cards (Invoice Details & Customer/Apartment Info)
                currentY = drawInfoCards(cs, currentY, invoice, fontBold, fontRegular);

                // 3. Line Items Table
                currentY = drawTable(cs, currentY, invoice, fontBold, fontRegular);

                // 4. Total Due Box & Payment QR Code Area
                currentY = drawSummaryAndPaymentSection(document, cs, currentY, invoice, fontBold, fontRegular);

                // 5. Water-Saving Tips Box
                currentY = drawWaterTipsPanel(cs, currentY, fontBold, fontRegular, fontOblique);

                // 6. Footer Details
                drawFooter(cs, fontBold, fontRegular);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    // ==========================================
    // 1. HEADER BANNER
    // ==========================================
    private float drawHeaderBanner(PDPageContentStream cs, float startY, Invoice invoice, PDFont fontBold, PDFont fontRegular) throws IOException {
        float headerHeight = 90.0f;
        float bannerY = startY - headerHeight;

        // Draw Navy Blue Top Banner
        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(0, bannerY, PAGE_WIDTH, headerHeight);
        cs.fill();

        // Aqua Accent Line at bottom of banner
        cs.setNonStrokingColor(ACCENT_AQUA);
        cs.addRect(0, bannerY, PAGE_WIDTH, 4);
        cs.fill();

        // Branding Logo Icon
        float logoX = MARGIN;
        float logoY = bannerY + 28;
        
        cs.setNonStrokingColor(ACCENT_AQUA);
        cs.addRect(logoX, logoY, 32, 32);
        cs.fill();
        
        drawText(cs, "A", logoX + 10, logoY + 8, fontBold, 18, Color.WHITE);

        // AquaTrack Title
        drawText(cs, "AquaTrack", logoX + 42, bannerY + 48, fontBold, 22, Color.WHITE);
        drawText(cs, "WATER MANAGEMENT & UTILITY BILLING", logoX + 42, bannerY + 34, fontRegular, 8, ACCENT_AQUA);

        // Right side: INVOICE Label
        String title = "WATER BILL";
        float titleWidth = getTextWidth(title, fontBold, 20);
        drawText(cs, title, PAGE_WIDTH - MARGIN - titleWidth, bannerY + 48, fontBold, 20, Color.WHITE);

        String invNum = "Invoice #" + (invoice.getId() != null ? invoice.getId() : "N/A");
        float invNumWidth = getTextWidth(invNum, fontRegular, 10);
        drawText(cs, invNum, PAGE_WIDTH - MARGIN - invNumWidth, bannerY + 32, fontRegular, 10, SOFT_BLUE);

        return bannerY - 20;
    }

    // ==========================================
    // 2. INFO CARDS
    // ==========================================
    private float drawInfoCards(PDPageContentStream cs, float currentY, Invoice invoice, PDFont fontBold, PDFont fontRegular) throws IOException {
        float cardHeight = 110.0f;
        float cardWidth = (CONTENT_WIDTH - 15) / 2;
        float leftCardX = MARGIN;
        float rightCardX = MARGIN + cardWidth + 15;
        float cardY = currentY - cardHeight;

        // Card 1 Background (Customer & Location)
        drawRoundedBox(cs, leftCardX, cardY, cardWidth, cardHeight, BG_LIGHT, BORDER_COLOR);

        // Card 1 Header Strip
        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(leftCardX, cardY + cardHeight - 22, cardWidth, 22);
        cs.fill();
        drawText(cs, "ACCOUNT & PROPERTY DETAILS", leftCardX + 10, cardY + cardHeight - 15, fontBold, 9, Color.WHITE);

        // Card 1 Content
        Household household = invoice.getHousehold();
        Apartment apartment = (household != null) ? household.getApartment() : null;
        if (apartment == null && invoice.getBillingCycle() != null) {
            apartment = invoice.getBillingCycle().getApartment();
        }

        float textY = cardY + cardHeight - 38;
        String residentName = "Valued Resident";
        String flatNo = (household != null && household.getFlatNumber() != null) ? household.getFlatNumber() : "N/A";
        String aptName = (apartment != null && apartment.getName() != null) ? apartment.getName() : "AquaTrack Residence";

        drawLabelValue(cs, "Resident Name:", residentName, leftCardX + 10, textY, fontBold, fontRegular);
        textY -= 16;
        drawLabelValue(cs, "Flat / Unit No:", flatNo, leftCardX + 10, textY, fontBold, fontRegular);
        textY -= 16;
        drawLabelValue(cs, "Apartment Complex:", aptName, leftCardX + 10, textY, fontBold, fontRegular);
        textY -= 16;
        drawLabelValue(cs, "Account ID:", "ACT-" + (household != null && household.getId() != null ? household.getId() : "000"), leftCardX + 10, textY, fontBold, fontRegular);

        // Card 2 Background (Billing Period & Dates)
        drawRoundedBox(cs, rightCardX, cardY, cardWidth, cardHeight, BG_LIGHT, BORDER_COLOR);

        // Card 2 Header Strip
        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(rightCardX, cardY + cardHeight - 22, cardWidth, 22);
        cs.fill();
        drawText(cs, "BILLING PERIOD & DATES", rightCardX + 10, cardY + cardHeight - 15, fontBold, 9, Color.WHITE);

        // Card 2 Content
        BillingCycle cycle = invoice.getBillingCycle();
        String startDateStr = (cycle != null && cycle.getStartDate() != null) ? cycle.getStartDate().format(DATE_FORMATTER) : "N/A";
        String endDateStr = (cycle != null && cycle.getEndDate() != null) ? cycle.getEndDate().format(DATE_FORMATTER) : "N/A";
        String issueDateStr = (invoice.getCreatedAt() != null) ? invoice.getCreatedAt().toLocalDate().format(DATE_FORMATTER) : LocalDate.now().format(DATE_FORMATTER);
        String dueDateStr = (invoice.getCreatedAt() != null) ? invoice.getCreatedAt().toLocalDate().plusDays(15).format(DATE_FORMATTER) : LocalDate.now().plusDays(15).format(DATE_FORMATTER);

        textY = cardY + cardHeight - 38;
        drawLabelValue(cs, "Billing Period:", startDateStr + " - " + endDateStr, rightCardX + 10, textY, fontBold, fontRegular);
        textY -= 16;
        drawLabelValue(cs, "Invoice Date:", issueDateStr, rightCardX + 10, textY, fontBold, fontRegular);
        textY -= 16;
        drawLabelValue(cs, "Due Date:", dueDateStr, rightCardX + 10, textY, fontBold, fontRegular);
        textY -= 16;
        drawLabelValue(cs, "Status:", "UNPAID", rightCardX + 10, textY, fontBold, fontRegular);

        return cardY - 20;
    }

    // ==========================================
    // 3. BILLING TABLE
    // ==========================================
    private float drawTable(PDPageContentStream cs, float currentY, Invoice invoice, PDFont fontBold, PDFont fontRegular) throws IOException {
        float tableTop = currentY;
        float rowHeight = 26.0f;
        float headerHeight = 28.0f;

        float col0X = MARGIN;
        float col1X = MARGIN + 230;
        float col2X = MARGIN + 350;
        float col3X = MARGIN + CONTENT_WIDTH;

        // Table Header
        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(MARGIN, tableTop - headerHeight, CONTENT_WIDTH, headerHeight);
        cs.fill();

        drawText(cs, "DESCRIPTION", col0X + 10, tableTop - 18, fontBold, 9, Color.WHITE);
        drawText(cs, "CONSUMPTION (kL)", col1X, tableTop - 18, fontBold, 9, Color.WHITE);
        drawText(cs, "RATE / kL", col2X, tableTop - 18, fontBold, 9, Color.WHITE);
        
        String totalHeader = "AMOUNT (Rs.)";
        float thWidth = getTextWidth(totalHeader, fontBold, 9);
        drawText(cs, totalHeader, col3X - 10 - thWidth, tableTop - 18, fontBold, 9, Color.WHITE);

        float y = tableTop - headerHeight;

        // Table Data Row
        BigDecimal waterUsage = invoice.getConsumptionKl() != null ? invoice.getConsumptionKl() : BigDecimal.ZERO;
        BigDecimal rate = (invoice.getBillingCycle() != null && invoice.getBillingCycle().getUnitCost() != null)
                ? invoice.getBillingCycle().getUnitCost()
                : BigDecimal.ZERO;
        BigDecimal totalAmount = invoice.getTotal() != null ? invoice.getTotal() : BigDecimal.ZERO;

        cs.setNonStrokingColor(BG_LIGHT);
        cs.addRect(MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight);
        cs.fill();

        cs.setStrokingColor(BORDER_COLOR);
        cs.setLineWidth(0.8f);
        cs.addRect(MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight);
        cs.stroke();

        drawText(cs, "Water Consumption Charges", col0X + 10, y - 17, fontRegular, 9.5f, TEXT_DARK);
        drawText(cs, waterUsage.setScale(2, RoundingMode.HALF_UP).toString() + " kL", col1X, y - 17, fontRegular, 9.5f, TEXT_DARK);
        drawText(cs, "Rs. " + rate.setScale(4, RoundingMode.HALF_UP).toString(), col2X, y - 17, fontRegular, 9.5f, TEXT_DARK);

        String amtStr = "Rs. " + totalAmount.setScale(2, RoundingMode.HALF_UP).toString();
        float amtWidth = getTextWidth(amtStr, fontBold, 9.5f);
        drawText(cs, amtStr, col3X - 10 - amtWidth, y - 17, fontBold, 9.5f, TEXT_DARK);

        y -= rowHeight;

        // Service Row
        cs.setNonStrokingColor(Color.WHITE);
        cs.addRect(MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight);
        cs.fill();

        cs.setStrokingColor(BORDER_COLOR);
        cs.addRect(MARGIN, y - rowHeight, CONTENT_WIDTH, rowHeight);
        cs.stroke();

        drawText(cs, "Fixed Infrastructure & Service Maintenance", col0X + 10, y - 17, fontRegular, 9.5f, TEXT_DARK);
        drawText(cs, "1 Fixed", col1X, y - 17, fontRegular, 9.5f, TEXT_DARK);
        drawText(cs, "Rs. 0.00", col2X, y - 17, fontRegular, 9.5f, TEXT_DARK);

        String fixedAmtStr = "Rs. 0.00";
        float fixedWidth = getTextWidth(fixedAmtStr, fontRegular, 9.5f);
        drawText(cs, fixedAmtStr, col3X - 10 - fixedWidth, y - 17, fontRegular, 9.5f, TEXT_DARK);

        return y - rowHeight - 20;
    }

    // ==========================================
    // 4. SUMMARY & PAYMENT SECTION
    // ==========================================
    private float drawSummaryAndPaymentSection(PDDocument doc, PDPageContentStream cs, float currentY, Invoice invoice, PDFont fontBold, PDFont fontRegular) throws IOException {
        float boxHeight = 110.0f;
        float boxY = currentY - boxHeight;

        float qrBoxWidth = 220.0f;
        drawRoundedBox(cs, MARGIN, boxY, qrBoxWidth, boxHeight, SOFT_BLUE, BORDER_COLOR);

        float qrSize = 70.0f;
        float qrX = MARGIN + 15;
        float qrY = boxY + 20;
        
        drawSimulatedQRCode(cs, qrX, qrY, qrSize);

        float qrTextX = qrX + qrSize + 15;
        drawText(cs, "SCAN TO PAY", qrTextX, boxY + 80, fontBold, 10, PRIMARY_NAVY);
        drawText(cs, "Use AquaTrack App", qrTextX, boxY + 65, fontRegular, 8.5f, TEXT_DARK);
        drawText(cs, "or Mobile Banking", qrTextX, boxY + 53, fontRegular, 8.5f, TEXT_DARK);
        drawText(cs, "UPI / Card Accepted", qrTextX, boxY + 41, fontRegular, 8.5f, TEXT_MUTED);

        float totalBoxWidth = CONTENT_WIDTH - qrBoxWidth - 15;
        float totalBoxX = MARGIN + qrBoxWidth + 15;

        drawRoundedBox(cs, totalBoxX, boxY, totalBoxWidth, boxHeight, BG_LIGHT, BORDER_COLOR);

        BigDecimal totalAmount = invoice.getTotal() != null ? invoice.getTotal() : BigDecimal.ZERO;
        float lineY = boxY + boxHeight - 25;

        drawText(cs, "Subtotal:", totalBoxX + 15, lineY, fontRegular, 9.5f, TEXT_MUTED);
        String subStr = "Rs. " + totalAmount.setScale(2, RoundingMode.HALF_UP).toString();
        drawText(cs, subStr, totalBoxX + totalBoxWidth - 15 - getTextWidth(subStr, fontRegular, 9.5f), lineY, fontRegular, 9.5f, TEXT_DARK);

        lineY -= 18;
        drawText(cs, "Taxes & Municipal Fees (0%):", totalBoxX + 15, lineY, fontRegular, 9.5f, TEXT_MUTED);
        drawText(cs, "Rs. 0.00", totalBoxX + totalBoxWidth - 15 - getTextWidth("Rs. 0.00", fontRegular, 9.5f), lineY, fontRegular, 9.5f, TEXT_DARK);

        lineY -= 15;
        cs.setStrokingColor(BORDER_COLOR);
        cs.setLineWidth(1.0f);
        cs.moveTo(totalBoxX + 15, lineY);
        cs.lineTo(totalBoxX + totalBoxWidth - 15, lineY);
        cs.stroke();

        lineY -= 35;
        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(totalBoxX + 10, lineY, totalBoxWidth - 20, 32);
        cs.fill();

        drawText(cs, "TOTAL DUE:", totalBoxX + 20, lineY + 10, fontBold, 12, Color.WHITE);

        String grandTotalStr = "Rs. " + totalAmount.setScale(2, RoundingMode.HALF_UP).toString();
        float gtWidth = getTextWidth(grandTotalStr, fontBold, 14);
        drawText(cs, grandTotalStr, totalBoxX + totalBoxWidth - 20 - gtWidth, lineY + 9, fontBold, 14, ACCENT_AQUA);

        return boxY - 20;
    }

    // ==========================================
    // 5. WATER SAVING TIPS PANEL
    // ==========================================
    private float drawWaterTipsPanel(PDPageContentStream cs, float currentY, PDFont fontBold, PDFont fontRegular, PDFont fontOblique) throws IOException {
        float panelHeight = 70.0f;
        float panelY = currentY - panelHeight;

        Color softGreenBg = new Color(240, 249, 242);
        Color borderGreen = new Color(180, 220, 190);
        drawRoundedBox(cs, MARGIN, panelY, CONTENT_WIDTH, panelHeight, softGreenBg, borderGreen);

        drawText(cs, "AQUATRACK WATER CONSERVATION TIP", MARGIN + 15, panelY + panelHeight - 20, fontBold, 9.5f, GREEN_TIP);

        String tipText = "Fixing a silent toilet leak can save up to 200 gallons of water per day! Check your fixtures regularly " +
                "and report any main supply leaks immediately to your building management.";
        
        List<String> lines = wrapText(tipText, CONTENT_WIDTH - 30, fontOblique, 8.5f);
        float textY = panelY + panelHeight - 36;
        for (String line : lines) {
            drawText(cs, line, MARGIN + 15, textY, fontOblique, 8.5f, TEXT_DARK);
            textY -= 12;
        }

        return panelY - 20;
    }

    // ==========================================
    // 6. FOOTER
    // ==========================================
    private void drawFooter(PDPageContentStream cs, PDFont fontBold, PDFont fontRegular) throws IOException {
        float footerY = 35.0f;

        cs.setStrokingColor(BORDER_COLOR);
        cs.setLineWidth(0.8f);
        cs.moveTo(MARGIN, footerY + 20);
        cs.lineTo(PAGE_WIDTH - MARGIN, footerY + 20);
        cs.stroke();

        drawText(cs, "AquaTrack Support Services | Email: support@aquatrack.com | Phone: 1-800-555-AQUA", MARGIN, footerY + 8, fontRegular, 8, TEXT_MUTED);
        
        String pageInfo = "Thank you for conserving water!";
        float infoWidth = getTextWidth(pageInfo, fontBold, 8);
        drawText(cs, pageInfo, PAGE_WIDTH - MARGIN - infoWidth, footerY + 8, fontBold, 8, PRIMARY_NAVY);
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================
    private void drawText(PDPageContentStream cs, String text, float x, float y, PDFont font, float fontSize, Color color) throws IOException {
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.setNonStrokingColor(color);
        cs.newLineAtOffset(x, y);
        cs.showText(text != null ? text : "");
        cs.endText();
    }

    private void drawLabelValue(PDPageContentStream cs, String label, String value, float x, float y, PDFont fontBold, PDFont fontRegular) throws IOException {
        drawText(cs, label, x, y, fontBold, 8.5f, TEXT_MUTED);
        float labelWidth = getTextWidth(label, fontBold, 8.5f);
        drawText(cs, value, x + labelWidth + 5, y, fontRegular, 8.5f, TEXT_DARK);
    }

    private void drawRoundedBox(PDPageContentStream cs, float x, float y, float width, float height, Color bgColor, Color borderColor) throws IOException {
        cs.setNonStrokingColor(bgColor);
        cs.addRect(x, y, width, height);
        cs.fill();

        cs.setStrokingColor(borderColor);
        cs.setLineWidth(0.8f);
        cs.addRect(x, y, width, height);
        cs.stroke();
    }

    private void drawSimulatedQRCode(PDPageContentStream cs, float x, float y, float size) throws IOException {
        cs.setStrokingColor(PRIMARY_NAVY);
        cs.setLineWidth(1.0f);
        cs.addRect(x, y, size, size);
        cs.stroke();

        drawQRFinderPattern(cs, x + 4, y + size - 18, 14);
        drawQRFinderPattern(cs, x + size - 18, y + size - 18, 14);
        drawQRFinderPattern(cs, x + 4, y + 4, 14);

        cs.setNonStrokingColor(PRIMARY_NAVY);
        for (int i = 0; i < 6; i++) {
            for (int j = 0; j < 6; j++) {
                if ((i + j) % 2 == 0) {
                    cs.addRect(x + 22 + (i * 7), y + 6 + (j * 7), 5, 5);
                    cs.fill();
                }
            }
        }
    }

    private void drawQRFinderPattern(PDPageContentStream cs, float x, float y, float size) throws IOException {
        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(x, y, size, size);
        cs.fill();

        cs.setNonStrokingColor(Color.WHITE);
        cs.addRect(x + 2, y + 2, size - 4, size - 4);
        cs.fill();

        cs.setNonStrokingColor(PRIMARY_NAVY);
        cs.addRect(x + 4, y + 4, size - 8, size - 8);
        cs.fill();
    }

    private float getTextWidth(String text, PDFont font, float fontSize) throws IOException {
        if (text == null || text.isEmpty()) return 0;
        return (font.getStringWidth(text) / 1000.0f) * fontSize;
    }

    private List<String> wrapText(String text, float maxWidth, PDFont font, float fontSize) throws IOException {
        List<String> result = new ArrayList<>();
        String[] words = text.split(" ");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            String candidate = currentLine.length() == 0 ? word : currentLine + " " + word;
            if (getTextWidth(candidate, font, fontSize) <= maxWidth) {
                currentLine.append(currentLine.length() == 0 ? "" : " ").append(word);
            } else {
                result.add(currentLine.toString());
                currentLine = new StringBuilder(word);
            }
        }
        if (currentLine.length() > 0) {
            result.add(currentLine.toString());
        }
        return result;
    }
}