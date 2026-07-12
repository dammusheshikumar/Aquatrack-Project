package com.aquatrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AquaTrackApplication {
    public static void main(String[] args) {
        SpringApplication.run(AquaTrackApplication.class, args);
    }
}
