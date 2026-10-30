/**
 * @file sample_smart_meter.c
 * @brief IoT Smart Meter Energy Telemetry Processor (Vulnerable Fixture)
 *
 * Demonstrates:
 * 1. CWE-120: Buffer Copy without Checking Size of Input (strcpy into 32-byte buffer)
 * 2. CWE-476: NULL Pointer Dereference (missing check on sensor payload)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_PAYLOAD_LEN 256
#define DEVICE_ID "METER-XTENSA-082"

typedef struct {
    uint32_t timestamp;
    float active_power_kwh;
    char meter_serial[32];
} EnergyPacket;

/**
 * @brief Parses incoming UART telemetry string into structured packet.
 * @warning Vulnerable to CWE-120: unchecked strcpy into 32-byte buffer.
 */
int parse_telemetry_packet(const char *raw_stream, EnergyPacket *out_packet) {
    if (out_packet == NULL) {
        return -1;
    }

    // VULNERABILITY CWE-120: raw_stream can exceed 32 bytes!
    strcpy(out_packet->meter_serial, raw_stream);

    out_packet->timestamp = 1700000000;
    out_packet->active_power_kwh = 42.15f;
    return 0;
}

/**
 * @brief Processes calibrated sensor readings.
 * @warning Vulnerable to CWE-476: NULL pointer dereference if reading_buffer is NULL.
 */
int process_sensor_calibration(const float *reading_buffer, size_t count) {
    // VULNERABILITY CWE-476: Dereferencing reading_buffer without NULL check
    float initial_calibration = reading_buffer[0];

    printf("[SMART_METER] Base calibration level: %.2f (Total samples: %zu)\n",
           (double)initial_calibration, count);
    return 0;
}

#ifdef TEST_HARNESS
int main(int argc, char **argv) {
    printf("[SMART_METER] Initializing Smart Meter Firmware (ID: %s)...\n", DEVICE_ID);

    EnergyPacket packet;
    memset(&packet, 0, sizeof(EnergyPacket));

    if (argc > 1) {
        printf("[SMART_METER] Ingesting UART input: %s\n", argv[1]);
        parse_telemetry_packet(argv[1], &packet);
        printf("[SMART_METER] Parsed Serial: %s\n", packet.meter_serial);
    } else {
        const char *safe_input = "SERIAL-9921";
        parse_telemetry_packet(safe_input, &packet);
        printf("[SMART_METER] Normal Operation Serial: %s\n", packet.meter_serial);
    }

    float valid_samples[3] = {12.4f, 13.1f, 12.9f};
    process_sensor_calibration(valid_samples, 3);

    return 0;
}
#endif
