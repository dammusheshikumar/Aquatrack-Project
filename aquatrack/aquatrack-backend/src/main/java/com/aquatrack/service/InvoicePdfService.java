package com.aquatrack.service;

import com.aquatrack.entity.Invoice;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

/**
 * Generates a downloadable PDF invoice on the backend (Apache PDFBox) so the
 * document is consistent, auditable, and independent of the browser/client
 * that requests it.
 */
@Service
public class InvoicePdfService {

    public byte[] generateInvoicePdf(Invoice invoice) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDType1Font titleFont = PDType1Font.HELVETICA_BOLD;
            PDType1Font bodyFont = PDType1Font.HELVETICA;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float margin = 50;
                float y = 780;

                cs.beginText();
                cs.setFont(titleFont, 20);
                cs.newLineAtOffset(margin, y);
                cs.showText("AquaTrack - Water Bill Invoice");
                cs.endText();
                y -= 40;

                cs.beginText();
                cs.setFont(bodyFont, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Invoice #: " + invoice.getId());
                cs.endText();
                y -= 18;

                cs.beginText();
                cs.setFont(bodyFont, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Apartment: " + invoice.getHousehold().getApartment().getName());
                cs.endText();
                y -= 18;

                cs.beginText();
                cs.setFont(bodyFont, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Flat: " + invoice.getHousehold().getFlatNumber());
                cs.endText();
                y -= 18;

                cs.beginText();
                cs.setFont(bodyFont, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Billing Period: " + invoice.getBillingCycle().getStartDate() +
                        " to " + invoice.getBillingCycle().getEndDate());
                cs.endText();
                y -= 18;

                cs.beginText();
                cs.setFont(bodyFont, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Generated: " + java.time.LocalDate.now().format(DateTimeFormatter.ISO_DATE));
                cs.endText();
                y -= 40;

                cs.beginText();
                cs.setFont(titleFont, 13);
                cs.newLineAtOffset(margin, y);
                cs.showText("Consumption Breakdown");
                cs.endText();
                y -= 24;

                y = writeRow(cs, bodyFont, margin, y, "Metered Consumption (kL)", invoice.getConsumptionKl().toString());
                y = writeRow(cs, bodyFont, margin, y, "Base Charge (tiered tariff)", "Rs. " + invoice.getBaseCharge());
                y = writeRow(cs, bodyFont, margin, y, "Shared Area Allocation", "Rs. " + invoice.getSharedAllocation());
                y = writeRow(cs, bodyFont, margin, y, "Adjustments", "Rs. " + invoice.getAdjustments());
                y -= 10;

                cs.beginText();
                cs.setFont(titleFont, 14);
                cs.newLineAtOffset(margin, y);
                cs.showText("Total Due: Rs. " + invoice.getTotal());
                cs.endText();
                y -= 50;

                cs.beginText();
                cs.setFont(bodyFont, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("Payment Instructions: Pay via the AquaTrack resident portal or apartment office.");
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(bodyFont, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("Thank you for conserving water with AquaTrack.");
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF invoice: " + e.getMessage(), e);
        }
    }

    private float writeRow(PDPageContentStream cs, PDType1Font font, float margin, float y,
                            String label, String value) throws IOException {
        cs.beginText();
        cs.setFont(font, 11);
        cs.newLineAtOffset(margin, y);
        cs.showText(label + ":");
        cs.endText();

        cs.beginText();
        cs.setFont(font, 11);
        cs.newLineAtOffset(margin + 280, y);
        cs.showText(value);
        cs.endText();

        return y - 20;
    }
}