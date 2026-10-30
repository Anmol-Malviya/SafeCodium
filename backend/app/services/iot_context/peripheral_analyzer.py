"""Safe Vibe AI — Embedded Peripheral & Register Taint Analyzer."""

import re
from typing import Dict, List, Set
from pydantic import BaseModel


class PeripheralSource(BaseModel):
    peripheral_type: str  # UART, SPI, I2C, ADC, WIFI, BLE, GPIO, DMA
    identifier: str
    description: str
    risk_level: str  # UNTRUSTED_EXTERNAL, SENSOR_READING, SYSTEM_INTERNAL


PERIPHERAL_PATTERNS = [
    # UART / Serial
    {
        "type": "UART",
        "pattern": re.compile(r"\b(uart_|uart_read|uart_write|UART_FIFO|UART\d|Serial\.|serial_|rx_buf|rx_stream)\b", re.IGNORECASE),
        "desc": "UART Serial interface (typically connected to external untrusted telemetry / terminal input).",
        "risk": "UNTRUSTED_EXTERNAL",
    },
    # WiFi / Network
    {
        "type": "WIFI",
        "pattern": re.compile(r"\b(esp_wifi|wifi_|lwip_|socket|recv|recvfrom|tcp_|udp_|mqtt_)\b", re.IGNORECASE),
        "desc": "Network stack interface (remote packets originating from network/cloud).",
        "risk": "UNTRUSTED_EXTERNAL",
    },
    # BLE
    {
        "type": "BLE",
        "pattern": re.compile(r"\b(ble_|gatt_|gap_|esp_ble_|bluetooth_)\b", re.IGNORECASE),
        "desc": "Bluetooth Low Energy telemetry packets.",
        "risk": "UNTRUSTED_EXTERNAL",
    },
    # ADC / Sensors
    {
        "type": "ADC",
        "pattern": re.compile(r"\b(adc_|adc1_|analogRead|sensor_|calibration_|reading_buffer|sample_)\b", re.IGNORECASE),
        "desc": "Analog-to-Digital Converter / physical sensor readings.",
        "risk": "SENSOR_READING",
    },
    # SPI / I2C
    {
        "type": "SPI_I2C",
        "pattern": re.compile(r"\b(spi_|i2c_|Wire\.|twi_)\b", re.IGNORECASE),
        "desc": "Inter-chip bus communication (EEPROM, external sensors, RTC).",
        "risk": "SENSOR_READING",
    },
    # FreeRTOS IPC
    {
        "type": "FREERTOS_IPC",
        "pattern": re.compile(r"\b(xQueueReceive|xQueueSend|ulTaskNotifyTake|xSemaphoreTake)\b"),
        "desc": "FreeRTOS inter-task communication queue or notification.",
        "risk": "SYSTEM_INTERNAL",
    },
    # Direct MMIO Register
    {
        "type": "MMIO_REGISTER",
        "pattern": re.compile(r"\b(REG_READ|REG_WRITE|WRITE_PERI_REG|READ_PERI_REG|GPIO\.in|GPIO_IN)\b"),
        "desc": "Direct memory-mapped hardware peripheral register access.",
        "risk": "SYSTEM_INTERNAL",
    },
]


class PeripheralAnalyzer:
    """Analyzes C/C++ firmware code to identify hardware peripheral interactions and taint sources."""

    @classmethod
    def analyze_snippet(cls, code: str) -> List[PeripheralSource]:
        """Detects hardware peripherals accessed in a code snippet or function."""
        sources: List[PeripheralSource] = []
        seen_types: Set[str] = set()

        for entry in PERIPHERAL_PATTERNS:
            match = entry["pattern"].search(code)
            if match:
                ptype = entry["type"]
                if ptype not in seen_types:
                    seen_types.add(ptype)
                    sources.append(
                        PeripheralSource(
                            peripheral_type=ptype,
                            identifier=match.group(0),
                            description=entry["desc"],
                            risk_level=entry["risk"],
                        )
                    )

        return sources
