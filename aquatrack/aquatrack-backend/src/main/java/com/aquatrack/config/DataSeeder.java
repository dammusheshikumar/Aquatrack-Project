package com.aquatrack.config;

import com.aquatrack.entity.*;
import com.aquatrack.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @PersistenceContext
    private EntityManager entityManager;

    private final ApartmentRepository apartmentRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final WaterUsageLogRepository waterUsageLogRepository;
    private final TariffPlanRepository tariffPlanRepository;
    private final BillingCycleRepository billingCycleRepository;
    private final InvoiceRepository invoiceRepository;
    private final FineRepository fineRepository;
    private final AlertRepository alertRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(ApartmentRepository apartmentRepository, HouseholdRepository householdRepository,
                      UserRepository userRepository, WaterUsageLogRepository waterUsageLogRepository,
                      TariffPlanRepository tariffPlanRepository, BillingCycleRepository billingCycleRepository,
                      InvoiceRepository invoiceRepository, FineRepository fineRepository,
                      AlertRepository alertRepository, PasswordEncoder passwordEncoder) {
        this.apartmentRepository = apartmentRepository;
        this.householdRepository = householdRepository;
        this.userRepository = userRepository;
        this.waterUsageLogRepository = waterUsageLogRepository;
        this.tariffPlanRepository = tariffPlanRepository;
        this.billingCycleRepository = billingCycleRepository;
        this.invoiceRepository = invoiceRepository;
        this.fineRepository = fineRepository;
        this.alertRepository = alertRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Ensure Super Admin exists
        if (!userRepository.existsByUsername("superadmin")) {
            User superAdmin = User.builder()
                    .username("superadmin")
                    .email("superadmin@aquatrack.app")
                    .passwordHash(passwordEncoder.encode("SuperAdmin@123"))
                    .fullName("AquaTrack Super Admin")
                    .role(Role.SUPER_ADMIN)
                    .approvalStatus(ApprovalStatus.APPROVED)
                    .enabled(true)
                    .authProvider(AuthProvider.LOCAL)
                    .build();
            userRepository.save(superAdmin);
        }

        // Only seed if apartments count is less than 15
        if (apartmentRepository.count() >= 15) {
            return;
        }

        System.out.println("Starting AquaTrack Premium Demo Data Seeding (15 Apartments, 15 Admins, 225 Households, 500+ Residents)...");

        String[][] aptData = {
            {"Greenview Heights", "14 Lake View Road, Jubilee Hills, Hyderabad"},
            {"Sunrise Towers", "88 Financial District Boulevard, Gachibowli, Hyderabad"},
            {"Palm Meadows Enclave", "45 Palm Avenue, Whitefield, Bengaluru"},
            {"Ocean Breeze Residency", "12 Beach Road, Visakhapatnam"},
            {"Royal Palms Estate", "77 Baner Highway, Baner, Pune"},
            {"Sapphire Gardens", "108 Indiranagar Main Road, Bengaluru"},
            {"Cedar Crest Manor", "33 Hitec City Road, Madhapur, Hyderabad"},
            {"Maple Wood Heights", "9 Cyberabad Avenue, Kondapur, Hyderabad"},
            {"Emerald Isle Residency", "55 Koramangala 4th Block, Bengaluru"},
            {"Silver Oaks Community", "21 Bandra Kurla Complex, Mumbai"},
            {"Crestview Valley", "64 Velachery Main Road, Chennai"},
            {"Pine Grove Enclave", "19 Salt Lake Sector V, Kolkata"},
            {"Oakridge Palms", "80 Powai Lake Road, Powai, Mumbai"},
            {"Golden Valley Towers", "25 Anna Nagar West, Chennai"},
            {"Blue Bell Residency", "10 Park Street, Kolkata"}
        };

        String[][] adminData = {
            {"admin_greenview", "rajesh.verma@greenviewheights.com", "Rajesh Verma"},
            {"admin_sunrise", "ananya.sharma@sunrisetowers.com", "Ananya Sharma"},
            {"admin_palm", "karthik.iyer@palmmeadows.org", "Karthik Iyer"},
            {"admin_ocean", "siddharth.roy@oceanbreeze.in", "Siddharth Roy"},
            {"admin_royal", "neha.deshmukh@royalpalms.com", "Neha Deshmukh"},
            {"admin_sapphire", "arjun.reddy@sapphiregardens.org", "Arjun Reddy"},
            {"admin_cedar", "pooja.hegde@cedarcrest.in", "Pooja Hegde"},
            {"admin_maple", "manish.pandey@maplewood.com", "Manish Pandey"},
            {"admin_emerald", "suresh.raina@emeraldisle.org", "Suresh Raina"},
            {"admin_silver", "rohan.gupta@silveroaks.com", "Rohan Gupta"},
            {"admin_crestview", "divya.spandana@crestview.in", "Divya Spandana"},
            {"admin_pine", "amitabh.sen@pinegrove.org", "Amitabh Sen"},
            {"admin_oakridge", "sanjana.kapoor@oakridge.com", "Sanjana Kapoor"},
            {"admin_golden", "vikram.malhotra@goldenvalley.in", "Vikram Malhotra"},
            {"admin_bluebell", "priya.nambiar@bluebellresidency.org", "Priya Nambiar"}
        };

        String[] flatNumbers = {"101", "102", "103", "201", "202", "203", "301", "302", "303", "401", "402", "403", "501", "502", "503"};
        String[] residentFirstNames = {"Aarav", "Ananya", "Rohan", "Priya", "Rahul", "Sneha", "Karan", "Pooja", "Aditya", "Riya", "Varun", "Kavya", "Siddharth", "Neha", "Tarun"};
        String[] residentLastNames = {"Sharma", "Verma", "Patel", "Reddy", "Iyer", "Rao", "Gupta", "Deshmukh", "Joshi", "Nair", "Singhania", "Kapoor", "Chawla", "Bhat", "Mehta"};

        String defaultAdminPass = passwordEncoder.encode("Admin@12345");
        String defaultResidentPass = passwordEncoder.encode("Resident@123");

        for (int i = 0; i < aptData.length; i++) {
            final int aptIndex = i;
            String name = aptData[i][0];
            String address = aptData[i][1];

            Apartment apartment = apartmentRepository.findByName(name)
                    .orElseGet(() -> apartmentRepository.save(Apartment.builder().name(name).address(address).build()));

            // Seed Apartment Admin
            String adminUsername = adminData[i][0];
            String adminEmail = adminData[i][1];
            String adminName = adminData[i][2];

            User admin = userRepository.findByUsername(adminUsername).orElse(null);
            if (admin == null) {
                admin = User.builder()
                        .username(adminUsername)
                        .email(adminEmail)
                        .passwordHash(defaultAdminPass)
                        .fullName(adminName)
                        .role(Role.ADMIN)
                        .apartment(apartment)
                        .approvalStatus(ApprovalStatus.APPROVED)
                        .enabled(true)
                        .authProvider(AuthProvider.LOCAL)
                        .build();
                userRepository.save(admin);
            }

            // Seed Tariff Plan
            if (tariffPlanRepository.findByApartmentIdAndActiveTrue(apartment.getId()).isEmpty()) {
                TariffPlan plan = TariffPlan.builder()
                        .apartment(apartment)
                        .planName("Standard Tiered Water Plan 2026")
                        .active(true)
                        .build();

                TariffTier tier1 = TariffTier.builder().tariffPlan(plan).tierOrder(1).upToKl(new BigDecimal("10.00")).rate(new BigDecimal("15.0000")).build();
                TariffTier tier2 = TariffTier.builder().tariffPlan(plan).tierOrder(2).upToKl(new BigDecimal("25.00")).rate(new BigDecimal("25.0000")).build();
                TariffTier tier3 = TariffTier.builder().tariffPlan(plan).tierOrder(3).upToKl(null).rate(new BigDecimal("40.0000")).build();
                plan.setTiers(List.of(tier1, tier2, tier3));

                tariffPlanRepository.save(plan);
            }

            // Seed 15 Households per Apartment
            List<Household> aptHouseholds = new ArrayList<>();
            for (int j = 0; j < flatNumbers.length; j++) {
                String flatNo = flatNumbers[j];
                Household hh = householdRepository.findByApartmentIdAndFlatNumber(apartment.getId(), flatNo)
                        .orElse(null);

                if (hh == null) {
                    hh = Household.builder()
                            .apartment(apartment)
                            .flatNumber(flatNo)
                            .flatSizeSqft(new BigDecimal(900 + (j * 60)))
                            .occupancy(2 + (j % 4))
                            .meterSerialNumber("MT-" + (aptIndex + 1) + flatNo)
                            .meterActive(true)
                            .dailyLimitKl(new BigDecimal("0.50").add(BigDecimal.valueOf((j % 5) * 0.15)))
                            .build();
                    hh = householdRepository.save(hh);
                }
                aptHouseholds.add(hh);

                // Seed 2 - 3 Residents per Household
                int numResidents = 2 + (j % 2);
                for (int r = 1; r <= numResidents; r++) {
                    String resUsername = "res_" + (aptIndex + 1) + "_" + flatNo + "_" + r;
                    if (!userRepository.existsByUsername(resUsername)) {
                        String firstName = residentFirstNames[(j + r) % residentFirstNames.length];
                        String lastName = residentLastNames[(aptIndex + j + r) % residentLastNames.length];
                        User resident = User.builder()
                                .username(resUsername)
                                .email(resUsername + "@aquatrack.app")
                                .passwordHash(defaultResidentPass)
                                .fullName(firstName + " " + lastName)
                                .role(Role.RESIDENT)
                                .apartment(apartment)
                                .household(hh)
                                .approvalStatus(ApprovalStatus.APPROVED)
                                .enabled(true)
                                .authProvider(AuthProvider.LOCAL)
                                .build();
                        userRepository.save(resident);
                    }
                }

                // Seed 14 Daily Water Readings
                LocalDate today = LocalDate.now();
                BigDecimal cumulative = new BigDecimal(50 + (j * 10));
                for (int d = 14; d >= 0; d--) {
                    LocalDate date = today.minusDays(d);
                    if (waterUsageLogRepository.findByHouseholdIdAndReadingDate(hh.getId(), date).isEmpty()) {
                        BigDecimal dailyConsumption = new BigDecimal("0.250")
                                .add(BigDecimal.valueOf(((j + d) % 5) * 0.080));
                        cumulative = cumulative.add(dailyConsumption);

                        WaterUsageLog log = WaterUsageLog.builder()
                                .household(hh)
                                .readingDate(date)
                                .readingValue(cumulative)
                                .consumptionKl(dailyConsumption)
                                .source(UsageSource.MANUAL)
                                .build();
                        waterUsageLogRepository.save(log);
                    }
                }
            }

            // Seed Billing Cycles (1 Finalized, 1 Open)
            LocalDate prevMonthStart = LocalDate.now().minusMonths(1).withDayOfMonth(1);
            LocalDate prevMonthEnd = LocalDate.now().minusMonths(1).withDayOfMonth(prevMonthStart.lengthOfMonth());

            BillingCycle prevCycle = billingCycleRepository.findByApartmentIdAndStartDate(apartment.getId(), prevMonthStart)
                    .orElse(null);

            if (prevCycle == null) {
                prevCycle = billingCycleRepository.save(BillingCycle.builder()
                        .apartment(apartment)
                        .startDate(prevMonthStart)
                        .endDate(prevMonthEnd)
                        .status(BillingCycleStatus.FINALIZED)
                        .totalPurchasedVolumeKl(new BigDecimal("180.00"))
                        .unitCost(new BigDecimal("35.0000"))
                        .finalizedAt(LocalDateTime.now().minusDays(5))
                        .build());

                // Seed Invoices for prevCycle
                for (Household hh : aptHouseholds) {
                    if (invoiceRepository.findByBillingCycleIdAndHouseholdId(prevCycle.getId(), hh.getId()).isEmpty()) {
                        BigDecimal consumption = new BigDecimal("12.45");
                        BigDecimal baseCharge = new BigDecimal("186.75");
                        BigDecimal sharedAlloc = new BigDecimal("45.00");
                        BigDecimal total = baseCharge.add(sharedAlloc);

                        Invoice invoice = Invoice.builder()
                                .billingCycle(prevCycle)
                                .household(hh)
                                .consumptionKl(consumption)
                                .baseCharge(baseCharge)
                                .sharedAllocation(sharedAlloc)
                                .adjustments(BigDecimal.ZERO)
                                .total(total)
                                .build();
                        invoiceRepository.save(invoice);
                    }
                }
            }

            LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);
            LocalDate currentMonthEnd = LocalDate.now().withDayOfMonth(currentMonthStart.lengthOfMonth());
            if (billingCycleRepository.findByApartmentIdAndStartDate(apartment.getId(), currentMonthStart).isEmpty()) {
                billingCycleRepository.save(BillingCycle.builder()
                        .apartment(apartment)
                        .startDate(currentMonthStart)
                        .endDate(currentMonthEnd)
                        .status(BillingCycleStatus.OPEN)
                        .totalPurchasedVolumeKl(new BigDecimal("220.00"))
                        .unitCost(new BigDecimal("32.5000"))
                        .build());
            }

            // Seed 2 Alerts per Apartment
            if (alertRepository.findByHousehold_Apartment_Id(apartment.getId()).isEmpty() && !aptHouseholds.isEmpty()) {
                Household hh1 = aptHouseholds.get(0);
                Household hh2 = aptHouseholds.get(1 % aptHouseholds.size());

                alertRepository.save(Alert.builder()
                        .household(hh1)
                        .alertType(AlertType.DAILY_LIMIT_EXCEEDED)
                        .message("Daily water limit of 0.50 kL exceeded (0.78 kL consumed)")
                        .severity(AlertSeverity.WARNING)
                        .resolved(false)
                        .build());

                alertRepository.save(Alert.builder()
                        .household(hh2)
                        .alertType(AlertType.ANOMALY_LEAK)
                        .message("2σ statistical anomaly detected: continuous water flow flag for 8+ hours")
                        .severity(AlertSeverity.CRITICAL)
                        .resolved(false)
                        .build());
            }

            // Seed 2 Fines per Apartment
            if (fineRepository.findByHousehold_Apartment_IdOrderByCreatedAtDesc(apartment.getId()).isEmpty() && !aptHouseholds.isEmpty()) {
                Household hh1 = aptHouseholds.get(2 % aptHouseholds.size());
                Household hh2 = aptHouseholds.get(3 % aptHouseholds.size());

                fineRepository.save(Fine.builder()
                        .household(hh1)
                        .amount(new BigDecimal("500.00"))
                        .reason("Water overflow penalty from unmonitored overhead tank")
                        .status(FineStatus.UNPAID)
                        .imposedByAdmin(admin)
                        .build());

                fineRepository.save(Fine.builder()
                        .household(hh2)
                        .amount(new BigDecimal("250.00"))
                        .reason("Unauthorized hose wash during restricted rationing hours")
                        .status(FineStatus.PAID)
                        .imposedByAdmin(admin)
                        .resolvedAt(LocalDateTime.now().minusDays(2))
                        .build());
            }
        }

        System.out.println("AquaTrack Premium Demo Data Seeding Completed Successfully! All 15 Apartments and Dashboards Fully Populated.");
    }
}
