#include <iostream>
#include <cstring>
#include <cstdio>
#include "../include/network_stack.h"

void handle_incoming_telemetry(const char* raw_packet, int packet_len) {
    char local_stream_buffer[48];
    
    std::cout << "[NET] Telemetry packet inbound (" << packet_len << " bytes)\n";
    
    // CWE-120: Classic Buffer Overflow (Copies unbounded packet into 48-byte buffer)
    std::strcpy(local_stream_buffer, raw_packet);
    std::printf("[NET] Processed packet payload: %s\n", local_stream_buffer);
}

// CWE-476: NULL Pointer Dereference
int parse_mqtt_frame(const char* topic, const char* payload, DeviceSession* session) {
    // VULNERABLE: Dereferencing session pointer without checking for nullptr
    if (session->is_authenticated == 0) {
        std::cout << "[AUTH] Session not authenticated for topic: " << topic << std::endl;
        return -1;
    }
    
    std::cout << "[MQTT] Valid frame received on: " << topic << " | Payload: " << payload << std::endl;
    return 0;
}

void broadcast_alert(const char* alert_msg) {
    char alert_frame[64];
    std::snprintf(alert_frame, sizeof(alert_frame), "[CRITICAL ALERT]: %s", alert_msg);
    std::cout << alert_frame << std::endl;
}
