#ifndef CONFIG_H
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
