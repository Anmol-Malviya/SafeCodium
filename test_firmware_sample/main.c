#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// Simulated IoT Telemetry Packet Processor
void process_packet(const char* raw_input) {
    char packet_buffer[32];
    
    // CWE-120: Buffer Copy without Checking Size (Classic Buffer Overflow)
    strcpy(packet_buffer, raw_input);
    printf("Processed packet: %s\n", packet_buffer);
}

void update_sensor_array(int index, int value) {
    int sensor_readings[4] = {10, 20, 30, 40};
    
    // CWE-787: Out-of-bounds Write
    sensor_readings[index] = value;
    printf("Updated index %d with value %d\n", index, sensor_readings[index]);
}

void parse_device_config(char* config_str) {
    // CWE-476: NULL Pointer Dereference (Missing defensive NULL check)
    if (config_str[0] == '{') {
        printf("Valid payload detected\n");
    }
}

int main(void) {
    printf("Starting IoT Firmware Test Fixture...\n");
    process_packet("temp=25C");
    update_sensor_array(2, 99);
    char config[] = "{\"device\": \"ESP32\"}";
    parse_device_config(config);
    return 0;
}
