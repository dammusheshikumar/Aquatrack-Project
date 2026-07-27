-- AquaTrack complete schema (MySQL 8)

CREATE TABLE apartments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    active_tariff_plan_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE households (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    flat_number VARCHAR(30) NOT NULL,
    flat_size_sqft DECIMAL(10,2) NOT NULL,
    occupancy INT NOT NULL DEFAULT 1,
    meter_serial_number VARCHAR(60),
    meter_active BOOLEAN NOT NULL DEFAULT TRUE,
    daily_limit_kl DECIMAL(10,3) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_household_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    CONSTRAINT uq_household_flat UNIQUE (apartment_id, flat_number)
) ENGINE=InnoDB;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NULL,
    apartment_id BIGINT NULL,
    username VARCHAR(60) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_role CHECK (role IN ('ADMIN','RESIDENT')),
    CONSTRAINT chk_user_auth_provider CHECK (auth_provider IN ('LOCAL','GOOGLE')),
    CONSTRAINT chk_user_approval_status CHECK (approval_status IN ('PENDING','APPROVED','REJECTED'))
) ENGINE=InnoDB;

CREATE TABLE tariff_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tariff_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE apartments ADD CONSTRAINT fk_apartment_tariff FOREIGN KEY (active_tariff_plan_id) REFERENCES tariff_plans(id) ON DELETE SET NULL;

CREATE TABLE tariff_tiers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tariff_plan_id BIGINT NOT NULL,
    tier_order INT NOT NULL,
    up_to_kl DECIMAL(10,2) NULL,
    rate DECIMAL(10,4) NOT NULL,
    CONSTRAINT fk_tier_plan FOREIGN KEY (tariff_plan_id) REFERENCES tariff_plans(id) ON DELETE CASCADE,
    CONSTRAINT uq_tier_plan_order UNIQUE (tariff_plan_id, tier_order)
) ENGINE=InnoDB;

CREATE TABLE water_usage_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    reading_date DATE NOT NULL,
    reading_value DECIMAL(12,3) NOT NULL,
    consumption_kl DECIMAL(12,3) NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT uq_usage_household_date UNIQUE (household_id, reading_date),
    CONSTRAINT chk_usage_source CHECK (source IN ('MANUAL','BULK_CSV','IOT'))
) ENGINE=InnoDB;

CREATE TABLE billing_cycles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_purchased_volume_kl DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    finalized_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_billing_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    CONSTRAINT chk_billing_status CHECK (status IN ('OPEN','FINALIZED','ARCHIVED'))
) ENGINE=InnoDB;

CREATE TABLE water_purchases (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    billing_cycle_id BIGINT NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_type VARCHAR(20) NOT NULL,
    volume_kl DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_cycle FOREIGN KEY (billing_cycle_id) REFERENCES billing_cycles(id) ON DELETE CASCADE,
    CONSTRAINT chk_purchase_type CHECK (purchase_type IN ('TANKER','MUNICIPAL','OTHER'))
) ENGINE=InnoDB;

CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    billing_cycle_id BIGINT NOT NULL,
    household_id BIGINT NOT NULL,
    consumption_kl DECIMAL(12,3) NOT NULL DEFAULT 0,
    base_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
    shared_allocation DECIMAL(12,2) NOT NULL DEFAULT 0,
    adjustments DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    pdf_path VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_cycle FOREIGN KEY (billing_cycle_id) REFERENCES billing_cycles(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT uq_invoice_cycle_household UNIQUE (billing_cycle_id, household_id)
) ENGINE=InnoDB;

CREATE TABLE invoice_adjustments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_by_admin_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adjustment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_adjustment_admin FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE fines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    imposed_by_admin_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    CONSTRAINT fk_fine_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT fk_fine_admin FOREIGN KEY (imposed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_fine_status CHECK (status IN ('UNPAID','PAID','WAIVED'))
) ENGINE=InnoDB;

CREATE TABLE alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    alert_type VARCHAR(30) NOT NULL,
    message VARCHAR(500) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT chk_alert_type CHECK (alert_type IN ('OVERUSE','ANOMALY_LEAK','DAILY_LIMIT_EXCEEDED','BILLING_CYCLE_COMPLETE','FINE_IMPOSED')),
    CONSTRAINT chk_alert_severity CHECK (severity IN ('INFO','WARNING','CRITICAL'))
) ENGINE=InnoDB;

CREATE INDEX idx_usage_household_date ON water_usage_logs(household_id, reading_date);
CREATE INDEX idx_invoice_household ON invoices(household_id);
CREATE INDEX idx_alert_household ON alerts(household_id, resolved);
CREATE INDEX idx_tier_plan_order ON tariff_tiers(tariff_plan_id, tier_order);
CREATE INDEX idx_purchase_cycle ON water_purchases(billing_cycle_id);
CREATE INDEX idx_fine_household ON fines(household_id, status);
CREATE INDEX idx_user_household ON users(household_id);
CREATE INDEX idx_user_apartment ON users(apartment_id);
