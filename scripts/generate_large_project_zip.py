import zipfile
import shutil
from pathlib import Path

target_dir = Path("enterprise_iot_firmware_suite")
if target_dir.exists():
    shutil.rmtree(target_dir, ignore_errors=True)
target_dir.mkdir(parents=True, exist_ok=True)

# Create multi-tier IoT folder structure
(target_dir / "include").mkdir(exist_ok=True)
(target_dir / "src").mkdir(exist_ok=True)
(target_dir / "drivers").mkdir(exist_ok=True)
(target_dir / "network").mkdir(exist_ok=True)
(target_dir / "security").mkdir(exist_ok=True)

# 1. include/config.h
(target_dir / "include" / "config.h").write_text("""#ifndef CONFIG_H
#define CONFIG_H

#define FIRMWARE_NAME "SafeVibe-Industrial-Gateway"
#define FIRMWARE_VERSION "3.2.0-RELEASE"
#define SENSOR_ARRAY_MAX 16
#define PACKET_MAX_LEN 128
#define TELEMETRY_PORT 8883

typedef struct {
    int sensor_id;
    float reading;
    unsigned long timestamp;
    char sensor_label[32];
} SensorNode;

typedef struct {
    char client_id[64];
    char auth_token[128];
    int is_authenticated;
} DeviceSession;

#endif // CONFIG_H
""", encoding="utf-8")

# 2. include/sensors.h
(target_dir / "include" / "sensors.h").write_text("""#ifndef SENSORS_H
#define SENSORS_H

#include "config.h"

void init_sensor_subsystem(void);
int update_sensor_metric(int slot_index, float val, const char* label);
float calculate_average_metrics(void);
void purge_sensor_records(SensorNode* node);

#endif // SENSORS_H
""", encoding="utf-8")

# 3. include/network_stack.h
(target_dir / "include" / "network_stack.h").write_text("""#ifndef NETWORK_STACK_H
#define NETWORK_STACK_H

#include "config.h"

void handle_incoming_telemetry(const char* raw_packet, int packet_len);
int parse_mqtt_frame(const char* topic, const char* payload, DeviceSession* session);
void broadcast_alert(const char* alert_msg);

#endif // NETWORK_STACK_H
""", encoding="utf-8")

# 4. drivers/sensor_driver.cpp (Contains CWE-787: Out-of-bounds Write & CWE-416: Use-After-Free)
(target_dir / "drivers" / "sensor_driver.cpp").write_text("""#include <iostream>
#include <cstring>
#include <cstdlib>
#include "../include/sensors.h"

static SensorNode global_sensor_table[SENSOR_ARRAY_MAX];
static int registered_count = 0;

void init_sensor_subsystem(void) {
    std::cout << "[DRIVER] Initializing sensor hardware bus (I2C/SPI)...\\n";
    for (int i = 0; i < SENSOR_ARRAY_MAX; i++) {
        global_sensor_table[i].sensor_id = i + 100;
        global_sensor_table[i].reading = 0.0f;
        global_sensor_table[i].timestamp = 0;
        std::memset(global_sensor_table[i].sensor_label, 0, 32);
    }
}

// CWE-787: Out-of-bounds Write (Missing upper bound verification on slot_index)
int update_sensor_metric(int slot_index, float val, const char* label) {
    // VULNERABLE: Does not check if slot_index >= SENSOR_ARRAY_MAX
    global_sensor_table[slot_index].reading = val;
    
    if (label != nullptr) {
        // CWE-120: Buffer Copy without Checking Size
        std::strcpy(global_sensor_table[slot_index].sensor_label, label);
    }
    
    return 0;
}

float calculate_average_metrics(void) {
    float sum = 0.0f;
    for (int i = 0; i < SENSOR_ARRAY_MAX; i++) {
        sum += global_sensor_table[i].reading;
    }
    return sum / SENSOR_ARRAY_MAX;
}

// CWE-416: Use-After-Free
void purge_sensor_records(SensorNode* node) {
    if (node != nullptr) {
        std::free(node);
        // VULNERABLE: Pointer is accessed after free
        std::cout << "[AUDIT] Purged node with ID: " << node->sensor_id << std::endl;
    }
}
""", encoding="utf-8")

# 5. network/packet_router.cpp (Contains CWE-120: Buffer Overflow & CWE-476: NULL Pointer Dereference)
(target_dir / "network" / "packet_router.cpp").write_text("""#include <iostream>
#include <cstring>
#include <cstdio>
#include "../include/network_stack.h"

void handle_incoming_telemetry(const char* raw_packet, int packet_len) {
    char local_stream_buffer[48];
    
    std::cout << "[NET] Telemetry packet inbound (" << packet_len << " bytes)\\n";
    
    // CWE-120: Classic Buffer Overflow (Copies unbounded packet into 48-byte buffer)
    std::strcpy(local_stream_buffer, raw_packet);
    std::printf("[NET] Processed packet payload: %s\\n", local_stream_buffer);
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
""", encoding="utf-8")

# 6. security/crypto_engine.cpp
(target_dir / "security" / "crypto_engine.cpp").write_text("""#include <iostream>
#include <string>
#include <vector>

class CryptoEngine {
public:
    static std::string generate_session_hash(const std::string& token) {
        unsigned long hash = 5381;
        for (char c : token) {
            hash = ((hash << 5) + hash) + c;
        }
        return "SEC-" + std::to_string(hash);
    }
    
    static bool verify_signature(const std::string& data, const std::string& expected_sig) {
        return generate_session_hash(data) == expected_sig;
    }
};
""", encoding="utf-8")

# 7. src/main.cpp (Entry point integrating all sub-systems)
(target_dir / "src" / "main.cpp").write_text("""#include <iostream>
#include <string>
#include "../include/config.h"
#include "../include/sensors.h"
#include "../include/network_stack.h"

int main(int argc, char* argv[]) {
    std::cout << "=========================================================\\n";
    std::cout << "  " << FIRMWARE_NAME << " v" << FIRMWARE_VERSION << "\\n";
    std::cout << "  Autonomous Embedded Edge Gateway Controller\\n";
    std::cout << "=========================================================\\n";

    // 1. Initialize Sensor Hardware
    init_sensor_subsystem();

    // 2. Normal sensor telemetry updates
    update_sensor_metric(0, 24.5f, "TEMP_PRIMARY");
    update_sensor_metric(1, 65.2f, "HUMIDITY_ZONE_A");
    update_sensor_metric(2, 1013.25f, "BAROMETRIC_PRESSURE");

    std::cout << "[METRICS] System Average: " << calculate_average_metrics() << std::endl;

    // 3. Network frame handling
    handle_incoming_telemetry("node_id=101&status=ONLINE&rssi=-64dBm", 37);

    // 4. Safe MQTT invocation
    DeviceSession active_session;
    active_session.is_authenticated = 1;
    parse_mqtt_frame("v1/devices/telemetry", "{\\"battery\\": 98}", &active_session);

    std::cout << "[GATEWAY] Firmware diagnostics cycle complete. System stable.\\n";
    return 0;
}
""", encoding="utf-8")

# Package into ZIP archive
zip_path = Path("large_iot_firmware_suite.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
    for file in target_dir.rglob("*"):
        if file.is_file():
            arcname = file.relative_to(target_dir)
            zipf.write(file, arcname=str(arcname))

print("Created comprehensive IoT project ZIP:", zip_path.resolve())
print("File count:", len(list(target_dir.rglob("*.*"))))
for f in zipfile.ZipFile(zip_path).namelist():
    print(f"  - {f}")

