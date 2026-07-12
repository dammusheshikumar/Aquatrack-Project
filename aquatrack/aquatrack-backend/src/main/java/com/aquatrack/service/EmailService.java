package com.aquatrack.service;

import com.aquatrack.entity.Alert;
import com.aquatrack.entity.Household;
import com.aquatrack.entity.User;
import com.aquatrack.repository.UserRepository;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    public EmailService(JavaMailSender mailSender, UserRepository userRepository) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
    }

    public void sendAlertEmail(Alert alert) {
        Household household = alert.getHousehold();

        List<User> residents = userRepository.findAll().stream()
                .filter(u -> u.getHousehold() != null &&
                        u.getHousehold().getId().equals(household.getId()))
                .toList();

        for (User resident : residents) {

            String subject = switch (alert.getAlertType()) {
                case OVERUSE -> "AquaTrack Alert: Unusual Water Overuse Detected";
                case ANOMALY_LEAK -> "AquaTrack Alert: Possible Water Leak Detected";
                case BILLING_CYCLE_COMPLETE -> "AquaTrack: Your Water Bill is Ready";
            };

            String body =
                    "Hi " + resident.getFullName() + ",\n\n" +
                    alert.getMessage() + "\n\n" +
                    "Flat Number: " + household.getFlatNumber() + "\n\n" +
                    "Regards,\n" +
                    "AquaTrack Team";

            send(resident.getEmail(), subject, body);
        }
    }

    public void sendLoginNotification(User user) {

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd MMMM yyyy hh:mm a");

        String loginTime = LocalDateTime.now().format(formatter);

        String subject = "Successful Login to AquaTrack";

        String body =
                "Hi " + user.getFullName() + ",\n\n" +

                "Your AquaTrack account has been successfully logged in.\n\n" +

                "Login Details\n" +
                "------------------------------\n" +
                "Username : " + user.getUsername() + "\n" +
                "Email    : " + user.getEmail() + "\n" +
                "Time     : " + loginTime + "\n\n" +

                "If this login was performed by you, no action is required.\n\n" +

                "If you do not recognize this activity, please change your password immediately and contact your apartment administrator.\n\n" +

                "Thank you,\n" +
                "AquaTrack Team";

        send(user.getEmail(), subject, body);
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);

        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }
}