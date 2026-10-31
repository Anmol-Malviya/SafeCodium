#ifndef ESP32_TELEMETRY_H
#define ESP32_TELEMETRY_H

#define FIRMWARE_VERSION "1.0.4-TEST"
#define MAX_PAYLOAD_LEN 64

void process_packet(const char* raw_input);
void update_sensor_array(int index, int value);
void parse_device_config(char* config_str);

#endif // ESP32_TELEMETRY_H
