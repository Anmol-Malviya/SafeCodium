"""
Generator script for SAFE-CODIUM Test Firmware Zip Package.
Creates 6 realistic IoT firmware C/C++ source files containing classic embedded vulnerabilities:
1. network_telemetry.c (CWE-120: Buffer Overflow / Unbounded strcpy in UART telemetry packet)
2. sensor_hub.c (CWE-476: NULL Pointer Dereference in I2C temperature sensor read)
3. memory_pool.c (CWE-416: Use After Free in FreeRTOS queue message handler)
4. actuator_controller.c (CWE-787: Out-of-bounds Write in motor PWM lookup table)
5. crypto_auth.c (CWE-120: Stack Overflow in BLE device handshake token parser)
6. firmware_main.c (Entrypoint: Hardware initialization & task dispatcher)
"""

import os
import zipfile

OUTPUT_DIR = "data/test_samples"
ZIP_PATH = os.path.join(OUTPUT_DIR, "safecodium_iot_firmware_test.zip")

FILES = {
    "src/network_telemetry.c": """#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// Simulated UART packet parser with classic buffer overflow (CWE-120)
void parse_telemetry_packet(const char *raw_uart_stream) {
    char packet_buffer[64];
    
    // VULNERABILITY: Unbounded strcpy from external hardware UART stream
    // SAFE-CODIUM should replace this with snprintf / strncpy bounds check
    strcpy(packet_buffer, raw_uart_stream);
    
    printf("[UART] Processed telemetry packet: %s\\n", packet_buffer);
}

int main_telemetry_test(void) {
    const char *payload = "DEVICE_ID=ESP32_DEV_991823;TEMP=32.4;STATUS=ACTIVE;ALERT=BATTERY_LOW_VOLTAGE_CRITICAL";
    parse_telemetry_packet(payload);
    return 0;
}
""",

    "src/sensor_hub.c": """#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int sensor_id;
    float last_reading;
    int is_calibrated;
} I2cSensor;

// Simulated I2C Sensor reader with NULL Pointer Dereference (CWE-476)
int read_i2c_sensor(I2cSensor *sensor, float *out_value) {
    // VULNERABILITY: Dereferencing sensor pointer without NULL verification guard
    // SAFE-CODIUM should inject NULL guard: if (!sensor || !out_value) return -1;
    if (sensor->is_calibrated) {
        *out_value = sensor->last_reading * 1.05f;
        return 0;
    }
    
    *out_value = sensor->last_reading;
    return 1;
}

void test_sensor_dispatch(void) {
    I2cSensor *sensor = NULL;
    float reading = 0.0f;
    read_i2c_sensor(sensor, &reading);
}
""",

    "src/memory_pool.c": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char *payload;
    int length;
} MqttMessage;

// Simulated MQTT message handler with Use-After-Free (CWE-416)
void process_and_archive_message(MqttMessage *msg) {
    if (!msg || !msg->payload) return;

    printf("[MQTT] Processing payload: %s\\n", msg->payload);
    
    // Free the allocated payload buffer
    free(msg->payload);

    // VULNERABILITY: msg->payload is accessed after free and not set to NULL
    // SAFE-CODIUM should set msg->payload = NULL or avoid post-free dereference
    printf("[MQTT] Logged archive len: %lu, first byte: %c\\n", strlen(msg->payload), msg->payload[0]);
}

void test_memory_pool_lifecycle(void) {
    MqttMessage msg;
    msg.payload = (char *)malloc(32);
    strcpy(msg.payload, "PING_KEEPALIVE");
    msg.length = 14;
    process_and_archive_message(&msg);
}
""",

    "src/actuator_controller.c": """#include <stdio.h>

#define MAX_PRESETS 8
static int pwm_preset_table[MAX_PRESETS] = { 10, 25, 50, 75, 100, 125, 150, 200 };

// Simulated Actuator control with Out-of-bounds Write (CWE-787)
int update_motor_pwm_profile(int profile_index, int new_pwm_val) {
    // VULNERABILITY: Missing upper-bound check on array index (CWE-787)
    // SAFE-CODIUM should enforce: if (profile_index < 0 || profile_index >= MAX_PRESETS) return -1;
    pwm_preset_table[profile_index] = new_pwm_val;
    
    return pwm_preset_table[profile_index];
}

void test_actuator_bounds(void) {
    update_motor_pwm_profile(12, 255); // Overwrite adjacent memory
}
""",

    "src/crypto_auth.c": """#include <stdio.h>
#include <string.h>

// Simulated BLE handshake token parser with Buffer Overflow (CWE-120)
int verify_ble_peer_token(const char *inbound_token) {
    char local_token[32];

    // VULNERABILITY: sprintf unbounded copy into 32-byte stack buffer
    // SAFE-CODIUM should replace with snprintf(local_token, sizeof(local_token), ...)
    sprintf(local_token, "%s", inbound_token);

    if (strcmp(local_token, "SECURE_BLE_AES_2026") == 0) {
        return 1;
    }
    return 0;
}
""",

    "src/firmware_main.c": """#include <stdio.h>

// Embedded Firmware Main Dispatcher
int main(void) {
    printf("===========================================\\n");
    printf("  SAFE-CODIUM TEST FIRMWARE v1.0.4          \\n");
    printf("  Target: ESP32-WROOM-32 / FreeRTOS         \\n");
    printf("===========================================\\n");
    printf("[+] Initializing hardware peripherals...\\n");
    printf("[+] UART0, I2C0, SPI1 online.\\n");
    return 0;
}
""",

    "include/firmware_config.h": """#ifndef FIRMWARE_CONFIG_H
#define FIRMWARE_CONFIG_H

#define FIRMWARE_NAME "SAFE-CODIUM IoT Test Node"
#define FIRMWARE_VERSION "1.0.4"
#define UART_BAUDRATE 115200
#define I2C_FREQ_HZ 400000

#endif // FIRMWARE_CONFIG_H
"""
}

def generate_zip():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for arcname, content in FILES.items():
            zipf.writestr(arcname, content)
    
    print(f"SUCCESS: Created test zip archive with {len(FILES)} files at:")
    print(os.path.abspath(ZIP_PATH))

if __name__ == "__main__":
    generate_zip()

