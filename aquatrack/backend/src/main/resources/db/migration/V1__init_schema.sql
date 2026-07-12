-- AquaTrack initial schema (MySQL 8)

CREATE TABLE apartments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(300) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE households (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    flat_number VARCHAR(30) NOT NULL,
    flat_size_sqft DECIMAL(10,2) NOT NULL,
    occupancy INT NOT NULL DEFAULT 1,
    meter_serial_number VARCHAR(60),
    meter_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_household_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    CONSTRAINT uq_apartment_flat UNIQUE (apartment_id, flat_number)
) ENGINE=InnoDB;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NULL,
    apartment_id BIGINT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role ENUM('ADMIN','RESIDENT') NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE tariff_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    base_rate DECIMAL(10,4) NOT NULL,
    base_tier_limit_kl DECIMAL(10,2) NOT NULL,
    excess_rate DECIMAL(10,4) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tariff_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE apartments ADD COLUMN active_tariff_plan_id BIGINT NULL;
ALTER TABLE apartments ADD CONSTRAINT fk_apartment_tariff FOREIGN KEY (active_tariff_plan_id) REFERENCES tariff_plans(id) ON DELETE SET NULL;

CREATE TABLE billing_cycles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    apartment_id BIGINT NOT NULL,
    status ENUM('OPEN','FINALIZED','ARCHIVED') NOT NULL DEFAULT 'OPEN',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_purchased_volume_kl DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    shared_area_usage_kl DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP NULL,
    CONSTRAINT fk_cycle_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE water_usage_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    reading_date DATE NOT NULL,
    reading_value_kl DECIMAL(10,3) NOT NULL,
    source ENUM('MANUAL','BULK_CSV','IOT') NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT uq_household_reading_date UNIQUE (household_id, reading_date)
) ENGINE=InnoDB;

CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    billing_cycle_id BIGINT NOT NULL,
    household_id BIGINT NOT NULL,
    consumption_kl DECIMAL(10,3) NOT NULL,
    base_charge DECIMAL(12,2) NOT NULL,
    shared_allocation DECIMAL(12,2) NOT NULL,
    adjustments DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    pdf_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_cycle FOREIGN KEY (billing_cycle_id) REFERENCES billing_cycles(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    CONSTRAINT uq_cycle_household UNIQUE (billing_cycle_id, household_id)
) ENGINE=InnoDB;

CREATE TABLE alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    alert_type ENUM('OVERUSE','ANOMALY_LEAK','BILLING_CYCLE_COMPLETE') NOT NULL,
    message VARCHAR(500) NOT NULL,
    triggered_value_kl DECIMAL(10,3) NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_usage_household_date ON water_usage_logs(household_id, reading_date);
CREATE INDEX idx_alerts_household ON alerts(household_id, resolved);
CREATE INDEX idx_invoices_household ON invoices(household_id);
