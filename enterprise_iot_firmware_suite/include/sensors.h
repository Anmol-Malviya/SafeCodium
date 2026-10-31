#ifndef SENSORS_H
#define SENSORS_H

#include "config.h"

void init_sensor_subsystem(void);
int update_sensor_metric(int slot_index, float val, const char* label);
float calculate_average_metrics(void);
void purge_sensor_records(SensorNode* node);

#endif // SENSORS_H
