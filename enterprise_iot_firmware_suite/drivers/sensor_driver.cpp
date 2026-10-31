#include <iostream>
#include <cstring>
#include <cstdlib>
#include "../include/sensors.h"

static SensorNode global_sensor_table[SENSOR_ARRAY_MAX];
static int registered_count = 0;

void init_sensor_subsystem(void) {
    std::cout << "[DRIVER] Initializing sensor hardware bus (I2C/SPI)...\n";
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
