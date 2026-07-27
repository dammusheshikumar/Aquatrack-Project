package com.aquatrack.controller;

import com.aquatrack.dto.billing.BillingCycleRequest;
import com.aquatrack.dto.billing.InvoiceAdjustmentRequest;
import com.aquatrack.dto.billing.PurchaseEntryRequest;
import com.aquatrack.entity.BillingCycle;
import com.aquatrack.entity.Invoice;
import com.aquatrack.entity.WaterPurchase;
import com.aquatrack.service.BillingService;
import com.aquatrack.service.InvoicePdfService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.io.IOException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class BillingController {

    private final BillingService billingService;
    private final InvoicePdfService invoicePdfService;

    public BillingController(BillingService billingService, InvoicePdfService invoicePdfService) {
        this.billingService = billingService;
        this.invoicePdfService = invoicePdfService;
    }

    @PostMapping("/admin/billing-cycles")
    public ResponseEntity<BillingCycle> open(@Valid @RequestBody BillingCycleRequest req) {
        return ResponseEntity.ok(billingService.openCycle(req));
    }

    @PostMapping("/admin/billing-cycles/purchases")
    public ResponseEntity<WaterPurchase> recordPurchase(@Valid @RequestBody PurchaseEntryRequest req) {
        return ResponseEntity.ok(billingService.recordPurchase(req));
    }

    @GetMapping("/admin/billing-cycles/{id}/purchases")
    public ResponseEntity<List<WaterPurchase>> purchasesForCycle(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.getPurchasesForCycle(id));
    }

    @PostMapping("/admin/billing-cycles/{id}/finalize")
    public ResponseEntity<List<Invoice>> finalizeCycle(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.finalizeCycle(id));
    }

    @PostMapping("/admin/billing-cycles/{id}/archive")
    public ResponseEntity<BillingCycle> archiveCycle(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.archiveCycle(id));
    }

    @GetMapping("/admin/apartments/{apartmentId}/billing-cycles")
    public ResponseEntity<List<BillingCycle>> listCycles(@PathVariable Long apartmentId) {
        return ResponseEntity.ok(billingService.listCycles(apartmentId));
    }

    @GetMapping("/admin/billing-cycles/{id}/invoices")
    public ResponseEntity<List<Invoice>> invoicesForCycle(@PathVariable Long id) {
        return ResponseEntity.ok(billingService.getInvoicesForCycle(id));
    }

    @PostMapping("/admin/invoices/{id}/adjustments")
    public ResponseEntity<Invoice> applyAdjustment(@PathVariable Long id, @Valid @RequestBody InvoiceAdjustmentRequest req,
                                                     HttpServletRequest request) {
        Long adminUserId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(billingService.applyAdjustment(id, req, adminUserId));
    }

    @GetMapping("/resident/households/{householdId}/invoices")
    public ResponseEntity<List<Invoice>> invoicesForHousehold(@PathVariable Long householdId) {
        return ResponseEntity.ok(billingService.getInvoicesForHousehold(householdId));
    }

    @GetMapping("/resident/invoices/{invoiceId}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable Long invoiceId) throws IOException {
        Invoice invoice = billingService.getInvoiceById(invoiceId);
        byte[] pdf = invoicePdfService.generateInvoicePdf(invoice);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                "invoice-" + invoice.getHousehold().getFlatNumber() + "-" + invoice.getId() + ".pdf");

        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
