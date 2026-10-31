#include <iostream>
#include <string>
#include "../include/config.h"
#include "../include/sensors.h"
#include "../include/network_stack.h"

int main(int argc, char* argv[]) {
    std::cout << "=========================================================\n";
    std::cout << "  " << FIRMWARE_NAME << " v" << FIRMWARE_VERSION << "\n";
    std::cout << "  Autonomous Embedded Edge Gateway Controller\n";
    std::cout << "=========================================================\n";

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
    parse_mqtt_frame("v1/devices/telemetry", "{\"battery\": 98}", &active_session);

    std::cout << "[GATEWAY] Firmware diagnostics cycle complete. System stable.\n";
    return 0;
}
