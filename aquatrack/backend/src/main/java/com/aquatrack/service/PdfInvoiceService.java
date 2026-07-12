package com.aquatrack.service;

import com.aquatrack.entity.Invoice;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * Generates downloadable, itemized PDF invoices on the backend (Apache PDFBox/iText),
 * ensuring every household gets a consistent, auditable bill regardless of client device.
 */
@Service
public class PdfInvoiceService {

    public byte[] generateInvoicePdf(Invoice invoice) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);

            var apartment = invoice.getHousehold().getApartment();
            var cycle = invoice.getBillingCycle();

            document.add(new Paragraph("AquaTrack Water Bill")
                    .setBold().setFontSize(20).setFontColor(ColorConstants.DARK_GRAY));
            document.add(new Paragraph(apartment.getName() + " - " + apartment.getAddress())
                    .setFontSize(10).setFontColor(ColorConstants.GRAY));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Flat: " + invoice.getHousehold().getFlatNumber()));
            document.add(new Paragraph("Billing Period: " + cycle.getStartDate() + " to " + cycle.getEndDate()));
            document.add(new Paragraph("Invoice Generated: " +
                    invoice.getGeneratedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))));
            document.add(new Paragraph(" "));

            Table table = new Table(UnitValue.createPercentArray(new float[]{3, 1}))
                    .useAllAvailableWidth();
            table.addHeaderCell(headerCell("Description"));
            table.addHeaderCell(headerCell("Amount"));

            table.addCell(new Cell().add(new Paragraph("Metered Consumption")));
            table.addCell(new Cell().add(new Paragraph(invoice.getMeteredConsumptionKl() + " kL")));

            table.addCell(new Cell().add(new Paragraph("Base Tariff Charge")));
            table.addCell(new Cell().add(new Paragraph(currency(invoice.getBaseCharge()))));

            table.addCell(new Cell().add(new Paragraph("Shared-Area Allocation (garden/pool/lobby)")));
            table.addCell(new Cell().add(new Paragraph(currency(invoice.getSharedAllocation()))));

            table.addCell(new Cell().add(new Paragraph("Adjustments")));
            table.addCell(new Cell().add(new Paragraph(currency(invoice.getAdjustments()))));

            table.addCell(new Cell().add(new Paragraph("Total Due").setBold()));
            table.addCell(new Cell().add(new Paragraph(currency(invoice.getTotal())).setBold()));

            document.add(table);
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Payment Instructions")
                    .setBold().setFontSize(12));
            document.add(new Paragraph(
                    "Please settle this invoice through the AquaTrack resident portal or your apartment's " +
                    "designated payment channel before the next billing cycle begins. Contact your apartment " +
                    "administrator for questions about this bill.")
                    .setFontSize(10).setTextAlignment(TextAlignment.LEFT));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF invoice: " + e.getMessage(), e);
        }
    }

    private Cell headerCell(String text) {
        return new Cell().add(new Paragraph(text).setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY);
    }

    private String currency(java.math.BigDecimal amount) {
        return "Rs. " + amount.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
