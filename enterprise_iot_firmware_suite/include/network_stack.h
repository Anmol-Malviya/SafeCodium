#ifndef NETWORK_STACK_H
#define NETWORK_STACK_H

#include "config.h"

void handle_incoming_telemetry(const char* raw_packet, int packet_len);
int parse_mqtt_frame(const char* topic, const char* payload, DeviceSession* session);
void broadcast_alert(const char* alert_msg);

#endif // NETWORK_STACK_H
