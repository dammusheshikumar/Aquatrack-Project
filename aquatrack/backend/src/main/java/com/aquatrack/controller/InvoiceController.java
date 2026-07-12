package com.aquatrack.controller;

import com.aquatrack.entity.Invoice;
import com.aquatrack.service.BillingService;
import com.aquatrack.service.PdfInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final BillingService billingService;
    private final PdfInvoiceService pdfInvoiceService;

    @GetMapping("/household/{householdId}")
    public List<Invoice> forHousehold(@PathVariable Long householdId) {
        return billingService.getInvoicesForHousehold(householdId);
    }

    @GetMapping("/cycle/{cycleId}")
    public List<Invoice> forCycle(@PathVariable Long cycleId) {
        return billingService.getInvoicesForCycle(cycleId);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        Invoice invoice = billingService.getInvoice(id);
        byte[] pdf = pdfInvoiceService.generateInvoicePdf(invoice);
        String filename = "AquaTrack-Invoice-" + invoice.getHousehold().getFlatNumber() + "-" + invoice.getId() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }
}
