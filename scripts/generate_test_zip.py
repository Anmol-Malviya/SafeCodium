import zipfile
from pathlib import Path

test_dir = Path("test_firmware_sample")
test_dir.mkdir(exist_ok=True)

main_c = """#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// Simulated IoT Telemetry Packet Processor
void process_packet(const char* raw_input) {
    char packet_buffer[32];
    
    // CWE-120: Buffer Copy without Checking Size (Classic Buffer Overflow)
    strcpy(packet_buffer, raw_input);
    printf("Processed packet: %s\\n", packet_buffer);
}

void update_sensor_array(int index, int value) {
    int sensor_readings[4] = {10, 20, 30, 40};
    
    // CWE-787: Out-of-bounds Write
    sensor_readings[index] = value;
    printf("Updated index %d with value %d\\n", index, sensor_readings[index]);
}

void parse_device_config(char* config_str) {
    // CWE-476: NULL Pointer Dereference (Missing defensive NULL check)
    if (config_str[0] == '{') {
        printf("Valid payload detected\\n");
    }
}

int main(void) {
    printf("Starting IoT Firmware Test Fixture...\\n");
    process_packet("temp=25C");
    update_sensor_array(2, 99);
    char config[] = "{\\"device\\": \\"ESP32\\"}";
    parse_device_config(config);
    return 0;
}
"""

header_h = """#ifndef ESP32_TELEMETRY_H
#define ESP32_TELEMETRY_H

#define FIRMWARE_VERSION "1.0.4-TEST"
#define MAX_PAYLOAD_LEN 64

void process_packet(const char* raw_input);
void update_sensor_array(int index, int value);
void parse_device_config(char* config_str);

#endif // ESP32_TELEMETRY_H
"""

(test_dir / "main.c").write_text(main_c, encoding="utf-8")
(test_dir / "esp32_telemetry.h").write_text(header_h, encoding="utf-8")

zip_path = Path("iot_firmware_test.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
    zipf.write(test_dir / "main.c", arcname="main.c")
    zipf.write(test_dir / "esp32_telemetry.h", arcname="esp32_telemetry.h")

print("Created ZIP:", zip_path.resolve())
print("Files:", zipfile.ZipFile(zip_path).namelist())

