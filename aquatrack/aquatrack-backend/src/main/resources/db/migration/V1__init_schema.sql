-- AquaTrack initial schema (MySQL)

CREATE TABLE apartments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
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
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_role CHECK (role IN ('ADMIN','RESIDENT'))
) ENGINE=InnoDB;

CREATE TABLE tariff_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    base_rate DECIMAL(10,4) NOT NULL,
    base_tier_limit_kl DECIMAL(10,2) NOT NULL,
    excess_rate DECIMAL(10,4) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tariff_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE apartments ADD COLUMN active_tariff_plan_id BIGINT NULL;
ALTER TABLE apartments ADD CONSTRAINT fk_apartment_tariff FOREIGN KEY (active_tariff_plan_id) REFERENCES tariff_plans(id) ON DELETE SET NULL;

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

CREATE TABLE alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    alert_type VARCHAR(30) NOT NULL,
    message VARCHAR(500) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT chk_alert_type CHECK (alert_type IN ('OVERUSE','ANOMALY_LEAK','BILLING_CYCLE_COMPLETE')),
    CONSTRAINT chk_alert_severity CHECK (severity IN ('INFO','WARNING','CRITICAL'))
) ENGINE=InnoDB;

CREATE INDEX idx_usage_household_date ON water_usage_logs(household_id, reading_date);
CREATE INDEX idx_invoice_household ON invoices(household_id);
CREATE INDEX idx_alert_household ON alerts(household_id, resolved);
