#include <stdio.h>
#include <string.h>

void process_meter_packet(const char *raw_stream, int *reading_buffer) {
    char meter_serial[16];

    /* Vulnerability 1: Unsafe string copy without bounds check (CWE-120) */
    strcpy(meter_serial, raw_stream);

    /* Vulnerability 2: NULL Pointer Dereference on reading_buffer (CWE-476) */
    int first_val = reading_buffer[0];

    printf("Serial: %s, Val: %d\n", meter_serial, first_val);
}

int main(void) {
    int sample[2] = {10, 20};
    process_meter_packet("MTR-99882233", sample);
    return 0;
}
